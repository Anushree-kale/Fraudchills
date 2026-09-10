from sqlalchemy.orm import Session

import models


def find_or_create_incident(
    db: Session,
    complaint: models.Complaint,
) -> models.Incident:
    """
    Find an existing incident or create a new one.

    Current high-confidence matching rule:
    same brand_id + same order_id = same incident.

    We intentionally do not merge incidents based only on:
    - brand
    - amount
    - user
    - complaint description
    """

    incident = None

    # Only automatically match when both identifiers exist.
    if complaint.brand_id and complaint.order_id:
        incident = (
            db.query(models.Incident)
            .filter(
                models.Incident.brand_id == complaint.brand_id,
                models.Incident.order_id == complaint.order_id,
            )
            .first()
        )

    # No match → create a new incident.
    if incident is None:
        incident = models.Incident(
            brand_id=complaint.brand_id,
            order_id=complaint.order_id,
            amount=complaint.amount or 0.0,
            occurred_at=complaint.created_at,
        )

        db.add(incident)
        db.flush()

    # Check whether this complaint is already linked.
    existing_link = (
        db.query(models.IncidentComplaint)
        .filter(
            models.IncidentComplaint.complaint_id == complaint.id
        )
        .first()
    )

    if existing_link is None:
        db.add(
            models.IncidentComplaint(
                incident_id=incident.id,
                complaint_id=complaint.id,
            )
        )
        db.flush()

    return incident