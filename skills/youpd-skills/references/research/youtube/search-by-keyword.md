# Route: `research/youtube/search-by-keyword`

등록된 키워드로 YouTube 영상을 **date-only** 수집한다. `order=date` 고정. 최초 500개, 이후 `publishedAfter` watermark 증분. 신규/강제 refresh 영상만 detail fetch 후 snapshot-linked score 저장.

## 사전 조건

- workspace DB 존재
- `YOUTUBE_API_KEY` 설정
- 키워드 등록 (`add-keyword`) 또는 `--keyword-id`

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--keyword`, `-k` | string | — | 키워드 (없으면 `--keyword-id` 필수) |
| `--keyword-id` | uuid | — | 기존 keyword ID |
| `--region`, `-r` | string | `KR` | region (keyword 자동 등록 시) |
| `--initial-target-count` | number | `500` | initial mode 목표 |
| `--incremental-pages` | number | `1` | incremental mode page 수 |
| `--published-before` | ISO 8601 | — | optional upper bound |
| `--force`, `-f` | flag | false | 캐시 무시 + 기존 영상 metadata refresh |
| `--db`, `-d` | path | — | DB override |

## 동작

1. keyword row 확보
2. cache hit (`cache_expires_at > now`, result >= target, `!force`) → API 0 unit
3. mode: `initial` (미완료) / `incremental`
4. `search.list` `order=date`
5. overlap dedupe, existing video skip (`!force`)
6. `videos.list` + `channels.list` for targets
7. snapshots + snapshot-linked scores
8. keyword watermark/cache 갱신

## 실행

```bash
export YOUTUBE_API_KEY=...
pnpm tsx skills/youpd-skills/scripts/research/youtube/search-by-keyword.ts --keyword "AI 트렌드"
```

## stdout (성공)

```json
{
  "ok": true,
  "route": "search-by-keyword",
  "dbPath": "...",
  "unitsConsumed": 1020,
  "result": {
    "sessionId": "uuid",
    "keywordId": "uuid",
    "mode": "initial",
    "cacheHit": false,
    "resultCount": 500,
    "newVideoCount": 480,
    "skippedExistingVideoCount": 20,
    "videoIds": ["..."]
  }
}
```

## 에러 코드

| code | 조건 |
|---|---|
| `missing_api_key` | `YOUTUBE_API_KEY` 없음 |
| `quota_exceeded` | 일일 quota precheck 초과 |
| `validation_error` | keyword 인수 누락 |
| `not_found` | keyword_id 없음 |

## 사용자 보고

- mode(initial/incremental), cache hit, new/skipped count, unitsConsumed
- initial 500개 ≈ 1,020+ units quota 안내
- "인기 영상" 요청 시 `list-hot-videos` 로 안내 (API viewCount 정렬 아님)
