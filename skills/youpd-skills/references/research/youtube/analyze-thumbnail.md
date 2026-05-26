# Route: `research/youtube/analyze-thumbnail`

> **상태**: 🚧 P1.4 — 스크립트 stub. **선행 작업**: 분류 축 v0 ADR + `glossary` seed.

레퍼런스 영상의 썸네일을 멀티모달 LLM 으로 분석. 시각 구성, 텍스트 배치, 인물 유무, 색상 톤, 표정·포즈 등.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--reference-id` | uuid (repeatable) | |
| `--llm-provider` | enum | `anthropic` / `openai` |
| `--model` | string | (선택) 멀티모달 지원 모델 |
| `--thumbnail-quality` | enum | `default` / `medium` / `high` / `standard` / `maxres` (기본 `high`) |

## DB 영향

- write: `youtube_thumbnail_analyses` (P1.4 신규), `youtube_reference_classifications`
- read: `youtube_references` JOIN `youtube_videos.thumbnail_url`, `glossary_*`

## 외부 의존

- 썸네일 이미지 fetch (HTTP GET, no API key)
- 멀티모달 LLM (Claude 3.5 Sonnet+ / GPT-4o+ 등). BYOK.
