-- 010_youtube_content.sql
--
-- YouTube content masters: channels and videos. Translated from the
-- existing youpd PostgreSQL schema (packages/db/src/schema/youtube.ts) into
-- SQLite types per Phase 1 D3 §5:
--
--   text       -> TEXT
--   integer    -> INTEGER
--   bigint     -> INTEGER (SQLite's INTEGER is 64-bit)
--   boolean    -> INTEGER (0/1) with CHECK
--   jsonb      -> TEXT (json1 functions can query)
--   timestamptz-> TEXT (ISO 8601 UTC)
--   text[]     -> TEXT (json array string)

CREATE TABLE IF NOT EXISTS youtube_channels (
    channel_id              TEXT PRIMARY KEY,
    title                   TEXT,
    description             TEXT,
    custom_url              TEXT,
    country                 TEXT,
    published_at            TEXT,
    thumbnail_url           TEXT,
    uploads_playlist_id     TEXT,
    subscriber_count        INTEGER,
    hidden_subscriber_count INTEGER NOT NULL DEFAULT 0 CHECK (hidden_subscriber_count IN (0, 1)),
    view_count              INTEGER,
    video_count             INTEGER,
    raw                     TEXT,
    collected_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS youtube_channels_collected_at_idx
    ON youtube_channels(collected_at DESC);

CREATE TABLE IF NOT EXISTS youtube_videos (
    video_id      TEXT PRIMARY KEY,
    channel_id    TEXT REFERENCES youtube_channels(channel_id) ON DELETE SET NULL,
    title         TEXT,
    description   TEXT,
    thumbnail_url TEXT,
    video_url     TEXT,
    published_at  TEXT,
    duration_sec  INTEGER,
    is_short      INTEGER NOT NULL DEFAULT 0 CHECK (is_short IN (0, 1)),
    view_count    INTEGER,
    like_count    INTEGER,
    comment_count INTEGER,
    category_id   TEXT,
    tags          TEXT,
    raw           TEXT,
    collected_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS youtube_videos_channel_published_idx
    ON youtube_videos(channel_id, published_at DESC);

CREATE INDEX IF NOT EXISTS youtube_videos_published_at_idx
    ON youtube_videos(published_at DESC);

CREATE INDEX IF NOT EXISTS youtube_videos_is_short_idx
    ON youtube_videos(is_short, published_at DESC);
