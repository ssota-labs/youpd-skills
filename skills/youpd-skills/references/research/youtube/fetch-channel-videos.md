# Route: `research/youtube/fetch-channel-videos`

> **상태**: 🚧 P1.1 — 스크립트 stub.

채널의 `uploads` 플레이리스트를 따라가 영상 목록을 일괄 적재한다. `playlistItems.list` 로 ID 수집 → `videos.list` (50개 배치) 로 stats 까지 채움.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--channel-id` | string | UC 로 시작 |
| `--max-videos` | number | 가져올 영상 수 상한 (기본 100) |
| `--published-after` | ISO 8601 | (선택) 이 시점 이후 영상만 |

## DB 영향

- write: `youtube_videos` (UPSERT), `api_call_audits`
- read: `youtube_channels.uploads_playlist_id`

## 외부 의존

YouTube Data API v3 — `playlistItems.list` (1 unit) + `videos.list` (1 unit, 50 ID/batch)

## 노트

`playlistItems.list` 는 시간 역순(신영상 먼저) 으로 페이지네이션. `--max-videos` 도달하거나 `--published-after` 미만으로 떨어지면 중단.
