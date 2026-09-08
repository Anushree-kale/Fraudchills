import uuid
import pytest
from models import Event, User


def test_unauthenticated_label_request(client):
    """Calling the label endpoint without authentication headers returns 401."""
    random_id = str(uuid.uuid4())
    res = client.patch(f"/api/events/{random_id}/label", json={"label": 0})
    assert res.status_code == 401


def test_label_event_legitimate(client, db_session):
    """Customer can label their own event as Legitimate (0)."""
    customer = User(email="cust1@example.com", role="CUSTOMER")
    db_session.add(customer)
    db_session.flush()

    ev = Event(
        user_id=customer.id,
        amount=150.0,
        risk_score=0.15,
        event_type="TRANSACTION",
    )
    db_session.add(ev)
    db_session.commit()

    res = client.patch(
        f"/api/events/{ev.id}/label",
        json={"label": 0},
        headers={"X-User-Email": customer.email},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == 0
    assert data["id"] == str(ev.id)

    db_session.refresh(ev)
    assert ev.label == 0


def test_label_event_fraud(client, db_session):
    """Customer can label their own event as Fraud (1)."""
    customer = User(email="cust2@example.com", role="CUSTOMER")
    db_session.add(customer)
    db_session.flush()

    ev = Event(
        user_id=customer.id,
        amount=899.0,
        risk_score=0.88,
        event_type="TRANSACTION",
    )
    db_session.add(ev)
    db_session.commit()

    res = client.patch(
        f"/api/events/{ev.id}/label",
        json={"label": 1},
        headers={"X-User-Email": customer.email},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == 1

    db_session.refresh(ev)
    assert ev.label == 1


def test_invalid_label_value(client, db_session):
    """Labels other than 0 and 1 return 400 Bad Request."""
    customer = User(email="cust3@example.com", role="CUSTOMER")
    db_session.add(customer)
    db_session.flush()

    ev = Event(user_id=customer.id, amount=50.0, risk_score=0.2)
    db_session.add(ev)
    db_session.commit()

    # Out-of-bounds integer values
    for invalid_val in [2, -1, 99]:
        res = client.patch(
            f"/api/events/{ev.id}/label",
            json={"label": invalid_val},
            headers={"X-User-Email": customer.email},
        )
        assert res.status_code == 400
        assert "Invalid label" in res.json().get("detail", "")

    # Non-integer / malformed
    res = client.patch(
        f"/api/events/{ev.id}/label",
        json={"label": "not-an-int"},
        headers={"X-User-Email": customer.email},
    )
    assert res.status_code == 422


def test_missing_event_404(client, db_session):
    """Trying to label a non-existent event returns 404."""
    customer = User(email="cust4@example.com", role="CUSTOMER")
    db_session.add(customer)
    db_session.commit()

    random_id = str(uuid.uuid4())
    res = client.patch(
        f"/api/events/{random_id}/label",
        json={"label": 0},
        headers={"X-User-Email": customer.email},
    )
    assert res.status_code == 404


def test_customer_cannot_label_other_user_event(client, db_session):
    """Customer A cannot label Customer B's event (returns 403)."""
    cust_a = User(email="cust_a@example.com", role="CUSTOMER")
    cust_b = User(email="cust_b@example.com", role="CUSTOMER")
    db_session.add_all([cust_a, cust_b])
    db_session.flush()

    ev_b = Event(user_id=cust_b.id, amount=300.0, risk_score=0.5)
    db_session.add(ev_b)
    db_session.commit()

    res = client.patch(
        f"/api/events/{ev_b.id}/label",
        json={"label": 1},
        headers={"X-User-Email": cust_a.email},
    )
    assert res.status_code == 403
    assert "Not authorized" in res.json().get("detail", "")

    db_session.refresh(ev_b)
    assert ev_b.label is None


def test_admin_can_label_any_event(client, db_session):
    """An ADMIN user can label any customer's event."""
    admin = User(email="admin@example.com", role="ADMIN")
    customer = User(email="cust5@example.com", role="CUSTOMER")
    db_session.add_all([admin, customer])
    db_session.flush()

    ev = Event(user_id=customer.id, amount=750.0, risk_score=0.7)
    db_session.add(ev)
    db_session.commit()

    res = client.patch(
        f"/api/events/{ev.id}/label",
        json={"label": 1},
        headers={"X-User-Email": admin.email},
    )
    assert res.status_code == 200
    assert res.json()["label"] == 1

    db_session.refresh(ev)
    assert ev.label == 1


def test_list_events_and_filtering(client, db_session):
    """Test listing events with role scoping and unlabeled filtering."""
    cust1 = User(email="list_cust1@example.com", role="CUSTOMER")
    cust2 = User(email="list_cust2@example.com", role="CUSTOMER")
    admin = User(email="list_admin@example.com", role="ADMIN")
    db_session.add_all([cust1, cust2, admin])
    db_session.flush()

    # Cust 1 has 1 labeled, 1 unlabeled
    ev1 = Event(user_id=cust1.id, amount=10.0, risk_score=0.1, label=0)
    ev2 = Event(user_id=cust1.id, amount=20.0, risk_score=0.2, label=None)
    # Cust 2 has 1 unlabeled
    ev3 = Event(user_id=cust2.id, amount=30.0, risk_score=0.3, label=None)
    db_session.add_all([ev1, ev2, ev3])
    db_session.commit()

    # Customer 1 sees only their 2 events
    res = client.get("/api/events", headers={"X-User-Email": cust1.email})
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2

    # Customer 1 filters unlabeled_only
    res = client.get("/api/events?unlabeled_only=true", headers={"X-User-Email": cust1.email})
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["id"] == str(ev2.id)

    # Admin sees all 3 events
    res = client.get("/api/events", headers={"X-User-Email": admin.email})
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 3


def test_predict_fraud_flow_and_labeling(client, db_session):
    """Verify predict-fraud returns event_id and that event can be immediately labeled."""
    customer = User(email="flow_user@example.com", role="CUSTOMER")
    db_session.add(customer)
    db_session.commit()

    predict_res = client.post(
        "/predict-fraud",
        json={
            "amount": 250.0,
            "ip_address": "198.51.100.1",
            "device_fingerprint": "dfp-flow-test-1",
            "card_last4": "4242",
            "num_orders_last_24h": 1,
        },
        headers={"X-User-Email": customer.email},
    )
    assert predict_res.status_code == 200
    data = predict_res.json()
    event_id = data.get("eventId") or data.get("event_id")
    assert event_id is not None

    # Now label that event using PATCH /api/events/{event_id}/label
    label_res = client.patch(
        f"/api/events/{event_id}/label",
        json={"label": 0},
        headers={"X-User-Email": customer.email},
    )
    assert label_res.status_code == 200
    assert label_res.json()["label"] == 0
