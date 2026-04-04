from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from passlib.context import CryptContext
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=schemas.User)
def update_profile(
    body: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name
    if body.image is not None:
        current_user.image = body.image
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/password")
def set_password(
    body: schemas.PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required.")
        if not pwd_context.verify(body.current_password, current_user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.password = pwd_context.hash(body.new_password)
    db.commit()
    return {"success": True}


@router.get("/me/dashboard")
def get_user_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    complaints = db.query(models.Complaint).filter(models.Complaint.user_id == current_user.id).all()

    resolved_count = sum(1 for c in complaints if c.status == "RESOLVED")
    badges = []
    if resolved_count >= 10:
        badges.append("Top Reporter")
    if current_user.credibility_score > 80:
        badges.append("Trusted User")

    return {
        "user": schemas.User.model_validate(current_user),
        "complaints": complaints,
        "badges": badges,
        "stats": {
            "total_filed": len(complaints),
            "resolved": resolved_count,
            "credibility_score": current_user.credibility_score,
        },
    }


@router.get("/me/notifications", response_model=List[schemas.Notification])
def get_notifications(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.is_read.asc(), models.Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/me/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id,
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    return {"success": True}
