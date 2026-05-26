# Route: `research/youtube/list-references`

> **상태**: 🚧 P1.3 — 스크립트 stub.

마킹된 레퍼런스를 조건으로 조회. 키워드/검색세션/기간 등 필터 + 정렬.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--keyword-id` | uuid | (선택) 이 키워드 검색에서 발굴된 레퍼런스만 |
| `--search-session-id` | uuid | (선택) 특정 검색 세션 |
| `--marked-after` | ISO 8601 | (선택) |
| `--limit` | number | 기본 50 |
| `--order` | enum | `marked_desc` / `view_desc` / `subscriber_ratio_desc` |

## DB 영향

- read only: `youtube_references` JOIN `youtube_videos` JOIN `youtube_channels`

## 외부 의존

없음.
