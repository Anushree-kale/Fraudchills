from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter()


def _check_event_access(event: models.Event, current_user: models.User, action: str = "view") -> None:
    role = (current_user.role or "").upper()
    if role in ("ADMIN", "MODERATOR"):
        return
    # Customer can only access their own events
    if event.user_id is None or str(event.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to {action} this event.",
        )


@router.get("", response_model=List[schemas.EventOut])
def list_events(
    unlabeled_only: bool = Query(False, description="Filter for events without a label"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    List events.
    - ADMIN/MODERATOR: can view all events.
    - CUSTOMER: can view only their own events.
    """
    query = db.query(models.Event)
    role = (current_user.role or "").upper()
    if role not in ("ADMIN", "MODERATOR"):
        query = query.filter(models.Event.user_id == current_user.id)

    if unlabeled_only:
        query = query.filter(models.Event.label.is_(None))

    events = query.order_by(desc(models.Event.created_at)).offset(skip).limit(limit).all()
    return events


@router.get("/{event_id}", response_model=schemas.EventOut)
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get a single event by ID.
    - CUSTOMER: only their own event.
    - ADMIN/MODERATOR: any event.
    """
    try:
        ev_uuid = UUID(str(event_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    event = db.query(models.Event).filter(models.Event.id == ev_uuid).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    _check_event_access(event, current_user, action="view")
    return event


@router.patch("/{event_id}/label", response_model=schemas.EventOut)
@router.put("/{event_id}/label", response_model=schemas.EventOut)
def update_event_label(
    event_id: str,
    payload: schemas.EventLabelUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Update the fraud label on an event.
    - 0 = Legitimate
    - 1 = Fraud
    - CUSTOMER: can label their own events.
    - ADMIN/MODERATOR: can label any event.
    """
    # 1. Validate label value
    if payload.label not in (0, 1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid label. Must be 0 (Legitimate) or 1 (Fraud).",
        )

    # 2. Parse UUID
    try:
        ev_uuid = UUID(str(event_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # 3. Lookup event
    event = db.query(models.Event).filter(models.Event.id == ev_uuid).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # 4. Check authorization
    _check_event_access(event, current_user, action="label")

    # 5. Update label and persist
    event.label = payload.label
    db.commit()
    db.refresh(event)

    return event
