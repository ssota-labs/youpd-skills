-- 015_youtube_video_transcripts.sql — P1.5 transcript persistence

CREATE TABLE IF NOT EXISTS youtube_video_transcripts (
    video_id        TEXT PRIMARY KEY REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
    source          TEXT NOT NULL
        CHECK (source IN ('youtube_captions', 'timedtext', 'asr_whisper', 'manual_paste')),
    language        TEXT NOT NULL,
    full_text       TEXT NOT NULL,
    segments_json   TEXT NOT NULL DEFAULT '[]',
    fetched_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS youtube_video_transcripts_source_idx
    ON youtube_video_transcripts(source);

CREATE INDEX IF NOT EXISTS youtube_video_transcripts_fetched_at_idx
    ON youtube_video_transcripts(fetched_at DESC);
