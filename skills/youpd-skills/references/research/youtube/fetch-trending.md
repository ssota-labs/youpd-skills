# Route: `research/youtube/fetch-trending`

> **상태**: 🚧 P1.1 — 스크립트 stub.

`videos.list?chart=mostPopular` 로 일별 트렌딩 결과를 받아 `youtube_trending` 에 일별 스냅샷 형태로 적재. 자동 트리거는 없음 — 사용자 명시 호출만 허용.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--region` | string | regionCode (default `KR`) |
| `--category` | string | (선택) `videoCategoryId` |
| `--max-results` | number | 1~50 (default 50) |
| `--hot-date` | YYYY-MM-DD | 트렌딩 기준일 (기본 오늘 UTC) |

## DB 영향

- write: `youtube_trending` (UPSERT on `unique(hot_date, region, COALESCE(category_id,''), video_id, source)`), `youtube_videos` (UPSERT, snippet+stats), `api_call_audits`
- read: 없음

## 외부 의존

YouTube Data API v3 — `videos.list?chart=mostPopular` (1 unit)
