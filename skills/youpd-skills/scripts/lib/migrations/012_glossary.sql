-- 012_glossary.sql — P1.4 classification glossary tables

CREATE TABLE IF NOT EXISTS glossary_axes (
    id                  TEXT PRIMARY KEY,
    code                TEXT NOT NULL,
    name                TEXT NOT NULL,
    description         TEXT,
    framework_version   TEXT NOT NULL,
    created_at          TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS glossary_axes_code_uidx
    ON glossary_axes(code);

CREATE TABLE IF NOT EXISTS glossary_axis_values (
    id              TEXT PRIMARY KEY,
    axis_id         TEXT NOT NULL REFERENCES glossary_axes(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS glossary_axis_values_axis_code_uidx
    ON glossary_axis_values(axis_id, code);

CREATE INDEX IF NOT EXISTS glossary_axis_values_axis_sort_idx
    ON glossary_axis_values(axis_id, sort_order);

CREATE TABLE IF NOT EXISTS glossary_tags (
    id          TEXT PRIMARY KEY,
    tag         TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS glossary_tags_tag_uidx
    ON glossary_tags(tag);
