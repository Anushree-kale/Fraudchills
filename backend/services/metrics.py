"""Aggregated dashboard metrics for a scoped complaint query."""

from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from services.access import complaints_scope_query
from services.case_status import RESOLVED_SET


def compute_dashboard_summary(db: Session, user: models.User) -> dict:
    q = complaints_scope_query(db, user)
    resolved_list = list(RESOLVED_SET)

    active_q = q.filter(~models.Complaint.status.in_(resolved_list))
    active_cases = active_q.count()
    resolved_cases = q.filter(models.Complaint.status.in_(resolved_list)).count()

    amount_at_risk = (
        q.filter(~models.Complaint.status.in_(resolved_list))
        .with_entities(func.coalesce(func.sum(models.Complaint.amount), 0))
        .scalar()
    )
    amount_at_risk = float(amount_at_risk or 0)

    avg_score = (
        q.filter(~models.Complaint.status.in_(resolved_list))
        .with_entities(func.avg(models.Complaint.score))
        .scalar()
    )
    risk_score = int(round(float(avg_score or 0)))

    return {
        "active_cases": active_cases,
        "resolved_cases": resolved_cases,
        "amount_at_risk": round(amount_at_risk, 2),
        "risk_score": min(100, max(0, risk_score)),
    }


def user_stats_compact(db: Session, user: models.User) -> dict:
    s = compute_dashboard_summary(db, user)
    return {
        "active_cases": s["active_cases"],
        "resolved_cases": s["resolved_cases"],
    }
