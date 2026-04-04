from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import models
import schemas
from database import get_db
from auth import get_current_user
from ml.scorer import risk_label

router = APIRouter()


def _build_brand_profile(brand_name: str, db: Session) -> schemas.BrandProfile:
    # Check if brand exists in brands table (claimed or unclaimed but indexed)
    brand = db.query(models.Brand).filter(models.Brand.name.ilike(brand_name)).first()
    
    complaints = (
        db.query(models.Complaint)
        .filter(models.Complaint.brand_name.ilike(brand_name))
        .all()
    )

    if not complaints and not brand:
        raise HTTPException(status_code=404, detail=f"No complaints found for brand '{brand_name}'.")

    total = len(complaints)
    resolved = sum(1 for c in complaints if c.status == "RESOLVED")
    avg_score = sum(c.score for c in complaints) / total if total else 0.0

    # Count by fraud type
    type_breakdown: dict[str, int] = {}
    for c in complaints:
        type_breakdown[c.type] = type_breakdown.get(c.type, 0) + 1

    return schemas.BrandProfile(
        brand_name=brand.name if brand else brand_name,
        total_complaints=total,
        resolved_complaints=resolved,
        resolution_rate=round((resolved / total) * 100, 1) if total else 0.0,
        avg_risk_score=round(avg_score, 2),
        risk_label=risk_label(avg_score),
        fraud_type_breakdown=type_breakdown,
        recent_complaints=complaints[:5],
        # New fields for premium UI
        is_verified=brand.is_verified if brand else False,
        resolution_score=brand.resolution_score if brand else 0.0,
        unverified_warning=not (brand and brand.is_verified)
    )


# ── GET /brands ────────────────────────────────────────────────────────────────
@router.get("", response_model=List[schemas.BrandSummary])
def list_brands(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns all brands that have at least one complaint, ordered by complaint count.
    """
    rows = (
        db.query(
            models.Complaint.brand_name,
            func.count(models.Complaint.id).label("total_complaints"),
            func.avg(models.Complaint.score).label("avg_risk_score"),
        )
        .group_by(models.Complaint.brand_name)
        .order_by(func.count(models.Complaint.id).desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        schemas.BrandSummary(
            brand_name=row.brand_name,
            total_complaints=row.total_complaints,
            avg_risk_score=round(row.avg_risk_score or 0.0, 2),
            risk_label=risk_label(row.avg_risk_score or 0.0),
        )
        for row in rows
    ]


# ── GET /brands/{slug} ─────────────────────────────────────────────────────────
@router.get("/{brand_name}", response_model=schemas.BrandProfile)
def get_brand(brand_name: str, db: Session = Depends(get_db)):
    """
    Full brand profile: complaint stats, risk score, fraud type breakdown,
    and the 5 most recent complaints.
    """
    return _build_brand_profile(brand_name, db)

# ── POST /brands/claim ────────────────────────────────────────────────────────
@router.post("/claim", status_code=202)
def claim_brand(
    payload: schemas.BrandCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Brands can request to claim their profile.
    Requires GST and verification documents.
    """
    # Check if brand already exists
    brand = db.query(models.Brand).filter(models.Brand.name.ilike(payload.name)).first()
    
    if brand and brand.claimed_by:
        raise HTTPException(status_code=400, detail="This brand is already claimed.")
    
    if not brand:
        # Create a new unclaimed brand record to represent this claim request
        brand = models.Brand(
            name=payload.name,
            website=payload.website,
            gst_number=payload.gst_number,
            verification_doc_url=payload.verification_doc_url,
            is_verified=False,
            claimed_by=current_user.id
        )
        db.add(brand)
    else:
        # Update existing record with claim info
        brand.claimed_by = current_user.id
        brand.gst_number = payload.gst_number
        brand.verification_doc_url = payload.verification_doc_url
    
    db.commit()
    return {"message": "Brand claim request submitted. Admin will review your documents."}