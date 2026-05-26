# Route: `research/youtube/analyze-intro`

> **상태**: 🚧 P1.5 — 스크립트 stub.

영상 도입부(첫 N초) 자막을 추출해 후크 패턴/구조를 LLM 으로 분류.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--reference-id` | uuid (repeatable) | |
| `--intro-seconds` | number | 분석 구간 (기본 30) |
| `--llm-provider` | enum | `anthropic` / `openai` |

## DB 영향

- write: `youtube_intro_analyses` (P1.5 신규), `youtube_reference_classifications`
- read: `youtube_video_transcripts` (선행 호출 필요), `youtube_references`, `glossary_*`

## 외부 의존

- LLM (텍스트 only). BYOK.
- `fetch-transcript` 가 먼저 성공해 자막이 DB 에 있어야 한다.
