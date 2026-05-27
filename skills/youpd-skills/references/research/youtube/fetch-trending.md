# Route: `research/youtube/fetch-trending`

`videos.list?chart=mostPopular` 로 지역·카테고리별 트렌딩 영상을 받아 `youtube_videos` 와 `youtube_trending` 에 적재한다. 자동 트리거는 없고 사용자 명시 호출만 수행한다.

## 입력

스크립트: `skills/youpd-skills/scripts/research/youtube/fetch-trending.ts`

| 인수 | 형태 | 설명 | 기본값 |
|---|---|---|---|
| `--region`, `-r` | string | regionCode | `KR` |
| `--category-id` / `--category` | string | `videoCategoryId` | 없음 |
| `--max`, `-m` | number | 1-50 | `50` |
| `--hot-date` | YYYY-MM-DD | 트렌딩 기준일 | 오늘 UTC |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-trending.ts --region KR --max 50
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-trending.ts --region KR --category-id 10
```

## DB 영향

- write: `youtube_channels`, `youtube_videos`, `youtube_trending`
- audit: `api_call_audits`, `youtube_api_key_daily_usage`, `daily_quota_usage`

## 외부 의존

`YOUTUBE_API_KEY` 또는 `youtube_api_keys` 활성 키가 필요하다. `videos.list?chart=mostPopular` 는 1 unit 으로 기록된다.

## 출력

```typescript
interface FetchTrendingResult {
  ok: true;
  hotDate: string;
  region: string;
  categoryId: string | null;
  resultCount: number;
  videoIds: string[];
  unitsConsumed: number;
}
```

## 결과 보고

"오늘 KR 트렌딩 N개를 적재했어요"처럼 지역·카테고리·건수 중심으로 짧게 요약한다.
