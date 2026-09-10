-- Align PostgreSQL public schema with backend/models.py (SQLAlchemy).
-- Safe to re-run: uses IF NOT EXISTS / guarded DO blocks where applicable.

BEGIN;

-- Missing columns on complaints (see models.Complaint)
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS platform VARCHAR;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS order_id VARCHAR;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0.0;

-- Backfill case_number (model: unique, not null)
UPDATE complaints SET case_number = 'FC-' || REPLACE(id::text, '-', '') WHERE case_number IS NULL;

-- Ensure FK targets exist for user_id / claimed_by references
INSERT INTO users (id, name, role)
SELECT DISTINCT s.uu, 'Legacy import', 'CUSTOMER'
FROM (
  SELECT user_id::uuid AS uu FROM complaints WHERE user_id IS NOT NULL
  UNION
  SELECT user_id::uuid FROM complaint_votes WHERE user_id IS NOT NULL
  UNION
  SELECT user_id::uuid FROM notifications WHERE user_id IS NOT NULL
  UNION
  SELECT user_id::uuid FROM api_keys WHERE user_id IS NOT NULL
) s
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.uu);

ALTER TABLE complaint_votes DROP CONSTRAINT IF EXISTS user_complaint_vote_unique;

ALTER TABLE complaint_votes ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE complaints ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE notifications ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE api_keys ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE brands ALTER COLUMN claimed_by TYPE uuid USING (claimed_by::uuid);

CREATE UNIQUE INDEX IF NOT EXISTS user_complaint_vote_unique ON complaint_votes (user_id, complaint_id);

CREATE UNIQUE INDEX IF NOT EXISTS complaints_case_number_key ON complaints (case_number);
ALTER TABLE complaints ALTER COLUMN case_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_user_id_fkey') THEN
    ALTER TABLE complaints ADD CONSTRAINT complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_votes_user_id_fkey') THEN
    ALTER TABLE complaint_votes ADD CONSTRAINT complaint_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_user_id_fkey') THEN
    ALTER TABLE api_keys ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_claimed_by_fkey') THEN
    ALTER TABLE brands ADD CONSTRAINT brands_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES users(id);
  END IF;
END $$;
-- =========================================================
-- INCIDENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    brand_id UUID
        REFERENCES brands(id),

    order_id TEXT,

    amount DOUBLE PRECISION DEFAULT 0.0,

    occurred_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_incidents_brand_id
    ON incidents(brand_id);

CREATE INDEX IF NOT EXISTS ix_incidents_order_id
    ON incidents(order_id);

CREATE INDEX IF NOT EXISTS ix_incidents_created_at
    ON incidents(created_at);


-- =========================================================
-- CASE OUTCOMES / LIFECYCLE
-- =========================================================

CREATE TABLE IF NOT EXISTS case_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    outcome VARCHAR NOT NULL,

    reason TEXT,

    recorded_by UUID NOT NULL
        REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_case_outcomes_incident_id
    ON case_outcomes(incident_id);

CREATE INDEX IF NOT EXISTS ix_case_outcomes_recorded_by
    ON case_outcomes(recorded_by);

CREATE INDEX IF NOT EXISTS ix_case_outcomes_created_at
    ON case_outcomes(created_at);


-- =========================================================
-- INCIDENT ↔ COMPLAINT
-- =========================================================

CREATE TABLE IF NOT EXISTS incident_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    complaint_id UUID NOT NULL
        REFERENCES complaints(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT incident_complaint_unique
        UNIQUE (incident_id, complaint_id),

    CONSTRAINT one_incident_per_complaint
        UNIQUE (complaint_id)
);

CREATE INDEX IF NOT EXISTS ix_incident_complaints_incident_id
    ON incident_complaints(incident_id);

CREATE INDEX IF NOT EXISTS ix_incident_complaints_complaint_id
    ON incident_complaints(complaint_id);



COMMIT;
