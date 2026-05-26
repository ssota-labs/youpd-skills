# Route: `research/youtube/curate-references`

> **상태**: 🚧 P1.3 — 스크립트 stub.

DB 에 적재된 영상들 중 "이 기획에 도움이 되는" 것을 레퍼런스로 마킹한다. 평면 구조 (프로젝트 스코프 없음). 출처 검색 세션을 함께 기록해 추적 가능하게.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--video-id` | string (repeatable) | 마킹할 영상 ID |
| `--source-search-session-id` | uuid | (선택) 어느 검색 세션에서 발굴됐는지 |
| `--reason` | string | (선택) 이 영상이 좋은 이유 (자유 텍스트) |

## DB 영향

- write: `youtube_references` (UPSERT on `unique(video_id, source_search_session_id)`)
- read: `youtube_videos` (존재 검증)

## 외부 의존

없음 (DB write only).

## 노트

같은 영상을 다른 검색 세션에서 또 마킹하면 별도 행이 된다 (`source_search_session_id` 가 다르므로). 분류 축 매핑은 별도 라우트(`analyze-title`/`analyze-thumbnail`) 에서.
