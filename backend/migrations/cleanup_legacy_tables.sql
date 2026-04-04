-- Optional: remove tables that are not used by the current app models.
-- Safe to run if these tables exist and are empty or unneeded.

DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS analytics_snapshots CASCADE;

-- If you previously created duplicate auth tables via SQLAlchemy (`user`, `account`, `session`)
-- and have migrated to the single `users` table (see init.sql), you can drop the old tables:
-- DROP TABLE IF EXISTS "session" CASCADE;
-- DROP TABLE IF EXISTS account CASCADE;
-- DROP TABLE IF EXISTS "user" CASCADE;
