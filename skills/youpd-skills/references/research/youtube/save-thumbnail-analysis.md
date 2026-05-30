# Route: `research/youtube/save-thumbnail-analysis`

> **상태**: ✅ P1.4

썸네일 분석을 `youtube_thumbnail_analyses`에 저장한다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/save-thumbnail-analysis.ts \
  --video-id <id> \
  --visual-hierarchy <code> \
  --text-density <code> \
  [--face-treatment <code>] \
  --felt-emotion <thumbnail-emotion-code> \
  [--alignment-with-title <alignment-code>] \
  [--alignment-reasoning "<text>"] \
  --reasoning "<text>" \
  [--free-tag <tag> ...] \
  [--thumbnail-url-used <url>] \
  [--reanalyze] \
  [--db <path>]
```

## stdout

`RouteOk<SaveThumbnailAnalysisResult>` — `hasTitleAnalysis`는 제목 분석 존재 여부.
