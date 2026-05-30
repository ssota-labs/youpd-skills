-- 013_title_thumbnail_analysis.sql — P1.4 analysis persistence

CREATE TABLE IF NOT EXISTS youtube_title_analyses (
    id                  TEXT PRIMARY KEY,
    video_id            TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    hook_primary        TEXT NOT NULL,
    hook_secondary      TEXT,
    title_shapes_json   TEXT NOT NULL DEFAULT '[]',
    title_tone          TEXT NOT NULL,
    reasoning           TEXT NOT NULL,
    free_tags_json      TEXT NOT NULL DEFAULT '[]',
    framework_version   TEXT NOT NULL,
    analyzed_at         TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_title_analyses_video_uidx
    ON youtube_title_analyses(video_id);

CREATE INDEX IF NOT EXISTS youtube_title_analyses_hook_primary_idx
    ON youtube_title_analyses(hook_primary);

CREATE TABLE IF NOT EXISTS youtube_thumbnail_analyses (
    id                      TEXT PRIMARY KEY,
    video_id                TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    visual_hierarchy        TEXT NOT NULL,
    text_density            TEXT NOT NULL,
    face_treatment          TEXT,
    felt_emotion            TEXT NOT NULL,
    alignment_with_title    TEXT,
    alignment_reasoning     TEXT,
    reasoning               TEXT NOT NULL,
    free_tags_json          TEXT NOT NULL DEFAULT '[]',
    framework_version       TEXT NOT NULL,
    thumbnail_url_used      TEXT,
    analyzed_at             TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_thumbnail_analyses_video_uidx
    ON youtube_thumbnail_analyses(video_id);

CREATE INDEX IF NOT EXISTS youtube_thumbnail_analyses_felt_emotion_idx
    ON youtube_thumbnail_analyses(felt_emotion);

CREATE TABLE IF NOT EXISTS youtube_reference_classifications (
    id              TEXT PRIMARY KEY,
    video_id        TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    axis_value_id   TEXT NOT NULL REFERENCES glossary_axis_values(id) ON DELETE CASCADE,
    source          TEXT NOT NULL DEFAULT 'agent'
        CHECK (source IN ('agent', 'user')),
    analysis_kind   TEXT NOT NULL DEFAULT 'title'
        CHECK (analysis_kind IN ('title', 'thumbnail', 'intro')),
    created_at      TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_reference_classifications_video_axis_uidx
    ON youtube_reference_classifications(video_id, axis_value_id);

CREATE INDEX IF NOT EXISTS youtube_reference_classifications_video_idx
    ON youtube_reference_classifications(video_id);
