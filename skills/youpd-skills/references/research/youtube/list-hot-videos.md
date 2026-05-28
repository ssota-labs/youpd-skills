# Route: `research/youtube/list-hot-videos`

API 호출 없이 keyword video pool + snapshot-linked score 로 Good+ AND 필터, `length_adjusted_score` 내림차순 hot list 조회. `youtube_hot_videos` upsert.

## 사전 조건

- workspace DB 존재
- `search-by-keyword` 로 수집·score된 영상 존재

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--date` | `today` \| `YYYY-MM-DD` | `today` | hot snapshot date |
| `--region`, `-r` | string | `KR` | region label |
| `--recent-days` | number | `7` | published_at window |
| `--min-grade` | enum | `Good` | Worst…Great (Good+ AND filter) |
| `--limit`, `-l` | number | `20` | top N |
| `--db`, `-d` | path | — | DB override |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/list-hot-videos.ts --limit 10
```

## stdout (성공)

```json
{
  "ok": true,
  "route": "list-hot-videos",
  "dbPath": "...",
  "unitsConsumed": 0,
  "result": {
    "hotDate": "2026-05-27",
    "regionCode": "KR",
    "minGrade": "Good",
    "videos": [
      {
        "rank": 1,
        "videoId": "...",
        "title": "...",
        "lengthAdjustedScore": 42.5,
        "performanceGrade": "Good",
        "contributionGrade": "Great",
        "videoSnapshotCollectedAt": "...",
        "scorePolicyVersion": "youpd-score-v1.0-p1.1"
      }
    ]
  }
}
```

## 사용자 보고

- top N rank, score, grade 요약
- YouTube API 인기 정렬이 아닌 **수집 pool 기반 내부 score** 임을 명시
