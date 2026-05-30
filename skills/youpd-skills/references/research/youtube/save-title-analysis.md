# Route: `research/youtube/save-title-analysis`

> **상태**: ✅ P1.4

에이전트가 분류한 제목 분석을 `youtube_title_analyses`에 저장한다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/save-title-analysis.ts \
  --video-id <youtube_video_id> \
  --hook-primary <hook-type-code> \
  [--hook-secondary <hook-type-code>] \
  [--title-shape <code> ...] \
  --title-tone <title-tone-code> \
  --reasoning "<1-2 sentences>" \
  [--free-tag <tag> ...] \
  [--reanalyze] \
  [--db <path>]
```

## stdout

`RouteOk<SaveTitleAnalysisResult>` — `videoId`, `analysisId`, `reanalyzed`.

## 에러

| code | 조건 |
|---|---|
| `validation_error` | seed 미적용, unknown enum, 중복 분석(`--reanalyze` 없음) |
| `not_found` | `video_id` 없음 |
