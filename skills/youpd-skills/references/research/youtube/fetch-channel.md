# Route: `research/youtube/fetch-channel`

> **상태**: 🚧 P1.1 — 스크립트 stub.

채널 ID 또는 핸들(`@handle`) 을 받아 `channels.list` 를 호출, `youtube_channels` 마스터에 상세 정보를 채운다. 배치 호출 (한 번에 50개 ID) 지원.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--channel-id` | string (repeatable) | UC 로 시작하는 채널 ID (여러 개 가능) |
| `--handle` | string (repeatable) | `@xxx` 형태의 핸들 (handle → ID 변환 후 channels.list) |
| `--parts` | string[] | API parts (default `snippet,statistics,contentDetails,brandingSettings`) |

## DB 영향

- write: `youtube_channels` (UPSERT all columns), `api_call_audits`
- read: 없음

## 외부 의존

YouTube Data API v3 — `channels.list` (1 호출 = 1 unit; 50개까지 batch)

## 멱등성

이미 적재된 채널을 재호출해도 안전 (UPSERT). `collected_at` 는 매 호출마다 갱신.
