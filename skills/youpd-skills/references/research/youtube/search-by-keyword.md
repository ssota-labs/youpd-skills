# Route: `research/youtube/search-by-keyword`

키워드로 YouTube `search.list` 를 호출하고, 결과 영상 상세를 `videos.list` 로 보강해 `youtube_videos`, `youtube_channels`, `youtube_search_sessions`, `youtube_keyword_video_results` 에 적재한다.

## 입력

스크립트: `skills/youpd-skills/scripts/research/youtube/search-by-keyword.ts`

| 인수 | 형태 | 설명 | 기본값 |
|---|---|---|---|
| `--keyword`, `-k` | string | 키워드를 등록한 뒤 즉시 검색 | `--keyword-id` 없으면 필수 |
| `--keyword-id` | uuid | 기존 `youtube_keywords.id` | `--keyword` 없으면 필수 |
| `--region`, `-r` | string | `--keyword` 사용 시 등록 region | `KR` |
| `--order`, `-o` | enum | `--keyword` 사용 시 검색 정렬 | `relevance` |
| `--max`, `-m` | number | 총 검색 결과 수, 최대 200 | `50` |
| `--force`, `-f` | boolean | 1시간 캐시 무시 | `false` |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/search-by-keyword.ts --keyword "AI 트렌드" --max 50
pnpm tsx skills/youpd-skills/scripts/research/youtube/search-by-keyword.ts --keyword-id <uuid> --force
```

## DB 영향

- read/write: `youtube_keywords`, `youtube_search_sessions`
- write: `youtube_channels`, `youtube_videos`, `youtube_keyword_video_results`
- audit: `api_call_audits`, `youtube_api_key_daily_usage`, `daily_quota_usage`

## 외부 의존

`YOUTUBE_API_KEY` 또는 `youtube_api_keys` 활성 키가 필요하다. `search.list` 는 호출당 100 unit, `videos.list` 는 배치당 1 unit 으로 기록된다.

## 출력

```typescript
interface SearchByKeywordResult {
  ok: true;
  searchSessionId: string;
  keywordId: string;
  cacheHit: boolean;
  resultCount: number;
  videoIds: string[];
  unitsConsumed: number;
}
```

## 결과 보고

성공 시 "`<keyword>` 검색 결과 N개 영상을 DB에 모았어요. 1시간 안에 같은 조건으로 다시 부르면 캐시를 씁니다." 정도로 요약한다. `cacheHit: true` 이면 "최근 검색 결과를 그대로 보여드렸어요"라고 말한다.
