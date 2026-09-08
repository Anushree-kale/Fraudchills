"""Live features + entity tracing, both computed from the `events` table.

Two things the platform was missing:

1. Real-time features. `fraud_xgb.pkl` wants 7 features, 5 of which are per-entity
   history (velocity, account age, device/IP novelty, prior complaints). They can
   only come from stored events, so scoring was falling back to constants.
2. Tracing. A scam is a *ring*, not a transaction. Actors are linked by shared
   identifiers; traversing those links is a recursive CTE, which Postgres and
   SQLite both do natively. No graph database needed.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import String, cast, func, text
from sqlalchemy.orm import Session

import models

# Identifiers traversed when tracing. Order is irrelevant; presence is not —
# adding one here widens every ring.
LINK_KEYS = ("device_fp", "ip", "card_hash", "email_norm", "phone")


def _norm(v: Optional[str]) -> Optional[str]:
    """Blank identifiers must become NULL: `NULL = NULL` is false in SQL, so
    unknown values stop linking strangers together."""
    if v is None:
        return None
    v = v.strip().lower()
    return v or None


def card_hash(card_number: str | None) -> Optional[str]:
    """Never store a PAN. Hash it so cards still link across accounts."""
    n = _norm(card_number)
    return hashlib.sha256(n.encode()).hexdigest() if n else None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


# ── Feature extraction ────────────────────────────────────────────────────────
def live_features(
    db: Session,
    user: models.User | None,
    *,
    amount: float,
    ip: str | None,
    device_fp: str | None,
    now: datetime | None = None,
) -> dict:
    """The 7 features `fraud_xgb.pkl` was trained on, computed from live history.

    Returned as a dict keyed by the model's own feature names so column order can
    never silently drift.
    """
    now = now or _utc_now()
    ip, device_fp = _norm(ip), _norm(device_fp)
    uid = user.id if user else None

    account_age_days = 0
    if user is not None:
        created = _as_utc(user.created_at)
        if created:
            account_age_days = max(0, (now - created).days)

    order_velocity_24h = 0
    prior_complaints = 0
    ip_seen = device_seen = False
    has_history = False

    if uid is not None:
        since_24h = now - timedelta(hours=24)
        order_velocity_24h = (
            db.query(func.count(models.Event.id))
            .filter(models.Event.user_id == uid, models.Event.created_at >= since_24h)
            .scalar()
            or 0
        )
        prior_complaints = (
            db.query(func.count(models.Complaint.id))
            .filter(models.Complaint.user_id == uid)
            .scalar()
            or 0
        )

        # One pass over the last 30d of this user's identifiers.
        since_30d = now - timedelta(days=30)
        rows = (
            db.query(models.Event.ip, models.Event.device_fp)
            .filter(models.Event.user_id == uid, models.Event.created_at >= since_30d)
            .all()
        )
        has_history = bool(rows)
        ip_seen = any(r[0] == ip for r in rows) if ip else False
        device_seen = any(r[1] == device_fp for r in rows) if device_fp else False

    # A first-ever event is not a mismatch — it is an absence of evidence.
    return {
        "amount": float(amount or 0.0),
        "account_age_days": int(account_age_days),
        "transaction_hour": int(now.hour),
        "ip_mismatch": int(bool(has_history and ip and not ip_seen)),
        "device_mismatch": int(bool(has_history and device_fp and not device_seen)),
        "order_velocity_24h": int(order_velocity_24h),
        "prior_complaints": int(prior_complaints),
    }


def record_event(
    db: Session,
    *,
    user_id: UUID | None,
    amount: float,
    risk_score: float,
    ip: str | None = None,
    device_fp: str | None = None,
    email: str | None = None,
    card: str | None = None,
    phone: str | None = None,
    event_type: str = "TRANSACTION",
) -> models.Event:
    """Append one event. Caller commits — this is meant to ride the request's txn."""
    ev = models.Event(
        user_id=user_id,
        event_type=event_type,
        amount=float(amount or 0.0),
        ip=_norm(ip),
        device_fp=_norm(device_fp),
        email_norm=_norm(email),
        card_hash=card_hash(card),
        phone=_norm(phone),
        risk_score=risk_score,
    )
    db.add(ev)
    return ev


# ── Tracing ───────────────────────────────────────────────────────────────────
_LINK_PREDICATE = " OR ".join(f"e2.{k} = e1.{k}" for k in LINK_KEYS)

# user_id is cast to text so the anchor and recursive terms agree on type across
# both Postgres (uuid) and SQLite (char). Only e1 needs the cast; the e2 <> e1
# comparison stays native. The seed must be pre-normalised to whatever text form
# the backend stores — Postgres keeps the dashes, SQLite does not.
_RING_SQL = text(
    f"""
WITH RECURSIVE ring(user_id, depth) AS (
    SELECT CAST(:seed AS VARCHAR), 0
  UNION
    SELECT CAST(e2.user_id AS VARCHAR), r.depth + 1
      FROM ring r
      JOIN events e1 ON CAST(e1.user_id AS VARCHAR) = r.user_id
      JOIN events e2 ON e2.user_id IS NOT NULL
                    AND e2.user_id <> e1.user_id
                    AND ({_LINK_PREDICATE})
     WHERE r.depth < :max_depth
)
SELECT user_id, MIN(depth) AS depth
  FROM ring
 GROUP BY user_id
 ORDER BY MIN(depth)
 LIMIT :limit
"""
)


def trace_ring(db: Session, seed_user_id: UUID | str, max_depth: int = 3, limit: int = 200) -> list[dict]:
    """Users reachable from `seed_user_id` through shared identifiers.

    depth 0 is the seed, 1 is a direct shared device/IP/card, and so on. This is
    the actual "trace": it turns one reported account into the cluster behind it.

    ponytail: three known ceilings, all fine at startup volume —
    (a) every identifier is weighted equally, so a carrier-NAT IP or shared office
        network pulls in unrelated users; weight edges by identifier rarity (IDF
        over events) and drop identifiers seen on > N distinct users;
    (b) the CAST on e1.user_id skips the user_id index; add a functional index or
        store user_id as text if traversal gets slow;
    (c) the OR-join over five columns is planner-hostile; normalise into
        event_identifiers(event_id, kind, value) and join one composite index.
    """
    seed = seed_user_id if isinstance(seed_user_id, UUID) else UUID(str(seed_user_id))

    # Let the ORM render the seed the way this dialect stores it, rather than
    # guessing at the text format.
    stored = (
        db.query(cast(models.Event.user_id, String))
        .filter(models.Event.user_id == seed)
        .limit(1)
        .scalar()
    )
    if stored is None:
        return [{"user_id": str(seed), "depth": 0}]  # no events yet, nothing to link

    rows = db.execute(
        _RING_SQL, {"seed": stored, "max_depth": max_depth, "limit": limit}
    ).fetchall()
    # Canonical dashed form out, whatever the backend stores.
    return [{"user_id": str(UUID(str(r[0]))), "depth": int(r[1])} for r in rows]


def ring_risk(db: Session, seed_user_id: UUID | str, max_depth: int = 3) -> dict:
    """Aggregate signal for a traced cluster — the thing a single-event score
    structurally cannot see."""
    ring = trace_ring(db, seed_user_id, max_depth=max_depth)
    ids = [UUID(m["user_id"]) for m in ring]
    if len(ids) <= 1:
        return {"members": ring, "size": len(ids), "confirmed_fraud": 0, "amount_at_risk": 0.0}

    confirmed = (
        db.query(func.count(models.Event.id))
        .filter(models.Event.user_id.in_(ids), models.Event.label == 1)
        .scalar()
        or 0
    )
    amount = (
        db.query(func.coalesce(func.sum(models.Event.amount), 0))
        .filter(models.Event.user_id.in_(ids))
        .scalar()
        or 0
    )
    return {
        "members": ring,
        "size": len(ids),
        "confirmed_fraud": int(confirmed),
        "amount_at_risk": round(float(amount), 2),
    }
