# Route: `research/youtube/search-by-keyword`

> **상태**: 🚧 P1.1 — 스크립트 stub.

`add-keyword` 으로 등록된 키워드(`keywordId`) 를 받아 YouTube `search.list` 를 호출, 결과 영상들을 `youtube_videos` 마스터에 적재하고 `youtube_keyword_video_results` 에 N:M 관계로 기록한다. 호출 단위는 1 검색 세션 = `youtube_search_sessions` 1행.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--keyword-id` | uuid | `add-keyword` 가 반환한 ID |
| `--max-results` | number | 페이지 크기 (default 50, max 50 per page) |
| `--pages` | number | 페이지 수 (1~5 권장; 1 페이지 = 100 unit) |
| `--published-after` | ISO 8601 | (선택) 검색 윈도우 |
| `--published-before` | ISO 8601 | (선택) |

## DB 영향

- write: `youtube_search_sessions`, `youtube_videos` (UPSERT), `youtube_channels` (UPSERT, 영상의 채널 마스터 미리 채움), `youtube_keyword_video_results`, `api_call_audits`, `youtube_api_key_daily_usage`, `daily_quota_usage`
- read: `youtube_keywords` (검증 + last_search_session_id 갱신)

## 외부 의존

YouTube Data API v3 — `search.list` (1 페이지 = 100 unit)

## 미결 결정 사항

- 동일 keyword 를 N시간 내 재호출 시 새 세션을 만들지, 기존 세션을 reuse 하고 결과만 union 할지.
- search.list 결과의 `videoId` 만 가지고 `videos.list` 를 추가 호출해 stats 도 채울지, 아니면 본 라우트는 검색 결과만 적재하고 stats 는 별도 `fetch-videos` 라우트로 분리할지.

> P1.1 D2 PRD 에서 확정.
