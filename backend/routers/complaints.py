from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import models
import schemas
from database import get_db
from auth import get_current_user
from cache_ttl import invalidate_user_dashboard
from ml.scorer import score_complaint, risk_label
from utils.spam import check_duplicate_complaint, verify_image_evidence
from utils.notifications import create_notification
import random

router = APIRouter()


# ── GET /complaints ────────────────────────────────────────────────────────────
@router.get("/", response_model=List[schemas.Complaint])
def get_complaints(
    q: Optional[str] = None,          # Full-text search query
    brand: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    risk: Optional[str] = None,       # LOW | MEDIUM | HIGH
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Public feed. Supports full-text search and filtering."""
    query = db.query(models.Complaint)

    if q:
        # PostgreSQL Full-Text Search
        query = query.filter(
            func.to_tsvector('english', models.Complaint.details).op('@@')(func.to_tsquery('english', q.replace(" ", " & "))) |
            models.Complaint.brand_name.ilike(f"%{q}%")
        )
    
    if brand:
        query = query.filter(models.Complaint.brand_name.ilike(f"%{brand}%"))
    if type:
        query = query.filter(models.Complaint.type == type.upper())
    if status:
        query = query.filter(models.Complaint.status == status.upper())
    if risk == "HIGH":
        query = query.filter(models.Complaint.score >= 70)
    elif risk == "MEDIUM":
        query = query.filter(models.Complaint.score >= 40, models.Complaint.score < 70)
    elif risk == "LOW":
        query = query.filter(models.Complaint.score < 40)

    return query.order_by(models.Complaint.created_at.desc()).offset(skip).limit(limit).all()


# ── GET /complaints/trending ──────────────────────────────────────────────────
@router.get("/trending", response_model=List[schemas.Complaint])
def get_trending_complaints(db: Session = Depends(get_db)):
    """Trending complaints based on upvotes in the last 7 days."""
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    trending = (
        db.query(models.Complaint)
        .filter(models.Complaint.created_at >= seven_days_ago)
        .order_by(models.Complaint.upvotes_count.desc(), models.Complaint.created_at.desc())
        .limit(10)
        .all()
    )

    if not trending:
        return (
            db.query(models.Complaint)
            .order_by(models.Complaint.created_at.desc())
            .limit(10)
            .all()
        )
    return trending


# ── GET /complaints/{id} ───────────────────────────────────────────────────────
@router.get("/{complaint_id}", response_model=schemas.Complaint)
def get_complaint(complaint_id: UUID, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return complaint


@router.get("/{complaint_id}/timeline", response_model=List[schemas.ComplaintEvent])
def get_complaint_timeline(complaint_id: UUID, db: Session = Depends(get_db)):
    """Timeline of complaint events (filed, responded, escalated, resolved)."""
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    events = (
        db.query(models.ComplaintEvent)
        .filter(models.ComplaintEvent.complaint_id == complaint_id)
        .order_by(models.ComplaintEvent.created_at.asc())
        .all()
    )
    return events


@router.get("/{complaint_id}/sla", response_model=schemas.ComplaintSLA)
def get_complaint_sla(complaint_id: UUID, db: Session = Depends(get_db)):
    """Simple SLA tracker payload for complaint trust UX."""
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    now = datetime.now()
    total_hours_open = round((now - complaint.created_at).total_seconds() / 3600, 2)
    hours_remaining = None
    breached = False
    progress_pct = 100.0

    if complaint.deadline:
        hours_remaining = round((complaint.deadline - now).total_seconds() / 3600, 2)
        breached = hours_remaining < 0
        total_window_hours = max((complaint.deadline - complaint.created_at).total_seconds() / 3600, 1)
        elapsed = max((now - complaint.created_at).total_seconds() / 3600, 0)
        progress_pct = max(0.0, min(100.0, round((elapsed / total_window_hours) * 100, 2)))

    return schemas.ComplaintSLA(
        complaint_id=complaint.id,
        created_at=complaint.created_at,
        deadline=complaint.deadline,
        now=now,
        total_hours_open=total_hours_open,
        hours_remaining=hours_remaining,
        breached=breached,
        progress_pct=progress_pct,
    )

def generate_case_number(db: Session) -> str:
    """Generate a unique case number like FC-1234."""
    last_complaint = db.query(models.Complaint).order_by(models.Complaint.created_at.desc()).first()
    if not last_complaint:
        return "FC-1001"
    
    try:
        if not last_complaint.case_number:
            return f"FC-{random.randint(1000, 9999)}"
        last_num = int(last_complaint.case_number.split("-")[1])
        return f"FC-{last_num + 1}"
    except (IndexError, ValueError):
        return f"FC-{random.randint(1001, 9999)}"

def calculate_risk_score(db: Session, payload: schemas.ComplaintCreate, current_user: models.User) -> float:
    """Calculate a rule-based risk score for a complaint."""
    # Base score from ML helper
    score = score_complaint(payload)
    
    # Rule 1: Type Weight (Unauthorized Charge = High Risk)
    if payload.type.upper() == "UNAUTHORIZED_CHARGE":
        score = max(score, 85.0)
    
    # Rule 2: High Amount Threshold (> ₹5000 / $60)
    if payload.amount > 5000:
        score = min(100.0, score + 20.0)
    
    # Rule 3: Platform Recurrence
    platform_count = db.query(func.count(models.Complaint.id)).filter(
        models.Complaint.platform == payload.platform
    ).scalar()
    if platform_count > 5:
        score = min(100.0, score + 15.0)

    # Rule 4: Known Fraudulent Brand Instant Flag
    fraud_match = db.query(models.KnownFraudulentBrand).filter(
        models.KnownFraudulentBrand.name.ilike(payload.brand_name)
    ).first()
    if fraud_match:
        score = max(score, 95.0)
    
    # User credibility score boost
    user_cred_modifier = (current_user.credibility_score - 50) / 10
    score -= user_cred_modifier

    return round(max(0.0, min(score, 100.0)), 2)

# ── POST /complaints ───────────────────────────────────────────────────────────
@router.post("/", response_model=schemas.Complaint, status_code=201)
def create_complaint(
    payload: schemas.ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Submit a new complaint. Automatically ML-scored on creation."""
    
    import time
    start_t = time.time()
    
    # ── Spam Prevention ────────────────────────────────────────────────────────
    # 1. Rate limiting: 10 per 24h
    last_24h = datetime.now() - timedelta(days=1)
    daily_count = db.query(func.count(models.Complaint.id)).filter(
        models.Complaint.user_id == current_user.id,
        models.Complaint.created_at >= last_24h
    ).scalar()
    
    if daily_count >= 10:
        raise HTTPException(status_code=429, detail="Daily limit reached (10 complaints per 24h).")
        
    # 2. Duplicate detection (Similarity > 0.85)
    is_duplicate = check_duplicate_complaint(db, current_user.id, payload.brand_name, payload.details)
    if is_duplicate:
        raise HTTPException(status_code=400, detail="Duplicate complaint detected (similar details filed recently).")

    # ── Rule-Based Risk Scoring ───────────────────────────────────────────────
    score = calculate_risk_score(db, payload, current_user)

    # Generate Case Number
    case_num = generate_case_number(db)

    # Set deadline for brand response (7 days)
    deadline = datetime.now() + timedelta(days=7)

    complaint = models.Complaint(
        case_number=case_num,
        type=payload.type.upper(),
        details=payload.details,
        platform=payload.platform,
        order_id=payload.order_id,
        amount=payload.amount,
        brand_name=payload.brand_name,
        proof_urls=payload.proof_urls or [],
        external_links=payload.external_links or [],
        image_url=payload.image_url,
        user_id=current_user.id,
        score=score,
        status="PENDING",
        deadline=deadline,
    )

    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    print(f"DEBUG: DB Insert took {time.time() - start_t:.4f}s total")

    # Log the filing event
    event = models.ComplaintEvent(
        complaint_id=complaint.id,
        event_type="FILED",
        note="Complaint filed by user.",
    )
    db.add(event)
    db.commit()

    invalidate_user_dashboard(str(current_user.id))

    return complaint


# ── POST /complaints/{id}/respond ─────────────────────────────────────────────
@router.post("/{complaint_id}/respond", response_model=schemas.Response, status_code=201)
def respond_to_complaint(
    complaint_id: UUID,
    payload: schemas.ResponseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Brand or admin responds to a complaint publicly.
    Only one response allowed per complaint (unique constraint in DB).
    """
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    existing = db.query(models.Response).filter(models.Response.complaint_id == complaint_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="This complaint already has a response.")

    response = models.Response(
        content=payload.content,
        complaint_id=complaint_id,
        user_id=current_user.id,
    )
    db.add(response)

    # Auto-update complaint status to RESPONDED
    complaint.status = "RESPONDED"
    # Update deadline for final resolution (another 7 days)
    complaint.deadline = datetime.now() + timedelta(days=7)

    # Log the response event
    event = models.ComplaintEvent(
        complaint_id=complaint_id,
        event_type="BRAND_RESPONDED",
        note=f"Brand responded: {payload.content[:50]}...",
    )
    db.add(event)
    db.commit()

    # Notify user of response
    create_notification(
        db, 
        complaint.user_id, 
        "RESPONSE", 
        f"A brand has responded to your complaint against {complaint.brand_name}."
    )

    db.refresh(response)
    return response


# ── GET /complaints/{id}/respond ──────────────────────────────────────────────
@router.get("/{complaint_id}/respond", response_model=schemas.Response)
def get_response(complaint_id: UUID, db: Session = Depends(get_db)):
    response = db.query(models.Response).filter(models.Response.complaint_id == complaint_id).first()
    if not response:
        raise HTTPException(status_code=404, detail="No response for this complaint yet.")
    return response

# ── POST /complaints/{id}/upvote ──────────────────────────────────────────────
@router.post("/{complaint_id}/upvote", status_code=200)
def upvote_complaint(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upvote a complaint. One vote per user."""
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    existing_vote = db.query(models.ComplaintVote).filter(
        models.ComplaintVote.user_id == current_user.id,
        models.ComplaintVote.complaint_id == complaint_id
    ).first()

    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already upvoted this complaint.")

    vote = models.ComplaintVote(user_id=current_user.id, complaint_id=complaint_id)
    db.add(vote)
    
    # Increment counter for fast sorting
    complaint.upvotes_count += 1
    db.commit()
    
    return {"message": "Upvoted successfully", "upvotes": complaint.upvotes_count}