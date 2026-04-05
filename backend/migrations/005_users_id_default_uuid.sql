-- NextAuth @auth/pg-adapter INSERT omits `id`; the column must default or the insert fails.
-- Apply on any database where `users.id` has no default (e.g. legacy / hand-created schema).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
