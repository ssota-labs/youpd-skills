-- 002_glossary.sql
--
-- Cross-platform classification axes. P1.0 ships the table shapes only;
-- seed values land in a later migration once the v0 axis set has been
-- ratified by ADR (see Phase 1 D3 §10).

CREATE TABLE IF NOT EXISTS glossary_axes (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    scope        TEXT NOT NULL CHECK (scope IN ('global', 'platform')),
    platform_key TEXT,
    description  TEXT,
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS glossary_axes_name_platform_idx
    ON glossary_axes(name, COALESCE(platform_key, ''));

CREATE TABLE IF NOT EXISTS glossary_axis_values (
    id          TEXT PRIMARY KEY,
    axis_id     TEXT NOT NULL REFERENCES glossary_axes(id) ON DELETE CASCADE,
    code        TEXT NOT NULL,
    label       TEXT NOT NULL,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (axis_id, code)
);

CREATE INDEX IF NOT EXISTS glossary_axis_values_axis_idx
    ON glossary_axis_values(axis_id, sort_order);

CREATE TABLE IF NOT EXISTS glossary_tags (
    id         TEXT PRIMARY KEY,
    label      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
