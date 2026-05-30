-- 016_youtube_intro_analyses.sql — P1.5 intro analysis persistence

CREATE TABLE IF NOT EXISTS youtube_intro_analyses (
    id                      TEXT PRIMARY KEY,
    video_id                TEXT NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    window_sec              INTEGER NOT NULL,
    intro_hook_primary      TEXT NOT NULL,
    intro_hook_secondary    TEXT,
    intro_structure         TEXT NOT NULL,
    pacing_signal           TEXT NOT NULL,
    reward_burden_balance   TEXT NOT NULL,
    reasoning               TEXT NOT NULL,
    free_tags_json          TEXT NOT NULL DEFAULT '[]',
    framework_version       TEXT NOT NULL,
    analyzed_at             TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_intro_analyses_video_uidx
    ON youtube_intro_analyses(video_id);

CREATE INDEX IF NOT EXISTS youtube_intro_analyses_hook_primary_idx
    ON youtube_intro_analyses(intro_hook_primary);

CREATE INDEX IF NOT EXISTS youtube_intro_analyses_intro_structure_idx
    ON youtube_intro_analyses(intro_structure);
