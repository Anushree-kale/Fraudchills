from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db
from services.access import complaints_scope_query

router = APIRouter()


def _map_event(event: models.ComplaintEvent, case_number: Optional[str]) -> schemas.ActivityItemOut:
    et = (event.event_type or "").upper()
    cid = case_number

    if et == "FILED":
        kind = "CASE_FILED"
        msg = f"Case {cid or '?'} filed in the portal."
    elif et in ("RESOLVED", "CLOSED"):
        kind = "CASE_RESOLVED"
        msg = f"Case {cid or '?'} marked resolved."
    elif et in ("ESCALATED", "SYSTEM_ESCALATED"):
        kind = "CASE_FLAGGED"
        msg = event.note or f"Case {cid or '?'} escalated for review."
    elif et in ("BRAND_RESPONDED",):
        kind = "BRAND_ACTION"
        msg = event.note or f"Brand responded on case {cid or '?'}"
    elif et.startswith("ADMIN") or et in ("STATUS_CHANGED", "MODERATED"):
        kind = "ADMIN_ACTION"
        msg = event.note or f"Admin action: {et}"
    else:
        kind = "CASE_FLAGGED" if "FLAG" in et or "ML" in et else "ADMIN_ACTION"
        msg = event.note or f"{et.replace('_', ' ').title()} — case {cid or '?'}"

    return schemas.ActivityItemOut(
        id=str(event.id),
        kind=kind,
        message=msg[:500],
        case_id=cid,
        created_at=event.created_at,
    )


@router.get("/recent", response_model=List[schemas.ActivityItemOut])
def recent_activity(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    scope_sq = complaints_scope_query(db, current_user).with_entities(models.Complaint.id).subquery()

    rows = (
        db.query(models.ComplaintEvent, models.Complaint.case_number)
        .join(models.Complaint, models.Complaint.id == models.ComplaintEvent.complaint_id)
        .join(scope_sq, scope_sq.c.id == models.Complaint.id)
        .order_by(models.ComplaintEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    out: List[schemas.ActivityItemOut] = []
    for event, case_number in rows:
        out.append(_map_event(event, case_number))
    return out
