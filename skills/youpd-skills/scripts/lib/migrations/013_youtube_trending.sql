-- 013_youtube_trending.sql
--
-- Daily trending (mostPopular chart) snapshots. Renamed from
-- `youtube_hot_videos` to `youtube_trending` per Phase 1 D3 §3.
-- Unique key uses COALESCE(category_id, '') so that "no category filter"
-- and "category X" coexist as distinct rows for the same date+region.

CREATE TABLE IF NOT EXISTS youtube_trending (
    id           TEXT PRIMARY KEY,
    hot_date     TEXT NOT NULL,
    region_code  TEXT NOT NULL DEFAULT 'KR',
    category_id  TEXT,
    video_id     TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    rank         INTEGER NOT NULL,
    source       TEXT NOT NULL DEFAULT 'youtube_trending',
    collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_trending_unique_idx
    ON youtube_trending(hot_date, region_code, COALESCE(category_id, ''), video_id, source);

CREATE INDEX IF NOT EXISTS youtube_trending_date_idx
    ON youtube_trending(hot_date DESC, region_code);

CREATE INDEX IF NOT EXISTS youtube_trending_video_idx
    ON youtube_trending(video_id);
