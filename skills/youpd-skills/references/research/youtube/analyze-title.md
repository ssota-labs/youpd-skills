# Route: `research/youtube/analyze-title`

> **상태**: 🚧 P1.4 — agent procedure (Notion PRD/D3). **제목 = `hook-type` 분석만** — `title-shape` / `title-tone` 축 없음.

레퍼런스 영상 제목을 PRD §2 **후크 유형**으로 분류한다. 형식·어조는 별도 enum이 아니라 후크 선택 **근거**를 `reasoning`에 적는다.

## 선행 조건

- P1.2: `reference_folder_videos`에 대상 영상 존재
- Migration seed: `hook-type` axis ([ADR-006](https://www.notion.so/36f346dac45681e1a028e8f9681ac589))

## 에이전트 절차

1. `references/research/youtube/INDEX.md` 및 Notion P1.4 PRD §2·§3 Read.
2. `list-analysis-candidates --kind title` 로 미분석 `video_id` 목록 (또는 폴더 지정).
3. 각 제목에 대해 `hook_primary` + optional `hook_secondary` + `reasoning` 결정.
4. `save-title-analysis` 또는 `db/exec`로 `youtube_title_analyses` INSERT.

## 계획된 저장 필드

| 필드 | 설명 |
|---|---|
| `hook_primary` | `hook-type` code (필수) |
| `hook_secondary` | 보조 후크 또는 NULL |
| `reasoning` | 1~2문장 근거 |
| `free_tags_json` | enum 밖 뉘앙스만 |
| `framework_version` | `youpd-classification-framework-v0` |

## DB 영향

- write: `youtube_title_analyses`
- read: `youtube_videos.title`, `reference_folder_videos`, `glossary_axis_values` (`hook-type`)

## 외부 의존

없음 (에이전트 reasoning). BYOK LLM 라우트 **아님**.
