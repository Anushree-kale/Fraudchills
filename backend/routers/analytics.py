from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from datetime import datetime, timedelta
import models
import schemas
from database import get_db
from auth import get_current_user
from ml.scorer import get_ml_health
from services.access import complaints_scope_query
from services.fraud_categories import merge_counts, percentages_from_counts

router = APIRouter()

@router.get("/health", tags=["ML"])
def ml_health():
    """Get ML model and dataset health status."""
    return get_ml_health()


@router.get("/fraud-categories", response_model=List[schemas.FraudCategoryOut])
def fraud_categories_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Fraud-type mix for the current user's scope (customer: own cases; brand: brand cases; admin: all).
    Percentages sum to ~100% across the four canonical categories for that scope.
    """
    q = complaints_scope_query(db, current_user)
    rows = q.with_entities(models.Complaint.type, func.count(models.Complaint.id)).group_by(models.Complaint.type).all()
    counts = merge_counts(rows)
    return percentages_from_counts(counts)

@router.get("/summary", response_model=schemas.AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get high-level analytics summary."""
    total_complaints = db.query(func.count(models.Complaint.id)).scalar() or 0
    resolved_count = db.query(func.count(models.Complaint.id)).filter(models.Complaint.status == "RESOLVED").scalar() or 0
    resolution_rate = (resolved_count / total_complaints * 100) if total_complaints > 0 else 0.0
    avg_risk_score = db.query(func.avg(models.Complaint.score)).scalar() or 0.0
    high_risk_count = db.query(func.count(models.Complaint.id)).filter(models.Complaint.score >= 70).scalar() or 0

    # Type breakdown - cast keys to str to satisfy Pydantic dict[str, int]
    types = db.query(models.Complaint.type, func.count(models.Complaint.id)).group_by(models.Complaint.type).all()
    complaints_by_type = {str(t[0] or "UNKNOWN"): int(t[1] or 0) for t in types}

    # Status breakdown - cast keys to str
    statuses = db.query(models.Complaint.status, func.count(models.Complaint.id)).group_by(models.Complaint.status).all()
    complaints_by_status = {str(s[0] or "UNKNOWN"): int(s[1] or 0) for s in statuses}

    return schemas.AnalyticsSummary(
        total_complaints=total_complaints,
        resolved_count=resolved_count,
        resolution_rate=round(resolution_rate, 2),
        avg_risk_score=round(float(avg_risk_score or 0.0), 2),
        high_risk_count=high_risk_count,
        complaints_by_type=complaints_by_type,
        complaints_by_status=complaints_by_status
    )

@router.get("/trends", response_model=List[schemas.TrendData])
def get_analytics_trends(
    period: str = "month",
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get time-based trend data using PostgreSQL date_trunc."""
    if period not in ["week", "month"]:
        period = "month"

    trends = (
        db.query(
            func.date_trunc(period, models.Complaint.created_at).label('p_label'),
            func.count(models.Complaint.id).label('count'),
            func.avg(models.Complaint.score).label('avg_score')
        )
        .group_by('p_label')
        .order_by('p_label')
        .limit(limit)
        .all()
    )

    return [
        schemas.TrendData(
            period_label=str(t.p_label.date()) if t.p_label else "N/A",
            count=t.count,
            avg_score=round(t.avg_score or 0.0, 2)
        ) for t in trends
    ]

@router.get("/top-brands", response_model=List[schemas.TopBrand])
def get_top_brands(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get top 10 brands by complaint count."""
    top_brands = (
        db.query(
            models.Complaint.brand_name,
            func.count(models.Complaint.id).label('count'),
            func.avg(models.Complaint.score).label('avg_score'),
            func.sum(case((models.Complaint.status == "RESOLVED", 1), else_=0)).label('resolved_count'),
        )
        .group_by(models.Complaint.brand_name)
        .order_by(func.count(models.Complaint.id).desc())
        .limit(10)
        .all()
    )

    return [
        schemas.TopBrand(
            brand_name=t.brand_name,
            count=t.count,
            avg_score=round(t.avg_score or 0.0, 2),
            resolved_count=int(t.resolved_count or 0)
        ) for t in top_brands
    ]
