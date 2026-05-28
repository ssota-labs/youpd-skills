-- 010_youtube_collection.sql
--
-- P1.1 YouTube collection domain: keywords, channels, videos, search sessions,
-- snapshots, snapshot-linked scores, hot videos, quota audit.

CREATE TABLE IF NOT EXISTS youtube_keywords (
    id                              TEXT PRIMARY KEY,
    keyword                         TEXT NOT NULL,
    normalized_keyword              TEXT NOT NULL,
    region_code                     TEXT NOT NULL DEFAULT 'KR',
    ttl_hours                       INTEGER NOT NULL DEFAULT 24,
    initial_target_count            INTEGER NOT NULL DEFAULT 500,
    cache_expires_at                TEXT,
    last_search_session_id          TEXT,
    last_incremental_session_id       TEXT,
    last_incremental_published_at     TEXT,
    initial_collection_completed_at TEXT,
    created_at                      TEXT NOT NULL,
    updated_at                      TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_keywords_normalized_region_uidx
    ON youtube_keywords(normalized_keyword, region_code);

CREATE TABLE IF NOT EXISTS youtube_channels (
    channel_id              TEXT PRIMARY KEY,
    title                   TEXT NOT NULL,
    description             TEXT,
    handle                  TEXT,
    custom_url              TEXT,
    country                 TEXT,
    published_at            TEXT,
    thumbnail_url           TEXT,
    subscriber_count        INTEGER,
    hidden_subscriber_count INTEGER CHECK (hidden_subscriber_count IN (0, 1)),
    total_view_count        INTEGER,
    video_count             INTEGER,
    average_view_count      REAL,
    uploads_playlist_id     TEXT,
    raw                     TEXT NOT NULL,
    collected_at            TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS youtube_channels_collected_at_idx
    ON youtube_channels(collected_at DESC);

CREATE TABLE IF NOT EXISTS youtube_videos (
    video_id         TEXT PRIMARY KEY,
    channel_id       TEXT NOT NULL REFERENCES youtube_channels(channel_id),
    title            TEXT NOT NULL,
    description      TEXT,
    published_at     TEXT,
    duration_sec     INTEGER,
    category_id      TEXT,
    default_language TEXT,
    thumbnail_url    TEXT,
    view_count       INTEGER,
    like_count       INTEGER,
    comment_count    INTEGER,
    raw              TEXT NOT NULL,
    collected_at     TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS youtube_videos_channel_published_idx
    ON youtube_videos(channel_id, published_at DESC);

CREATE INDEX IF NOT EXISTS youtube_videos_published_at_idx
    ON youtube_videos(published_at DESC);

CREATE TABLE IF NOT EXISTS youtube_search_sessions (
    id                           TEXT PRIMARY KEY,
    route                        TEXT NOT NULL CHECK (route IN ('search-by-keyword', 'search-channels', 'fetch-channel', 'fetch-channel-videos')),
    keyword_id                   TEXT REFERENCES youtube_keywords(id),
    query                        TEXT,
    region_code                  TEXT,
    mode                         TEXT CHECK (mode IN ('initial', 'incremental', 'manual-refresh')),
    order_by                     TEXT NOT NULL DEFAULT 'date' CHECK (order_by = 'date'),
    published_after              TEXT,
    published_before             TEXT,
    target_count                 INTEGER,
    max_results                  INTEGER,
    pages_requested              INTEGER,
    pages_fetched                INTEGER,
    cache_hit                    INTEGER NOT NULL DEFAULT 0 CHECK (cache_hit IN (0, 1)),
    units_consumed               INTEGER NOT NULL DEFAULT 0,
    result_count                 INTEGER NOT NULL DEFAULT 0,
    new_video_count              INTEGER NOT NULL DEFAULT 0,
    skipped_existing_video_count INTEGER NOT NULL DEFAULT 0,
    raw_params                   TEXT NOT NULL,
    started_at                   TEXT NOT NULL,
    completed_at                 TEXT
);

CREATE TABLE IF NOT EXISTS youtube_keyword_video_results (
    session_id TEXT NOT NULL REFERENCES youtube_search_sessions(id) ON DELETE CASCADE,
    keyword_id TEXT NOT NULL REFERENCES youtube_keywords(id),
    video_id   TEXT NOT NULL REFERENCES youtube_videos(video_id),
    position   INTEGER NOT NULL,
    raw        TEXT NOT NULL,
    PRIMARY KEY (session_id, video_id)
);

CREATE TABLE IF NOT EXISTS youtube_keyword_channel_results (
    session_id TEXT NOT NULL REFERENCES youtube_search_sessions(id) ON DELETE CASCADE,
    keyword_id TEXT REFERENCES youtube_keywords(id),
    channel_id TEXT NOT NULL REFERENCES youtube_channels(channel_id),
    position   INTEGER NOT NULL,
    raw        TEXT NOT NULL,
    PRIMARY KEY (session_id, channel_id)
);

CREATE TABLE IF NOT EXISTS youtube_video_snapshots (
    video_id      TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    collected_at  TEXT NOT NULL,
    view_count    INTEGER,
    like_count    INTEGER,
    comment_count INTEGER,
    raw           TEXT,
    PRIMARY KEY (video_id, collected_at)
);

CREATE TABLE IF NOT EXISTS youtube_channel_snapshots (
    channel_id           TEXT NOT NULL REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
    collected_at         TEXT NOT NULL,
    subscriber_count     INTEGER,
    total_view_count     INTEGER,
    video_count          INTEGER,
    average_view_count   REAL,
    raw                  TEXT,
    PRIMARY KEY (channel_id, collected_at)
);

CREATE TABLE IF NOT EXISTS youtube_video_scores (
    video_id                      TEXT NOT NULL,
    video_snapshot_collected_at   TEXT NOT NULL,
    channel_id                    TEXT NOT NULL,
    channel_snapshot_collected_at TEXT NOT NULL,
    policy_version                TEXT NOT NULL DEFAULT 'youpd-score-v1.0-p1.1',
    computed_at                   TEXT NOT NULL,
    performance_ratio             REAL,
    performance_grade             TEXT NOT NULL CHECK (performance_grade IN ('Worst', 'Bad', 'Normal', 'Good', 'Great', 'Unknown')),
    contribution_ratio            REAL,
    contribution_grade            TEXT NOT NULL CHECK (contribution_grade IN ('Worst', 'Bad', 'Normal', 'Good', 'Great', 'Unknown')),
    length_weight                 REAL,
    length_adjusted_score         REAL,
    inputs_json                   TEXT NOT NULL,
    PRIMARY KEY (video_id, video_snapshot_collected_at, policy_version),
    FOREIGN KEY (video_id, video_snapshot_collected_at)
        REFERENCES youtube_video_snapshots(video_id, collected_at),
    FOREIGN KEY (channel_id, channel_snapshot_collected_at)
        REFERENCES youtube_channel_snapshots(channel_id, collected_at)
);

CREATE TABLE IF NOT EXISTS youtube_hot_videos (
    hot_date                      TEXT NOT NULL,
    region_code                   TEXT NOT NULL DEFAULT 'KR',
    video_id                      TEXT NOT NULL REFERENCES youtube_videos(video_id),
    source                        TEXT NOT NULL DEFAULT 'keyword_promoted',
    min_grade                     TEXT NOT NULL DEFAULT 'Good',
    rank                          INTEGER NOT NULL,
    length_adjusted_score         REAL,
    video_snapshot_collected_at   TEXT NOT NULL,
    score_policy_version          TEXT NOT NULL,
    created_at                    TEXT NOT NULL,
    FOREIGN KEY (video_id, video_snapshot_collected_at, score_policy_version)
        REFERENCES youtube_video_scores(video_id, video_snapshot_collected_at, policy_version)
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_hot_videos_unique_idx
    ON youtube_hot_videos(hot_date, region_code, video_id, source);

CREATE TABLE IF NOT EXISTS api_call_audits (
    id                  TEXT PRIMARY KEY,
    route               TEXT NOT NULL,
    operation           TEXT NOT NULL,
    units_consumed      INTEGER NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
    error_code          TEXT,
    api_key_label       TEXT NOT NULL DEFAULT 'env',
    api_key_fingerprint TEXT,
    started_at          TEXT NOT NULL,
    completed_at        TEXT NOT NULL,
    raw_error           TEXT
);

CREATE TABLE IF NOT EXISTS daily_quota_usage (
    quota_date          TEXT NOT NULL,
    api_key_label       TEXT NOT NULL DEFAULT 'env',
    api_key_fingerprint TEXT,
    units_consumed      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (quota_date, api_key_label)
);
