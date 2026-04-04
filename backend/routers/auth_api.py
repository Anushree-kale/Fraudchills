from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import create_access_token, verify_password
from database import get_db
from services.metrics import user_stats_compact

router = APIRouter()


@router.post("/login", response_model=schemas.LoginResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    role = (user.role or "CUSTOMER").upper()
    token = create_access_token(str(user.id), role, {"email": user.email})
    stats = user_stats_compact(db, user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": role,
            "image": user.image,
            "brand_id": str(user.brand_id) if user.brand_id else None,
            "stats": stats,
        },
    }
