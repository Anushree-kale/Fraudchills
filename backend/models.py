from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float, ARRAY, Text, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base
import uuid

# Single app user store — aligned with NextAuth `users` table (uuid id).


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    email = Column(String, unique=True, nullable=True)
    emailVerified = Column("emailVerified", DateTime(timezone=True))
    image = Column(String)
    password = Column(String)
    role = Column(String, default="CUSTOMER")
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    credibility_score = Column(Float, default=50.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Brand(Base):
    __tablename__ = "brands"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    logo_url = Column(String)
    website = Column(String)
    is_verified = Column(Boolean, default=False)
    claimed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    gst_number = Column(String)
    verification_doc_url = Column(String)
    resolution_score = Column(Float, default=0.0)
    avg_response_time = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    status = Column(String, default="PENDING")
    platform = Column(String)
    order_id = Column(String)
    amount = Column(Float, default=0.0)
    brand_name = Column(String, nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    score = Column(Float, default=0.0)
    deadline = Column(DateTime(timezone=True))
    proof_urls = Column(ARRAY(String))
    external_links = Column(ARRAY(String))
    image_url = Column(String)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    upvotes_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ComplaintEvent(Base):
    __tablename__ = "complaint_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=False)
    event_type = Column(String, nullable=False)
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ComplaintVote(Base):
    __tablename__ = "complaint_votes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("user_id", "complaint_id", name="user_complaint_vote_unique"),)


class Response(Base):
    __tablename__ = "responses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KnownFraudulentBrand(Base):
    __tablename__ = "known_fraudulent_brands"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url = Column(String, unique=True, nullable=False)
    name = Column(String)
    source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_hash = Column(String, unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FraudLog(Base):
    """ML / rules fraud scoring audit trail."""

    __tablename__ = "fraud_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    risk_score = Column(Float, nullable=False)
    reason = Column(Text)
    raw_payload = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
