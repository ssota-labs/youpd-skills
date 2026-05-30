# Route: `research/youtube/analyze-title`

> **상태**: 준비 중 — 분류 축·용어집 시드가 확정되기 전까지 실행할 수 없다.

레퍼런스 영상의 제목을 LLM 으로 분석해 분류 축에 매핑. 후크 유형, 길이, 숫자 사용, 감정 어조, 키워드 밀도 등.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--reference-id` | uuid (repeatable) | 분석할 레퍼런스 ID |
| `--llm-provider` | enum | `anthropic` / `openai` (BYOK) |
| `--model` | string | (선택) 모델 ID 명시 override |

## DB 영향

- write: `youtube_title_analyses` (향후 마이그레이션), `youtube_reference_classifications` (분류 축 매핑)
- read: `youtube_references` JOIN `youtube_videos.title`, `glossary_axes`, `glossary_axis_values`

## 외부 의존

LLM (멀티모달 불필요). BYOK.

## 아직 정하지 않은 사항

- 분류 축 v0: 후크 유형 enum 개수
- LLM 응답을 그대로 저장할지, 정규화·검증해서 분류 축 ID 만 저장할지
