from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db
from services.access import complaints_scope_query
from services.case_status import REVIEW_SET, RESOLVED_SET, ui_status

router = APIRouter()


def _apply_status_filter(q, status: Optional[str]):
    if not status:
        return q
    su = status.upper()
    all_resolved = list(RESOLVED_SET)
    all_review = list(REVIEW_SET)
    if su == "RESOLVED":
        return q.filter(models.Complaint.status.in_(all_resolved))
    if su == "REVIEW":
        return q.filter(models.Complaint.status.in_(all_review))
    if su == "OPEN":
        combined = all_resolved + all_review
        return q.filter(~models.Complaint.status.in_(combined))
    return q


def _title(c: models.Complaint) -> str:
    t = (c.type or "CASE").replace("_", " ").title()
    plat = c.platform or "Unknown platform"
    return f"{t} — {plat}"


@router.get("/active", response_model=schemas.ActiveCasesPage)
def list_active_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="OPEN, REVIEW, or RESOLVED"),
    q: Optional[str] = Query(None, description="Search case number, brand, details"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    base = complaints_scope_query(db, current_user)
    base = _apply_status_filter(base, status)

    if q and q.strip():
        term = f"%{q.strip()}%"
        base = base.filter(
            or_(
                models.Complaint.case_number.ilike(term),
                models.Complaint.brand_name.ilike(term),
                models.Complaint.details.ilike(term),
            )
        )

    total = int(base.count())
    rows = (
        base.order_by(models.Complaint.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        schemas.ActiveCaseOut(
            case_id=c.case_number,
            complaint_id=c.id,
            title=_title(c),
            amount=float(c.amount or 0),
            status=ui_status(c.status),
        )
        for c in rows
    ]

    return schemas.ActiveCasesPage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )
