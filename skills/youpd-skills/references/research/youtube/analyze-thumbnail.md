# Route: `research/youtube/analyze-thumbnail`

> **상태**: 사용 가능 — 에이전트 멀티모달 reasoning + `save-thumbnail-analysis`. **외부 비전/LLM API 없음.**

레퍼런스 썸네일을 PRD §4 프레임워크로 분류한다.

## 선행 조건

- P1.2 레퍼런스 큐레이션
- Glossary seed (`014_seed_glossary_axes_v0`)
- 썸네일 URL: `youtube_videos.thumbnail_url` (에이전트가 직접 이미지 확인)

## 에이전트 절차

1. PRD §4 Read (`visual-hierarchy`, `text-density`, `face-treatment`, `thumbnail-emotion`).
2. 후보 조회:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/list-analysis-candidates.ts \
  --kind thumbnail --folder-id <uuid>
```

3. 썸네일 이미지를 보고 분류 + (제목 분석 있으면) §5-6 정합성.
4. 저장:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/save-thumbnail-analysis.ts \
  --video-id <id> \
  --visual-hierarchy face-dominant \
  --text-density medium \
  --face-treatment expressive-shock \
  --felt-emotion shocked \
  --alignment-with-title aligned \
  --alignment-reasoning "제목 체험담과 표정 일치" \
  --reasoning "얼굴 중심 + 충격 표정" \
  --thumbnail-url-used "https://..."
```

## 저장 필드

| 필드 | 축 |
|---|---|
| `visual_hierarchy` | `visual-hierarchy` |
| `text_density` | `text-density` |
| `face_treatment` | `face-treatment` (선택) |
| `felt_emotion` | `thumbnail-emotion` (**필수**) |
| `alignment_with_title` | `title-thumbnail-alignment` (제목 분석 없으면 NULL 권장) |
| `reasoning`, `free_tags_json` | — |

## 외부 의존

없음 (에이전트가 이미지를 직접 본다). URL fetch 실패 시 해당 영상 스킵 (PRD §8).
