-- 011_reference_curation.sql
--
-- P1.2 reference discovery/curation: folder groups, child folders,
-- minimal discovery audit trail, score-identity curation, and YouTube comments.

CREATE TABLE IF NOT EXISTS reference_folder_groups (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    description    TEXT,
    intent_summary TEXT,
    audience       TEXT,
    seed_theme     TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS reference_folder_groups_name_uidx
    ON reference_folder_groups(name);

CREATE TABLE IF NOT EXISTS reference_folders (
    id             TEXT PRIMARY KEY,
    group_id       TEXT NOT NULL REFERENCES reference_folder_groups(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    consumer_stage TEXT NOT NULL DEFAULT 'unspecified'
        CHECK (consumer_stage IN ('phenomenon', 'desire', 'plan', 'action', 'reward', 'mixed', 'unspecified')),
    description    TEXT,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS reference_folders_group_name_uidx
    ON reference_folders(group_id, name);

CREATE INDEX IF NOT EXISTS reference_folders_group_stage_idx
    ON reference_folders(group_id, consumer_stage, sort_order);

CREATE TABLE IF NOT EXISTS reference_discovery_runs (
    id                               TEXT PRIMARY KEY,
    folder_group_id                  TEXT REFERENCES reference_folder_groups(id) ON DELETE SET NULL,
    request_text                     TEXT,
    audience                         TEXT,
    seed_theme                       TEXT,
    selected_stages_json             TEXT NOT NULL,
    keyword_probe_summary            TEXT,
    executed_search_session_ids_json TEXT NOT NULL DEFAULT '[]',
    created_at                       TEXT NOT NULL,
    completed_at                     TEXT
);

CREATE INDEX IF NOT EXISTS reference_discovery_runs_created_idx
    ON reference_discovery_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS reference_folder_videos (
    folder_id                   TEXT NOT NULL REFERENCES reference_folders(id) ON DELETE CASCADE,
    video_id                     TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    consumer_stage               TEXT NOT NULL DEFAULT 'unspecified'
        CHECK (consumer_stage IN ('phenomenon', 'desire', 'plan', 'action', 'reward', 'mixed', 'unspecified')),
    source_keyword_id            TEXT REFERENCES youtube_keywords(id),
    source_search_session_id     TEXT REFERENCES youtube_search_sessions(id) ON DELETE SET NULL,
    source_hot_date              TEXT,
    video_snapshot_collected_at  TEXT,
    score_policy_version         TEXT,
    discovery_run_id             TEXT REFERENCES reference_discovery_runs(id) ON DELETE SET NULL,
    reason                       TEXT,
    added_at                     TEXT NOT NULL,
    updated_at                   TEXT NOT NULL,
    PRIMARY KEY (folder_id, video_id),
    FOREIGN KEY (video_id, video_snapshot_collected_at, score_policy_version)
        REFERENCES youtube_video_scores(video_id, video_snapshot_collected_at, policy_version)
);

CREATE INDEX IF NOT EXISTS reference_folder_videos_video_idx
    ON reference_folder_videos(video_id);

CREATE INDEX IF NOT EXISTS reference_folder_videos_folder_added_idx
    ON reference_folder_videos(folder_id, added_at DESC);

CREATE INDEX IF NOT EXISTS reference_folder_videos_discovery_idx
    ON reference_folder_videos(discovery_run_id);

CREATE TABLE IF NOT EXISTS youtube_comment_fetch_sessions (
    id               TEXT PRIMARY KEY,
    video_id         TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    folder_id        TEXT REFERENCES reference_folders(id) ON DELETE SET NULL,
    discovery_run_id TEXT REFERENCES reference_discovery_runs(id) ON DELETE SET NULL,
    order_by         TEXT NOT NULL DEFAULT 'relevance' CHECK (order_by IN ('relevance', 'time')),
    max_results      INTEGER NOT NULL,
    result_count     INTEGER NOT NULL DEFAULT 0,
    units_consumed   INTEGER NOT NULL DEFAULT 0,
    raw_params       TEXT NOT NULL,
    started_at       TEXT NOT NULL,
    completed_at     TEXT
);

CREATE INDEX IF NOT EXISTS youtube_comment_fetch_sessions_video_idx
    ON youtube_comment_fetch_sessions(video_id, started_at DESC);

CREATE TABLE IF NOT EXISTS youtube_comments (
    comment_id          TEXT PRIMARY KEY,
    video_id            TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    parent_comment_id   TEXT REFERENCES youtube_comments(comment_id) ON DELETE CASCADE,
    fetch_session_id    TEXT REFERENCES youtube_comment_fetch_sessions(id) ON DELETE SET NULL,
    author_display_name TEXT,
    text_original       TEXT NOT NULL,
    like_count          INTEGER,
    published_at        TEXT,
    updated_at          TEXT,
    collected_at        TEXT NOT NULL,
    raw                 TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS youtube_comments_video_published_idx
    ON youtube_comments(video_id, published_at DESC);

CREATE INDEX IF NOT EXISTS youtube_comments_parent_idx
    ON youtube_comments(parent_comment_id);
