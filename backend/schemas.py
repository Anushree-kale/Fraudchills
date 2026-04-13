from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID

def to_camel(string: str) -> str:
    return "".join(word.capitalize() if i > 0 else word for i, word in enumerate(string.split("_")))

# User Schemas
class UserBase(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    image: Optional[str] = None
    role: str = "CUSTOMER"
    credibility_score: float = 50.0

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def id_as_str(cls, v):
        return str(v) if v is not None else v

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    image: Optional[str] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class PasswordUpdate(BaseModel):
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=8, max_length=256)

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


# Brand Schemas
class BrandBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    gst_number: Optional[str] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class BrandCreate(BrandBase):
    verification_doc_url: Optional[str] = None

class Brand(BrandBase):
    id: UUID
    is_verified: bool
    claimed_by: Optional[str] = None
    resolution_score: float
    avg_response_time: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )

# Complaint Schemas
class ComplaintBase(BaseModel):
    type: str
    details: str
    platform: Optional[str] = None
    order_id: Optional[str] = None
    amount: float = 0.0
    brand_name: str  # Keep for compatibility
    proof_urls: List[str] = Field(default_factory=list)
    external_links: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

    @field_validator("proof_urls", "external_links", mode="before")
    @classmethod
    def _coerce_pg_array(cls, v):
        # PostgreSQL ARRAY columns often come back as None; response validation was 500'ing.
        if v is None:
            return []
        if isinstance(v, (list, tuple)):
            return list(v)
        return []

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class ComplaintCreate(ComplaintBase):
    pass

class Complaint(ComplaintBase):
    id: UUID
    case_number: str
    status: str
    score: float
    deadline: Optional[datetime] = None
    user_id: str
    brand_id: Optional[UUID] = None
    upvotes_count: int = 0
    created_at: datetime
    updated_at: datetime

    @field_validator("user_id", mode="before")
    @classmethod
    def user_id_as_str(cls, v):
        return str(v) if v is not None else v

    @field_validator("upvotes_count", mode="before")
    @classmethod
    def upvotes_not_null(cls, v):
        return 0 if v is None else int(v)

    @field_validator("score", mode="before")
    @classmethod
    def score_not_null(cls, v):
        return 0.0 if v is None else float(v)

    @field_validator("status", mode="before")
    @classmethod
    def status_not_empty(cls, v):
        return (v or "PENDING").strip() or "PENDING"

    @field_validator("case_number", mode="before")
    @classmethod
    def case_num_str(cls, v):
        return str(v) if v is not None else v

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )

# Complaint Event Schemas
class ComplaintEvent(BaseModel):
    id: UUID
    complaint_id: UUID
    event_type: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )

class ComplaintSLA(BaseModel):
    complaint_id: UUID
    status: str
    created_at: datetime
    deadline: Optional[datetime] = None
    now: datetime
    total_hours_open: float
    hours_remaining: Optional[float] = None
    breached: bool
    progress_pct: float

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

# Response Schemas
class ResponseBase(BaseModel):
    content: str
    complaint_id: UUID

class ResponseCreate(ResponseBase):
    pass

class Response(ResponseBase):
    id: UUID
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Notification Schemas
class Notification(BaseModel):
    id: UUID
    user_id: str
    type: str
    message: str
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )

# Known Fraudulent Brand Schemas
class KnownFraudulentBrand(BaseModel):
    id: UUID
    url: str
    name: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )

# API Key Schemas
class APIKeyCreate(BaseModel):
    name: str

class APIKey(BaseModel):
    id: UUID
    key_hash: str # Hidden in final output usually, but for schema we include it
    user_id: str
    name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )

# API Prediction Schemas
class PredictionRequest(BaseModel):
    amount: float
    ip_address: str
    device_fingerprint: str
    card_last4: str
    num_orders_last_24h: int

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class PredictionResponse(BaseModel):
    risk_score: float
    risk_label: str
    recommendation: str # ALLOW, REVIEW, BLOCK

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

# Analytics Schemas
class BrandSummary(BaseModel):
    brand_name: str
    total_complaints: int
    avg_risk_score: float
    risk_label: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class BrandProfile(BaseModel):
    brand_name: str
    total_complaints: int
    resolved_complaints: int
    resolution_rate: float
    avg_risk_score: float
    risk_label: str
    fraud_type_breakdown: dict[str, int]
    recent_complaints: List[Complaint]
    is_verified: bool = False
    resolution_score: float = 0.0
    unverified_warning: bool = True

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

# Admin Schemas
class StatusUpdate(BaseModel):
    status: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class AdminStats(BaseModel):
    total_complaints: int
    total_users: int
    avg_risk_score: float
    by_status: dict[str, int]
    by_type: dict[str, int]

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class AnalyticsSummary(BaseModel):
    total_complaints: int
    resolved_count: int
    resolution_rate: float
    avg_risk_score: float
    high_risk_count: int
    complaints_by_type: dict[str, int]
    complaints_by_status: dict[str, int]

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class TrendData(BaseModel):
    period_label: str
    count: int
    avg_score: float

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class TopBrand(BaseModel):
    brand_name: str
    count: int
    avg_score: float
    resolved_count: int

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


# ── Dashboard JSON API (snake_case, no camelCase aliases) ─────────────────────


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserStatsLogin(BaseModel):
    active_cases: int
    resolved_cases: int


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class DashboardSummaryOut(BaseModel):
    active_cases: int
    resolved_cases: int
    amount_at_risk: float
    risk_score: int


class ActiveCaseOut(BaseModel):
    case_id: str
    complaint_id: UUID
    title: str
    amount: float
    status: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class ActiveCasesPage(BaseModel):
    items: List[ActiveCaseOut]
    total: int
    page: int
    page_size: int


class FraudCategoryOut(BaseModel):
    type: str
    percentage: float


class ActivityItemOut(BaseModel):
    id: str
    kind: str
    message: str
    case_id: Optional[str] = None
    created_at: datetime


class FraudPredictRequest(BaseModel):
    amount: float = 0.0
    ip_address: str = ""
    device_fingerprint: str = ""
    card_last4: str = ""
    num_orders_last_24h: int = 0
    complaint_id: str | None = None


class FraudPredictResponse(BaseModel):
    risk_score: float
    flagged: bool
    reason: str
