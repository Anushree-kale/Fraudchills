from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
import models
import schemas
from database import get_db
from auth import get_admin_user
from utils.notifications import create_notification

router = APIRouter()

VALID_STATUSES = {"PENDING", "INVESTIGATING", "RESOLVED", "REJECTED"}


# ── GET /admin/complaints ──────────────────────────────────────────────────────
@router.get("/complaints", response_model=List[schemas.Complaint])
def moderation_queue(
    status: Optional[str] = "PENDING",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    """
    Admin moderation queue. Defaults to PENDING complaints.
    Pass ?status=ALL to see everything.
    """
    query = db.query(models.Complaint)
    if status and status.upper() != "ALL":
        query = query.filter(models.Complaint.status == status.upper())

    return query.order_by(models.Complaint.created_at.asc()).offset(skip).limit(limit).all()


# ── PATCH /admin/complaints/{id}/status ───────────────────────────────────────
@router.patch("/complaints/{complaint_id}/status", response_model=schemas.Complaint)
def update_complaint_status(
    complaint_id: UUID,
    payload: schemas.StatusUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    """
    Approve (INVESTIGATING), Resolve, or Reject a complaint.
    Valid statuses: PENDING | INVESTIGATING | RESOLVED | REJECTED
    """
    new_status = payload.status.upper()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Must be one of: {VALID_STATUSES}",
        )

    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    old_status = complaint.status
    complaint.status = new_status
    
    # Update User Credibility
    user = db.query(models.User).filter(models.User.id == complaint.user_id).first()
    if user:
        cred = float(user.credibility_score) if user.credibility_score is not None else 50.0
        if new_status == "RESOLVED":
            user.credibility_score = min(100.0, cred + 5.0)
        elif new_status == "REJECTED":
            user.credibility_score = max(0.0, cred - 10.0)

    # Log the status change event
    event = models.ComplaintEvent(
        complaint_id=complaint_id,
        event_type=new_status,
        note=f"Status changed from {old_status} to {new_status} by admin.",
    )
    db.add(event)
    
    # Notify user of status change
    create_notification(
        db, 
        complaint.user_id, 
        "STATUS_UPDATE", 
        f"Your complaint against {complaint.brand_name} status updated to {new_status}."
    )

    db.commit()
    db.refresh(complaint)
    return complaint


# ── GET /admin/stats ───────────────────────────────────────────────────────────
@router.get("/stats", response_model=schemas.AdminStats)
def admin_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    """Quick dashboard numbers for the admin panel."""
    total = db.query(func.count(models.Complaint.id)).scalar()
    by_status = (
        db.query(models.Complaint.status, func.count(models.Complaint.id))
        .group_by(models.Complaint.status)
        .all()
    )
    by_type = (
        db.query(models.Complaint.type, func.count(models.Complaint.id))
        .group_by(models.Complaint.type)
        .all()
    )
    avg_score = db.query(func.avg(models.Complaint.score)).scalar() or 0.0
    total_users = db.query(func.count(models.User.id)).scalar()

    return schemas.AdminStats(
        total_complaints=total,
        total_users=total_users,
        avg_risk_score=round(avg_score, 2),
        by_status={row[0]: row[1] for row in by_status},
        by_type={row[0]: row[1] for row in by_type},
    )


# ── DELETE /admin/complaints/{id} ─────────────────────────────────────────────
@router.delete("/complaints/{complaint_id}", status_code=204)
def delete_complaint(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    """Permanently delete a complaint. Use with caution."""
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    # Delete linked response first (FK constraint)
    db.query(models.Response).filter(models.Response.complaint_id == complaint_id).delete()
    db.delete(complaint)
    db.commit()