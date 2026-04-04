-- Run against PostgreSQL when upgrading an existing Fraudchills database.
-- New installs: SQLAlchemy create_all() also creates fraud_logs; this adds columns + indexes safely.

ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

CREATE TABLE IF NOT EXISTS fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    risk_score DOUBLE PRECISION NOT NULL,
    reason TEXT,
    raw_payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_brand_id ON complaints(brand_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_events_complaint_id ON complaint_events(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_events_created_at ON complaint_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_complaint_id ON fraud_logs(complaint_id);
