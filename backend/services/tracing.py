"""
Live features + entity tracing, both computed from the `events` table.

Two things the platform was missing:

1. Real-time features. `fraud_xgb.pkl` uses 7 production features, including
   velocity, account age, device/IP novelty, and new-account status.
   These are computed from stored events and the current user.

2. Tracing. A scam is a ring, not a transaction. Actors are linked by shared
   identifiers; traversing those links is a recursive CTE, which Postgres and
   SQLite both support natively. No graph database needed.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import String, cast, func, text
from sqlalchemy.orm import Session

import models


# Identifiers traversed when tracing.
LINK_KEYS = ("device_fp", "ip", "card_hash", "email_norm", "phone")


def _norm(v: Optional[str]) -> Optional[str]:
    """
    Blank identifiers become NULL.

    NULL = NULL is false in SQL, so unknown values stop linking
    unrelated users together.
    """
    if v is None:
        return None

    v = v.strip().lower()
    return v or None


def card_hash(card_number: str | None) -> Optional[str]:
    """
    Never store a PAN. Hash it so cards can still link across accounts.
    """
    n = _norm(card_number)

    return hashlib.sha256(n.encode()).hexdigest() if n else None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None

    return (
        dt.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None
        else dt.astimezone(timezone.utc)
    )


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
    """
    Compute the 7 features used by the production fraud_xgb.pkl model.

    Features:
        amount
        account_age_days
        transaction_hour
        ip_mismatch
        device_mismatch
        order_velocity_24h
        new_account

    The returned dictionary is keyed by feature name so the prediction
    layer can explicitly align it with model.feature_names_in_.
    """

    now = now or _utc_now()

    ip = _norm(ip)
    device_fp = _norm(device_fp)

    uid = user.id if user else None

    # ── Account age ───────────────────────────────────────────────────────────

    account_age_days = 0

    if user is not None:
        created = _as_utc(user.created_at)

        if created:
            account_age_days = max(
                0,
                (now - created).days,
            )

    # ── New account ───────────────────────────────────────────────────────────
    #
    # The training CSV uses new_account as a binary feature.
    # We derive the same concept in production from account age.

    new_account = int(account_age_days < 30)

    # ── History-based features ────────────────────────────────────────────────

    order_velocity_24h = 0

    ip_seen = False
    device_seen = False

    has_history = False

    if uid is not None:

        # Number of transactions/events for this user during the
        # previous 24 hours.
        since_24h = now - timedelta(hours=24)

        order_velocity_24h = (
            db.query(func.count(models.Event.id))
            .filter(
                models.Event.user_id == uid,
                models.Event.created_at >= since_24h,
            )
            .scalar()
            or 0
        )

        # Check whether this user's IP/device has appeared previously
        # during the last 30 days.
        since_30d = now - timedelta(days=30)

        rows = (
            db.query(
                models.Event.ip,
                models.Event.device_fp,
            )
            .filter(
                models.Event.user_id == uid,
                models.Event.created_at >= since_30d,
            )
            .all()
        )

        has_history = bool(rows)

        ip_seen = (
            any(r[0] == ip for r in rows)
            if ip
            else False
        )

        device_seen = (
            any(r[1] == device_fp for r in rows)
            if device_fp
            else False
        )

    # A first-ever event is not treated as a mismatch.
    # It is simply an absence of historical evidence.

    return {
        "amount": float(amount or 0.0),

        "account_age_days": int(
            account_age_days
        ),

        "transaction_hour": int(
            now.hour
        ),

        "ip_mismatch": int(
            bool(
                has_history
                and ip
                and not ip_seen
            )
        ),

        "device_mismatch": int(
            bool(
                has_history
                and device_fp
                and not device_seen
            )
        ),

        "order_velocity_24h": int(
            order_velocity_24h
        ),

        "new_account": int(
            new_account
        ),
    }


# ── Event recording ───────────────────────────────────────────────────────────

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
    """
    Append one event.

    Caller commits. This is intended to run inside the request transaction.
    """

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

_LINK_PREDICATE = " OR ".join(
    f"e2.{k} = e1.{k}"
    for k in LINK_KEYS
)


_RING_SQL = text(
    f"""
WITH RECURSIVE ring(user_id, depth) AS (

    SELECT CAST(:seed AS VARCHAR), 0

    UNION

    SELECT
        CAST(e2.user_id AS VARCHAR),
        r.depth + 1

    FROM ring r

    JOIN events e1
        ON CAST(e1.user_id AS VARCHAR) = r.user_id

    JOIN events e2
        ON e2.user_id IS NOT NULL
        AND e2.user_id <> e1.user_id
        AND ({_LINK_PREDICATE})

    WHERE r.depth < :max_depth
)

SELECT
    user_id,
    MIN(depth) AS depth

FROM ring

GROUP BY user_id

ORDER BY MIN(depth)

LIMIT :limit
"""
)


def trace_ring(
    db: Session,
    seed_user_id: UUID | str,
    max_depth: int = 3,
    limit: int = 200,
) -> list[dict]:
    """
    Users reachable from seed_user_id through shared identifiers.

    depth 0 = seed
    depth 1 = directly connected user
    depth 2+ = users connected through the ring
    """

    seed = (
        seed_user_id
        if isinstance(seed_user_id, UUID)
        else UUID(str(seed_user_id))
    )

    # Let the ORM render the seed in the format used by the database.
    stored = (
        db.query(
            cast(models.Event.user_id, String)
        )
        .filter(
            models.Event.user_id == seed
        )
        .limit(1)
        .scalar()
    )

    if stored is None:
        return [
            {
                "user_id": str(seed),
                "depth": 0,
            }
        ]

    rows = db.execute(
        _RING_SQL,
        {
            "seed": stored,
            "max_depth": max_depth,
            "limit": limit,
        },
    ).fetchall()

    return [
        {
            "user_id": str(UUID(str(r[0]))),
            "depth": int(r[1]),
        }
        for r in rows
    ]


def ring_risk(
    db: Session,
    seed_user_id: UUID | str,
    max_depth: int = 3,
) -> dict:
    """
    Aggregate signal for a traced cluster.

    This lets the system see suspicious connected accounts instead
    of looking at a transaction in isolation.
    """

    ring = trace_ring(
        db,
        seed_user_id,
        max_depth=max_depth,
    )

    ids = [
        UUID(m["user_id"])
        for m in ring
    ]

    if len(ids) <= 1:
        return {
            "members": ring,
            "size": len(ids),
            "confirmed_fraud": 0,
            "amount_at_risk": 0.0,
        }

    confirmed = (
        db.query(func.count(models.Event.id))
        .filter(
            models.Event.user_id.in_(ids),
            models.Event.label == 1,
        )
        .scalar()
        or 0
    )

    amount = (
        db.query(
            func.coalesce(
                func.sum(models.Event.amount),
                0,
            )
        )
        .filter(
            models.Event.user_id.in_(ids)
        )
        .scalar()
        or 0
    )

    return {
        "members": ring,
        "size": len(ids),
        "confirmed_fraud": int(confirmed),
        "amount_at_risk": round(
            float(amount),
            2,
        ),
    }