-- 012_youtube_keywords.sql
--
-- Keyword master + per-keyword search session log + N:M video result link.
-- Renamed from the original `youtube_harvest_sessions` to
-- `youtube_search_sessions` to disambiguate from low-level API call audits
-- (those live in `api_call_audits`, see 014_youtube_credits.sql).

CREATE TABLE IF NOT EXISTS youtube_search_sessions (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL DEFAULT 'keyword',
    query         TEXT,
    status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'success', 'partial_success', 'failed')),
    result_count  INTEGER NOT NULL DEFAULT 0,
    error         TEXT,
    started_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at  TEXT
);

CREATE INDEX IF NOT EXISTS youtube_search_sessions_status_idx
    ON youtube_search_sessions(status, started_at DESC);

CREATE TABLE IF NOT EXISTS youtube_keywords (
    id                       TEXT PRIMARY KEY,
    keyword                  TEXT NOT NULL,
    normalized_keyword       TEXT NOT NULL,
    region_code              TEXT NOT NULL DEFAULT 'KR',
    search_order             TEXT NOT NULL DEFAULT 'relevance'
                                 CHECK (search_order IN ('relevance', 'viewCount', 'date', 'rating')),
    last_search_session_id   TEXT REFERENCES youtube_search_sessions(id) ON DELETE SET NULL,
    last_collected_at        TEXT,
    cache_expires_at         TEXT,
    result_count             INTEGER NOT NULL DEFAULT 0,
    created_at               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (normalized_keyword, region_code, search_order)
);

CREATE INDEX IF NOT EXISTS youtube_keywords_cache_expires_idx
    ON youtube_keywords(cache_expires_at);

CREATE INDEX IF NOT EXISTS youtube_keywords_last_collected_idx
    ON youtube_keywords(last_collected_at DESC);

CREATE TABLE IF NOT EXISTS youtube_keyword_video_results (
    id                  TEXT PRIMARY KEY,
    search_session_id   TEXT NOT NULL REFERENCES youtube_search_sessions(id) ON DELETE CASCADE,
    keyword             TEXT NOT NULL,
    video_id            TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    rank                INTEGER NOT NULL,
    search_order        TEXT NOT NULL DEFAULT 'relevance',
    region_code         TEXT NOT NULL DEFAULT 'KR',
    published_after     TEXT,
    published_before    TEXT,
    collected_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (search_session_id, keyword, video_id)
);

CREATE INDEX IF NOT EXISTS youtube_keyword_video_results_keyword_idx
    ON youtube_keyword_video_results(keyword, rank);

CREATE INDEX IF NOT EXISTS youtube_keyword_video_results_video_idx
    ON youtube_keyword_video_results(video_id);
