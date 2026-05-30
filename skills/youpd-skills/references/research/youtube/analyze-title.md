# Route: `research/youtube/analyze-title`

> **상태**: 사용 가능 — 에이전트 reasoning + `save-title-analysis` 영속화. **외부 LLM API 없음.**

레퍼런스 영상 제목을 PRD §2·§3 프레임워크(`hook-type` + `title-shape` + `title-tone`)로 분류한다.

## 선행 조건

- P1.2: `reference_folder_videos`에 큐레이션된 영상
- Glossary seed: 마이그레이션 `014_seed_glossary_axes_v0` 적용됨 ([ADR-006](https://www.notion.so/36f346dac45681e1a028e8f9681ac589))

## 에이전트 절차

1. Notion P1.4 PRD §2·§3 Read (후크·shape·tone 정의).
2. 미분석 후보 조회:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/list-analysis-candidates.ts \
  --kind title --folder-id <uuid> --limit 50
```

3. 각 `youtube_videos.title`에 대해 분류:
   - `hook_primary` (+ optional `hook_secondary`) — `hook-type` 16값
   - `title_shapes[]` — `title-shape` (0+)
   - `title_tone` — `title-tone` (1)
   - `reasoning`, 필요 시 `free_tags`
4. 저장:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/save-title-analysis.ts \
  --video-id <id> \
  --hook-primary vicarious \
  --hook-secondary authority \
  --title-shape medium --title-shape with-bracket \
  --title-tone intimate-conversational \
  --reasoning "1인칭 체험 + 권위 인용"
```

재분석: `--reanalyze` (기존 row DELETE 후 INSERT).

## 저장 필드

| 필드 | 축 |
|---|---|
| `hook_primary`, `hook_secondary` | `hook-type` |
| `title_shapes_json` | `title-shape` |
| `title_tone` | `title-tone` |
| `reasoning`, `free_tags_json` | — |

## 제목·썸네일 조합

제목만 저장. 썸네일 분석 후 **§5-6 `title-thumbnail-alignment`** 는 `save-thumbnail-analysis`에서 기록.

## 집계 (폴더 보고)

`db/exec`로 D3 §9-3 패턴 실행 (단일 SELECT만).

## 외부 의존

없음 (에이전트 reasoning).
