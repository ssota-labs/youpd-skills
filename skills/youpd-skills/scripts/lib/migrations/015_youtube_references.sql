-- 015_youtube_references.sql
--
-- Curated reference list. New table — the original youpd schema does not
-- have this concept. Flat structure (no project scope per Phase 1 D3 §10).
-- Each "marking" of a video as a reference becomes one row, scoped by the
-- search session it was discovered in (so the same video can be marked
-- multiple times for different research contexts).
--
-- Classification axes are applied via `youtube_reference_classifications`,
-- joining each reference to one or more `glossary_axis_values`.

CREATE TABLE IF NOT EXISTS youtube_references (
    id                        TEXT PRIMARY KEY,
    video_id                  TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    source_search_session_id  TEXT REFERENCES youtube_search_sessions(id) ON DELETE SET NULL,
    marked_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason                    TEXT
);

-- Manual additions (no source session) collapse onto a single row per video
-- because COALESCE turns NULL into '' for uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS youtube_references_unique_idx
    ON youtube_references(video_id, COALESCE(source_search_session_id, ''));

CREATE INDEX IF NOT EXISTS youtube_references_marked_idx
    ON youtube_references(marked_at DESC);

CREATE INDEX IF NOT EXISTS youtube_references_session_idx
    ON youtube_references(source_search_session_id);

CREATE TABLE IF NOT EXISTS youtube_reference_classifications (
    id            TEXT PRIMARY KEY,
    reference_id  TEXT NOT NULL REFERENCES youtube_references(id) ON DELETE CASCADE,
    axis_value_id TEXT NOT NULL REFERENCES glossary_axis_values(id) ON DELETE CASCADE,
    source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
    confidence    REAL,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reference_id, axis_value_id)
);

CREATE INDEX IF NOT EXISTS youtube_reference_classifications_reference_idx
    ON youtube_reference_classifications(reference_id);

CREATE INDEX IF NOT EXISTS youtube_reference_classifications_axis_value_idx
    ON youtube_reference_classifications(axis_value_id);
