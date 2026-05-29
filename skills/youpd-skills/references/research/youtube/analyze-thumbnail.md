# Route: `research/youtube/analyze-thumbnail`

> **상태**: 🚧 P1.4 — agent procedure (Notion PRD/D3). 시각 축 + **`thumbnail-emotion`** (느껴지는 감정).

레퍼런스 썸네일을 에이전트 멀티모달로 보고 분류한다. 외부 vision API 없음.

## 선행 조건

- `youtube_videos.thumbnail_url` 존재
- Glossary seed: `visual-hierarchy`, `text-density`, `face-treatment`, **`thumbnail-emotion`** ([ADR-006](https://www.notion.so/36f346dac45681e1a028e8f9681ac589))

## 에이전트 절차

1. Notion P1.4 PRD §4 Read.
2. `list-analysis-candidates --kind thumbnail` 로 미분석 목록.
3. 썸네일 URL을 view/fetch 후 분류:
   - `visual_hierarchy`, `text_density`, optional `face_treatment`
   - **`felt_emotion`** — 시청자가 느끼는 **주된 감정** (PRD §4-4, 단일 enum)
4. `save-thumbnail-analysis` 또는 `db/exec`로 INSERT.

## 계획된 저장 필드

| 필드 | 축 |
|---|---|
| `visual_hierarchy` | `visual-hierarchy` |
| `text_density` | `text-density` |
| `face_treatment` | `face-treatment` (선택) |
| `felt_emotion` | **`thumbnail-emotion`** (필수) |
| `alignment_with_title` | **`title-thumbnail-alignment`** (제목 분석이 있을 때 필수) |
| `alignment_reasoning` | 정합성 1문장 (선택) |
| `reasoning` | 썸네일 분류 근거 |
| `free_tags_json` | 색상·구도·보조 감정 등 |

## 제목·썸네일 조합 (§5-6)

같은 `video_id`에 `youtube_title_analyses`가 있으면, 저장 전에 후크·tone·shape vs 시각·`felt_emotion`을 비교해 `alignment_with_title`을 부여한다 (`aligned` / `partial` / `mismatched` / `title-led` / `thumbnail-led`). S5·폴더 교차표 보고는 PRD §7.

## DB 영향

- write: `youtube_thumbnail_analyses`
- read: `youtube_videos.thumbnail_url`, `glossary_*`

## 외부 의존

썸네일 HTTP fetch만 (API key 불필요). BYOK LLM **아님**.
