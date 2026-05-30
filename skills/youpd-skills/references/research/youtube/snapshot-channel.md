# Route: `research/youtube/snapshot-channel`

> **상태**: 미지원 — 단독 스냅샷 라우트는 제공하지 않는다. `fetch-channel` 수집 경로에 통합됨.

지정 채널의 현 시점 수치(구독자/총조회수/영상수)를 `youtube_channel_snapshots` 에 1행 INSERT. 같은 (snapshot_date, channel_id) 가 이미 있으면 update.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--channel-id` | string (repeatable) | 대상 채널 ID |
| `--snapshot-date` | YYYY-MM-DD | (기본 오늘 UTC) |

## DB 영향

- write: `youtube_channel_snapshots` (UPSERT on `unique(snapshot_date, channel_id)`), `api_call_audits`
- read: `youtube_channels` (존재 검증)

## 외부 의존

YouTube Data API v3 — `channels.list?part=statistics` (1 unit, 50 ID batch)

## 노트

`hidden_subscriber_count = 1` 인 채널은 `subscriber_count = NULL` 로 기록.
