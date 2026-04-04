from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from cache_ttl import cache_key_dashboard_summary, get_json, set_json
from database import get_db
from services.metrics import compute_dashboard_summary

router = APIRouter()


@router.get("/summary", response_model=schemas.DashboardSummaryOut)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    role = (current_user.role or "CUSTOMER").upper()
    ck = cache_key_dashboard_summary(str(current_user.id), role)
    cached = get_json(ck)
    if cached is not None:
        return cached

    data = compute_dashboard_summary(db, current_user)
    set_json(ck, data)
    return data
