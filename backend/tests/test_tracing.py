"""Self-check: live features come from real history, and tracing walks a ring."""

import uuid
from datetime import datetime, timedelta, timezone

import models
from services.tracing import live_features, record_event, ring_risk, trace_ring


def _user(db, days_old=30):
    u = models.User(
        id=uuid.uuid4(),
        email=f"{uuid.uuid4()}@t.test",
        created_at=datetime.now(timezone.utc) - timedelta(days=days_old),
    )
    db.add(u)
    db.flush()
    return u


def test_features_track_real_history(db_session):
    u = _user(db_session, days_old=12)

    f = live_features(db_session, u, amount=100.0, ip="1.1.1.1", device_fp="dev-a")
    assert f["order_velocity_24h"] == 0
    assert f["account_age_days"] == 12
    # First sighting is not a mismatch — there is nothing to mismatch against.
    assert f["ip_mismatch"] == 0 and f["device_mismatch"] == 0

    for _ in range(3):
        record_event(db_session, user_id=u.id, amount=100.0, risk_score=0.1,
                     ip="1.1.1.1", device_fp="dev-a")
    db_session.flush()

    f = live_features(db_session, u, amount=100.0, ip="1.1.1.1", device_fp="dev-a")
    assert f["order_velocity_24h"] == 3, "velocity must reflect stored events"
    assert f["ip_mismatch"] == 0 and f["device_mismatch"] == 0

    f = live_features(db_session, u, amount=100.0, ip="9.9.9.9", device_fp="dev-z")
    assert f["ip_mismatch"] == 1 and f["device_mismatch"] == 1


def test_trace_walks_shared_identifiers(db_session):
    a, b, c, stranger = (_user(db_session) for _ in range(4))

    # a—b share a device; b—c share a card; stranger shares nothing.
    record_event(db_session, user_id=a.id, amount=10, risk_score=0.1, device_fp="shared-dev")
    record_event(db_session, user_id=b.id, amount=20, risk_score=0.1, device_fp="shared-dev")
    record_event(db_session, user_id=b.id, amount=30, risk_score=0.1, card="4111111111111111")
    record_event(db_session, user_id=c.id, amount=40, risk_score=0.1, card="4111111111111111")
    record_event(db_session, user_id=stranger.id, amount=50, risk_score=0.1, device_fp="other-dev")
    db_session.flush()

    ring = {m["user_id"]: m["depth"] for m in trace_ring(db_session, a.id, max_depth=3)}
    assert ring[str(a.id)] == 0
    assert ring[str(b.id)] == 1, "direct device link"
    assert ring[str(c.id)] == 2, "reached only via b's card — this is the trace"
    assert str(stranger.id) not in ring, "unlinked users must not be pulled in"

    assert trace_ring(db_session, a.id, max_depth=1) == [{"user_id": str(a.id), "depth": 0}] or \
        str(c.id) not in {m["user_id"] for m in trace_ring(db_session, a.id, max_depth=1)}

    risk = ring_risk(db_session, a.id, max_depth=3)
    assert risk["size"] == 3
    assert risk["amount_at_risk"] == 100.0  # 10 + 20 + 30 + 40


def test_blank_identifiers_do_not_link(db_session):
    a, b = _user(db_session), _user(db_session)
    record_event(db_session, user_id=a.id, amount=10, risk_score=0.1, ip="", device_fp=None)
    record_event(db_session, user_id=b.id, amount=10, risk_score=0.1, ip="", device_fp=None)
    db_session.flush()

    ring = trace_ring(db_session, a.id)
    assert {m["user_id"] for m in ring} == {str(a.id)}, "empty strings must not join strangers"
