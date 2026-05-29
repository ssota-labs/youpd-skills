# Route: `research/youtube/analyze-title`

> **상태**: 🚧 P1.4 — agent procedure. 제목 = **§2 `hook-type`** + **`title-shape`** (복수) + **`title-tone`** (단일).

레퍼런스 영상 제목을 PRD §2·§3 프레임워크로 분류한다.

## 선행 조건

- P1.2: `reference_folder_videos`
- Glossary seed: `hook-type`, `title-shape`, `title-tone` ([ADR-006](https://www.notion.so/36f346dac45681e1a028e8f9681ac589))

## 에이전트 절차

1. Notion P1.4 PRD §2·§3 Read.
2. `list-analysis-candidates --kind title`
3. 각 제목: `hook_primary` / `hook_secondary` + `title_shapes[]` + `title_tone` + `reasoning`
4. `save-title-analysis` (D3 contract)

## 저장 필드 (요약)

| 필드 | 축 |
|---|---|
| `hook_primary`, `hook_secondary` | `hook-type` |
| `title_shapes_json` | `title-shape` (0+) |
| `title_tone` | `title-tone` |
| `reasoning`, `free_tags_json` | — |

## 제목·썸네일 조합

제목만 저장한다. 썸네일 분석 후 **§5-6 `title-thumbnail-alignment`** 는 `save-thumbnail-analysis` 쪽에서 기록 (PRD S5).

## 외부 의존

없음 (에이전트 reasoning).
