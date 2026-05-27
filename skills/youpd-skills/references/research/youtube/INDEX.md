# YouTube 리서치 라우트 인덱스 (Phase 1)

> Phase 1 의 YouTube 도메인 라우트 14개를 한눈에 본다. 사용자 의도 → 라우트 매핑 + 권장 호출 순서.
> 개별 라우트 상세는 같은 폴더의 `<route>.md` 파일을 추가 Read 로 진입한다.

## Phase 1 의 의미 흐름

```
add-keyword                    [P1.1]  키워드 마스터 등록
       │
       ▼
search-by-keyword              [P1.1]  search.list → 영상·검색세션·결과 N:M 적재
search-channels                [P1.1]  search.list?type=channel
fetch-channel                  [P1.1]  channels.list 단건/배치
fetch-channel-videos           [P1.1]  playlistItems + videos.list 일괄
fetch-trending                 [P1.1]  videos.list?chart=mostPopular
       │
       ▼
snapshot-channel / snapshot-video  [P1.2]  시점별 수치 스냅샷
       │
       ▼
curate-references / list-references [P1.3]  좋은 레퍼런스 마킹
       │
       ▼
analyze-title / analyze-thumbnail   [P1.4]  멀티모달 LLM 분석
       │
       ▼
fetch-transcript / analyze-intro    [P1.5]  자막 + 도입부 후크 분석
```

## 라우트 매핑

| 라우트 | 사용자 의도 (예시) | 의존 (DB) | 외부 의존 |
|---|---|---|---|
| `add-keyword.md` | "트래블블로그 키워드 등록해줘" | `youtube_keywords` | none |
| `search-by-keyword.md` | "트래블블로그로 영상 50개 찾아줘" | keywords + sessions + videos + results | YouTube Data API (search) |
| `search-channels.md` | "트래블블로그 관련 채널 찾아줘" | channels | YouTube Data API (search?type=channel) |
| `fetch-channel.md` | "이 채널 정보 다 가져와줘" | channels | YouTube Data API (channels) |
| `fetch-channel-videos.md` | "이 채널 영상 100개 다 가져와줘" | channels + videos | YouTube Data API (playlistItems + videos) |
| `fetch-trending.md` | "오늘 한국 게임 카테고리 트렌딩 가져와줘" | trending + videos | YouTube Data API (videos?chart=mostPopular) |
| `snapshot-channel.md` | "이 채널 구독자 수 지금 찍어둬" | channel_snapshots | YouTube Data API (channels) |
| `snapshot-video.md` | "이 영상 조회수 지금 찍어둬" | video_snapshots | YouTube Data API (videos) |
| `curate-references.md` | "이 영상들 레퍼런스로 추가해줘" | references | none |
| `list-references.md` | "이 키워드 레퍼런스 목록 보여줘" | references (read) | none |
| `analyze-title.md` | "레퍼런스 제목 분석해줘" | (P1.4 신규 테이블) | LLM |
| `analyze-thumbnail.md` | "썸네일 시각 구성 분류해줘" | (P1.4 신규 테이블) | LLM (멀티모달) |
| `fetch-transcript.md` | "이 영상 자막 가져와줘" | (P1.5 신규 테이블) | YouTube transcript / ASR |
| `analyze-intro.md` | "도입부 후크 분석해줘" | (P1.5 신규 테이블) | LLM |

## 모든 라우트 공통 규약

- **API 키**: 외부 의존 컬럼이 있는 라우트는 진입 직전 `YOUTUBE_API_KEY` (또는 LLM 키) 환경변수를 검증한다. 없으면 즉시 거절.
- **API 호출 감사**: YouTube Data API 호출은 **반드시** `youtube_credits` 도메인의 `api_call_audits` 테이블에 1행씩 기록한다 (operation, units_consumed, status). 이 기록 없이 API 를 부르면 안 된다.
- **원본 보존**: 외부 API 응답의 raw payload 는 반드시 `raw` (TEXT, JSON 직렬화) 컬럼에 그대로 보존한다. 구조화 컬럼은 raw 의 derived view 일 뿐이다.
- **시간**: 모든 timestamp 컬럼은 ISO 8601 UTC 문자열 (`2026-05-26T05:00:00.000Z`).
- **UUID**: PK 가 UUID 인 행은 앱에서 `crypto.randomUUID()` 로 생성해 넣는다 (SQLite 내장 X).

## 권장 호출 순서 (사용자가 "이 키워드 분석 시작해줘" 라고만 했을 때)

```
add-keyword
  → search-by-keyword           (영상 풀 확보)
  → fetch-channel + fetch-channel-videos (필요 시 채널 깊이 파기)
  → snapshot-{video,channel}    (현 시점 수치 캡쳐)
  → curate-references           (사용자가 좋은 영상 선별)
  → analyze-title + analyze-thumbnail
  → fetch-transcript + analyze-intro
```

## 구현 상태 (P1.1 시점)

- ✅ DB 스키마: `010_youtube_content`, `011_youtube_snapshots`, `012_youtube_keywords`, `013_youtube_trending`, `014_youtube_credits`, `015_youtube_references`, `016_youtube_comments` 마이그레이션은 P1.0 에서 모두 적용됨.
- ✅ P1.1 수집 스크립트: `add-keyword`, `search-by-keyword`, `search-channels`, `fetch-channel`, `fetch-channel-videos`, `fetch-trending`.
- 🚧 P1.2+ 스크립트: 스냅샷, 큐레이션, 분석 라우트는 이후 마일스톤에서 구현.

> P1.1 라우트는 YouTube Data API 호출 전에 `YOUTUBE_API_KEY` 또는 `youtube_api_keys` 활성 키를 요구한다. 키가 없으면 `.env.example` 안내와 함께 중단한다.
