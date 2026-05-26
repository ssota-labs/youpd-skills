-- 016_youtube_comments.sql
--
-- Comment threads collected via commentThreads.list / comments.list. New
-- table — not present in the original youpd schema. Top-level and reply
-- comments share one table; replies use parent_comment_id self-FK to walk
-- the thread tree. `is_top_level` is a denormalized flag so we can index it
-- cheaply for "comments where parent is null" queries.

CREATE TABLE IF NOT EXISTS youtube_comments (
    comment_id           TEXT PRIMARY KEY,
    video_id             TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    parent_comment_id    TEXT REFERENCES youtube_comments(comment_id) ON DELETE CASCADE,
    author_display_name  TEXT,
    author_channel_id    TEXT,
    text_display         TEXT,
    text_original        TEXT,
    like_count           INTEGER,
    published_at         TEXT,
    updated_at_external  TEXT,
    is_top_level         INTEGER NOT NULL CHECK (is_top_level IN (0, 1)),
    total_reply_count    INTEGER NOT NULL DEFAULT 0,
    raw                  TEXT,
    collected_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS youtube_comments_video_published_idx
    ON youtube_comments(video_id, published_at DESC);

CREATE INDEX IF NOT EXISTS youtube_comments_parent_idx
    ON youtube_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS youtube_comments_top_level_idx
    ON youtube_comments(video_id, is_top_level, published_at DESC);
