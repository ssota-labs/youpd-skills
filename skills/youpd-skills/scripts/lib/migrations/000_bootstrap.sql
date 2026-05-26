-- 000_bootstrap.sql
--
-- The migration ledger. Self-records its own application so the runner can
-- treat every subsequent file uniformly (skip-if-in-ledger, else apply +
-- insert).
--
-- Idempotent by construction:
--   - CREATE TABLE IF NOT EXISTS so re-exec is a no-op for the schema.
--   - INSERT OR IGNORE so re-exec is a no-op for the ledger row.

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_migrations (filename) VALUES ('000_bootstrap.sql');
