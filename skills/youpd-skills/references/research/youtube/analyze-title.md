# Route: `research/youtube/analyze-title`

> **상태**: 🚧 P1.4 — 스크립트 stub. **선행 작업**: 분류 축 v0 ADR 확정 + `glossary_axes`/`glossary_axis_values` seed 마이그레이션.

레퍼런스 영상의 제목을 LLM 으로 분석해 분류 축에 매핑. 후크 유형, 길이, 숫자 사용, 감정 어조, 키워드 밀도 등.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--reference-id` | uuid (repeatable) | 분석할 레퍼런스 ID |
| `--llm-provider` | enum | `anthropic` / `openai` (BYOK) |
| `--model` | string | (선택) 모델 ID 명시 override |

## DB 영향

- write: `youtube_title_analyses` (P1.4 신규 테이블 — 015 이후 마이그레이션에서 추가), `youtube_reference_classifications` (분류 축 매핑)
- read: `youtube_references` JOIN `youtube_videos.title`, `glossary_axes`, `glossary_axis_values`

## 외부 의존

LLM (멀티모달 불필요). BYOK.

## 미결 결정

- 분류 축 v0: 후크 유형은 몇 개 enum 으로 시작할지 (D5 ADR).
- LLM 응답을 그대로 저장할지, 정규화·검증해서 분류 축 ID 만 저장할지.
