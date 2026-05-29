# Route: `research/youtube/list-analysis-candidates`

> **상태**: ✅ P1.4

`reference_folder_videos` 기준으로 제목/썸네일 미분석(또는 전체) 후보를 반환한다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/list-analysis-candidates.ts \
  --kind title|thumbnail \
  [--folder-id <uuid>] \
  [--folder-group-id <uuid>] \
  [--video-id <id> ...] \
  [--include-analyzed] \
  [--limit 50] \
  [--db <path>]
```

## stdout

`RouteOk<{ kind, candidates[] }>` — 각 후보에 `videoId`, `title`, `thumbnailUrl`, `folderIds`, `hasTitleAnalysis`, `hasThumbnailAnalysis`.
