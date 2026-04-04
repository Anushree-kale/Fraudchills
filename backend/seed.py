import uuid
import random
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from datetime import datetime, timedelta

def seed_data():
    db: Session = SessionLocal()
    
    # Reset tables for clean schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("Seeding Brands...")
    brands = [
        {"name": "Amazon India", "website": "amazon.in", "is_verified": True},
        {"name": "Flipkart", "website": "flipkart.com", "is_verified": True},
        {"name": "Myntra", "website": "myntra.com", "is_verified": False},
        {"name": "Zomato", "website": "zomato.com", "is_verified": True},
        {"name": "Swiggy", "website": "swiggy.com", "is_verified": True},
        {"name": "Reliance Digital", "website": "reliancedigital.in", "is_verified": False},
    ]
    
    brand_objs = []
    for b in brands:
        exists = db.query(models.Brand).filter(models.Brand.name == b["name"]).first()
        if not exists:
            brand = models.Brand(
                name=b["name"],
                website=b["website"],
                is_verified=b["is_verified"],
                resolution_score=random.randint(60, 95) if b["is_verified"] else 0.0
            )
            db.add(brand)
            brand_objs.append(brand)
        else:
            brand_objs.append(exists)
    db.commit()

    print("Seeding Known Fraudulent Brands...")
    fraud_shops = [
        {"name": "FakeShoesHQ", "url": "fakeshoeshq.club", "source": "Vesta Dataset"},
        {"name": "EasyFreeGifts", "url": "easyfreegifts.xyz", "source": "Manual Report"},
        {"name": "AmazonSupportReal", "url": "amazonsupport.co.in", "source": "Phishing DB"},
        {"name": "FlipkartSale2026", "url": "flipkartsale2026.net", "source": "Verified Fraud"},
    ]
    for s in fraud_shops:
        exists = db.query(models.KnownFraudulentBrand).filter(models.KnownFraudulentBrand.url == s["url"]).first()
        if not exists:
            db.add(models.KnownFraudulentBrand(name=s["name"], url=s["url"], source=s["source"]))
    db.commit()

    print("Seeding Users...")
    users = []
    for i in range(10):
        email = f"user{i}@example.com"
        exists = db.query(models.User).filter(models.User.email == email).first()
        if not exists:
            user = models.User(name=f"User {i}", email=email, role="CUSTOMER" if i > 0 else "ADMIN")
            db.add(user)
            users.append(user)
        else:
            users.append(exists)
    db.commit()

    print("Seeding Complaints (this might take a while)...")
    fraud_types = ["BUYER_FRAUD", "SELLER_FRAUD", "PHISHING", "IDENTITY_THEFT", "REFUND_ABUSE"]
    details_templates = [
        "I was charged for an order that never arrived. The seller ghosted me.",
        "The item I received was clearly a fake counterfeit version of what was advertised.",
        "I received a suspicious email asking for my bank details for a 'refund' from {brand}.",
        "My account was hacked and several unauthorized orders were placed.",
        "The delivery guy took the money but didn't hand over the package.",
        "Returns were rejected even though the item was damaged on arrival."
    ]

    for i in range(50): # Let's do 50 for now instead of 500 for speed
        brand = random.choice(brand_objs)
        user = random.choice(users)
        ftype = random.choice(fraud_types)
        
        created_at = datetime.now() - timedelta(days=random.randint(0, 30))
        deadline = created_at + timedelta(days=7)
        status = random.choice(["PENDING", "RESPONDED", "RESOLVED", "ESCALATED"])
        
        # If it's already resolved, status is RESOLVED
        if status == "RESOLVED":
            deadline = None
        
        complaint = models.Complaint(
            case_number=f"FC-{100000 + i}",
            type=ftype,
            details=random.choice(details_templates).format(brand=brand.name),
            brand_name=brand.name,
            brand_id=brand.id,
            user_id=user.id,
            score=random.randint(20, 90),
            status=status,
            deadline=deadline,
            created_at=created_at,
        )
        db.add(complaint)
        db.flush()
        
        # Add events
        db.add(models.ComplaintEvent(
            complaint_id=complaint.id,
            event_type="FILED",
            note="Initial report",
            created_at=created_at
        ))
        
        if status in ["RESPONDED", "RESOLVED", "ESCALATED"]:
            db.add(models.ComplaintEvent(
                complaint_id=complaint.id,
                event_type="BRAND_RESPONDED" if status != "ESCALATED" else "SYSTEM_ESCALATED",
                note="Automatic follow-up event",
                created_at=created_at + timedelta(days=2)
            ))

    db.commit()
    print("Done seeding!")
    db.close()

if __name__ == "__main__":
    seed_data()
