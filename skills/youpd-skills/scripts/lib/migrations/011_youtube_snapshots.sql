-- 011_youtube_snapshots.sql
--
-- Point-in-time numerical snapshots for videos and channels. Naming dropped
-- the `_metric_` infix from the original youpd schema (Phase 1 D3 §3 naming
-- adjustment). One row per (snapshot_date, target).

CREATE TABLE IF NOT EXISTS youtube_video_snapshots (
    id            TEXT PRIMARY KEY,
    snapshot_date TEXT NOT NULL,
    video_id      TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    view_count    INTEGER,
    like_count    INTEGER,
    comment_count INTEGER,
    source        TEXT NOT NULL DEFAULT 'youtube_api',
    collected_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (snapshot_date, video_id)
);

CREATE INDEX IF NOT EXISTS youtube_video_snapshots_video_idx
    ON youtube_video_snapshots(video_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS youtube_channel_snapshots (
    id               TEXT PRIMARY KEY,
    snapshot_date    TEXT NOT NULL,
    channel_id       TEXT NOT NULL REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
    subscriber_count INTEGER,
    view_count       INTEGER,
    video_count      INTEGER,
    source           TEXT NOT NULL DEFAULT 'youtube_api',
    collected_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (snapshot_date, channel_id)
);

CREATE INDEX IF NOT EXISTS youtube_channel_snapshots_channel_idx
    ON youtube_channel_snapshots(channel_id, snapshot_date DESC);
