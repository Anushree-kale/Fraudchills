import pytest
import uuid
from models import Complaint, Brand

def test_list_brands_empty(client):
    """Verify the endpoint works even when no brands exist."""
    response = client.get("/brands")
    assert response.status_code == 200
    assert response.json() == []

def test_list_brands_with_data(client, db_session):
    """Verify that brands with complaints appear in the list."""
    # 1. Create a dummy brand
    brand = Brand(name="TestCorp", website="https://testcorp.com")
    db_session.add(brand)
    db_session.flush() # Get the ID without committing
    
    # 2. Add a complaint for that brand
    complaint = Complaint(
        case_number="FC-T001",
        type="Item Not Received",
        details="I ordered a laptop and it never arrived.",
        brand_name="TestCorp",
        brand_id=brand.id,
        user_id=uuid.uuid4(),
        score=75.0 # Score is 0-100. 75.0 >= 70 is HIGH.
    )
    db_session.add(complaint)
    db_session.commit()
    
    # 3. Test the list endpoint
    response = client.get("/brands")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    # ALISED: brand_name -> brandName
    assert data[0]["brandName"] == "TestCorp"
    assert data[0]["totalComplaints"] == 1
    assert data[0]["riskLabel"] == "HIGH"

def test_get_brand_profile_not_found(client):
    """Verify 404 for non-existent brands."""
    response = client.get("/brands/GhostBrand")
    assert response.status_code == 404

def test_get_brand_profile_success(client, db_session):
    """Verify full profile details are returned correctly."""
    brand = Brand(name="Apple", website="https://apple.com", is_verified=True)
    db_session.add(brand)
    
    complaint = Complaint(
        case_number="FC-A001",
        type="Defective Product",
        details="Cracked screen on arrival.",
        brand_name="Apple",
        brand_id=brand.id,
        user_id=uuid.uuid4(),
        score=20.0 # Score is 0-100. 20.0 < 40 is LOW.
    )
    db_session.add(complaint)
    db_session.commit()
    
    response = client.get("/brands/Apple")
    assert response.status_code == 200
    profile = response.json()
    # ALISED: brand_name -> brandName, is_verified -> isVerified, etc.
    assert profile["brandName"] == "Apple"
    assert profile["isVerified"] is True
    assert profile["totalComplaints"] == 1
    assert profile["riskLabel"] == "LOW"
