"""
Authentication: JWT (Bearer) preferred; X-User-Email retained for NextAuth bridge.

Set JWT_SECRET (or NEXTAUTH_SECRET) in production.
"""

from datetime import datetime, timedelta, timezone
import os
import uuid
from typing import Optional

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("NEXTAUTH_SECRET", "dev-only-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24 * 7)))


def verify_password(plain: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_access_token(subject: str, role: str, extra: Optional[dict] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": expire,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def get_current_user(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
) -> models.User:
    """
    Resolve user from:
      1) Authorization: Bearer <jwt>  (sub = user UUID)
      2) X-User-Email (legacy NextAuth header; upserts user)
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = decode_token(token)
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(status_code=401, detail="Invalid token payload.")
            try:
                uid = uuid.UUID(str(sub))
            except ValueError:
                raise HTTPException(status_code=401, detail="Invalid subject in token.")
            user = db.query(models.User).filter(models.User.id == uid).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found.")
            return user
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

    if x_user_email:
        user = db.query(models.User).filter(models.User.email == x_user_email).first()
        if not user:
            user = models.User(email=x_user_email, role="CUSTOMER")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    raise HTTPException(
        status_code=401,
        detail="Not authenticated. Send Authorization: Bearer <token> or X-User-Email.",
    )


def get_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    role = (current_user.role or "").upper()
    if role not in ("ADMIN", "MODERATOR"):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


def require_roles(*allowed: str):
    allowed_u = {r.upper() for r in allowed}

    def _inner(current_user: models.User = Depends(get_current_user)) -> models.User:
        role = (current_user.role or "CUSTOMER").upper()
        if role not in allowed_u:
            raise HTTPException(status_code=403, detail="Insufficient permissions for this resource.")
        return current_user

    return _inner


def get_api_key(
    x_api_key: str = Header(..., description="External B2B API Key"),
    db: Session = Depends(get_db),
) -> models.APIKey:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header missing.")

    api_key = (
        db.query(models.APIKey)
        .filter(
            models.APIKey.key_hash == x_api_key,
            models.APIKey.is_active == True,  # noqa: E712
        )
        .first()
    )

    if not api_key:
        raise HTTPException(status_code=403, detail="Invalid or inactive API Key.")

    return api_key
