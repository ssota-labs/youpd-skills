# Route: `research/youtube/snapshot-video`

> **상태**: 미지원 — 단독 스냅샷 라우트는 제공하지 않는다. `search-by-keyword` / `fetch-channel-videos` 수집 경로에 통합됨.

지정 영상의 현 시점 수치(view/like/comment)를 `youtube_video_snapshots` 에 1행 INSERT.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--video-id` | string (repeatable) | 대상 영상 ID |
| `--snapshot-date` | YYYY-MM-DD | (기본 오늘 UTC) |

## DB 영향

- write: `youtube_video_snapshots` (UPSERT on `unique(snapshot_date, video_id)`), `api_call_audits`
- read: `youtube_videos` (존재 검증)

## 외부 의존

YouTube Data API v3 — `videos.list?part=statistics` (1 unit, 50 ID batch)
