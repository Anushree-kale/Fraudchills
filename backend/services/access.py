"""Role-scoped complaint queries for dashboard APIs."""

from sqlalchemy import false, or_
from sqlalchemy.orm import Session

import models


def complaints_scope_query(db: Session, user: models.User):
    """
    ADMIN: all complaints.
    BRAND: complaints tied to the user's brand (by brand_id or name match).
    CUSTOMER (default): complaints filed by the user.
    """
    q = db.query(models.Complaint)
    role = (user.role or "CUSTOMER").upper()

    if role == "ADMIN":
        return q

    if role == "BRAND" and user.brand_id:
        brand = db.query(models.Brand).filter(models.Brand.id == user.brand_id).first()
        if brand:
            return q.filter(
                or_(
                    models.Complaint.brand_id == user.brand_id,
                    models.Complaint.brand_name.ilike(brand.name),
                )
            )
        return q.filter(false())

    return q.filter(models.Complaint.user_id == user.id)
