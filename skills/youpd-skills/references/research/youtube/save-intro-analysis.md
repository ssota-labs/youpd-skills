# Route: `research/youtube/save-intro-analysis`

> **상태**: 사용 가능 — 에이전트 reasoning + 본 스크립트 영속화. **외부 LLM API 없음.**

에이전트가 분류한 도입부 분석을 `youtube_intro_analyses`에 저장한다.

## 선행 조건

- `fetch-transcript` 로 해당 `video_id` 자막이 DB에 있음
- Glossary seed: 마이그레이션 `014` + `017` 적용됨

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/save-intro-analysis.ts \
  --video-id <youtube_video_id> \
  --window-sec 15 \
  --hook-primary <hook-type-code> \
  [--hook-secondary <hook-type-code>] \
  --intro-structure <intro-structure-code> \
  --pacing-signal <pacing-signal-code> \
  --reward-burden-balance <engaging-intro|front-loaded-burden> \
  --reasoning "<1-2 sentences>" \
  [--free-tag <tag> ...] \
  [--reanalyze] \
  [--db <path>]
```

## stdout

`RouteOk<SaveIntroAnalysisResult>` — `videoId`, `analysisId`, `reanalyzed`, `hasTranscript`.

## 에러

| code | 조건 |
|---|---|
| `validation_error` | seed 미적용, unknown enum, 자막 없음, 중복 분석(`--reanalyze` 없음) |
| `not_found` | `video_id` 없음 |
