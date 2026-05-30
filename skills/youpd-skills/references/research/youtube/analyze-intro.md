# Route: `research/youtube/analyze-intro`

> **상태**: 준비 중

영상 도입부(첫 N초) 자막을 바탕으로 후크 패턴/구조를 분류한다 (에이전트 reasoning, **외부 LLM API 없음** — 제공 시).

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--reference-id` | uuid (repeatable) | |
| `--intro-seconds` | number | 분석 구간 (기본 30) |
## DB 영향

- write: `youtube_intro_analyses` (향후 마이그레이션), `youtube_reference_classifications`
- read: `youtube_video_transcripts` (선행 호출 필요), `youtube_references`, `glossary_*`

## 외부 의존

- `fetch-transcript` 가 먼저 성공해 자막이 DB 에 있어야 한다 (준비 중).
- 별도 LLM API 키는 사용하지 않는다.
