-- 001_workspace.sql
--
-- Cross-platform workspace metadata. Exactly one row (id=1) records the
-- creation timestamp and the schema label this workspace was bootstrapped
-- with. The CHECK on id guarantees we cannot accidentally create a second
-- row.

CREATE TABLE IF NOT EXISTS workspace_meta (
    id                   INTEGER PRIMARY KEY CHECK (id = 1),
    created_at           TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    schema_version_label TEXT    NOT NULL
);
