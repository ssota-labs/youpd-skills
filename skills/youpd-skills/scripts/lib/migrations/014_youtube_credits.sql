-- 014_youtube_credits.sql
--
-- BYOK API key pool + per-key daily usage + global daily quota + a flat
-- audit log of every YouTube API call. The original youpd table named
-- `search_sessions` (per-call audit) was renamed to `api_call_audits` so it
-- doesn't shadow the higher-level "user search session" concept (see
-- `youtube_search_sessions` in 012).

CREATE TABLE IF NOT EXISTS youtube_api_keys (
    id              TEXT PRIMARY KEY,
    label           TEXT NOT NULL UNIQUE,
    key             TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'disabled', 'exhausted')),
    disabled_reason TEXT,
    last_used_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS youtube_api_keys_status_idx
    ON youtube_api_keys(status, last_used_at);

CREATE TABLE IF NOT EXISTS youtube_api_key_daily_usage (
    key_id          TEXT NOT NULL REFERENCES youtube_api_keys(id) ON DELETE CASCADE,
    usage_day       TEXT NOT NULL,
    units_consumed  INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'quota_exceeded')),
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key_id, usage_day)
);

CREATE INDEX IF NOT EXISTS youtube_api_key_daily_usage_day_idx
    ON youtube_api_key_daily_usage(usage_day DESC);

CREATE TABLE IF NOT EXISTS daily_quota_usage (
    usage_day      TEXT PRIMARY KEY,
    units_consumed INTEGER NOT NULL DEFAULT 0,
    updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_call_audits (
    id                TEXT PRIMARY KEY,
    occurred_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operation         TEXT NOT NULL,
    keyword           TEXT,
    video_ids         TEXT,
    channel_id        TEXT,
    result_count      INTEGER,
    units_consumed    INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'success'
                          CHECK (status IN ('success', 'error', 'quota_exceeded')),
    error_reason      TEXT,
    api_key_id        TEXT REFERENCES youtube_api_keys(id) ON DELETE SET NULL,
    search_session_id TEXT REFERENCES youtube_search_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS api_call_audits_occurred_idx
    ON api_call_audits(occurred_at DESC);

CREATE INDEX IF NOT EXISTS api_call_audits_search_session_idx
    ON api_call_audits(search_session_id);

CREATE INDEX IF NOT EXISTS api_call_audits_operation_idx
    ON api_call_audits(operation, occurred_at DESC);
