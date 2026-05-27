# Route: `research/youtube/search-channels`

키워드로 YouTube 채널을 검색하고, 결과 채널 ID를 `channels.list` 로 상세 보강한 뒤 `youtube_channels` 에 적재한다.

## 입력

스크립트: `skills/youpd-skills/scripts/research/youtube/search-channels.ts`

| 인수 | 형태 | 설명 | 기본값 |
|---|---|---|---|
| `--keyword`, `-k` | string | 채널 검색어 | 필수 |
| `--region`, `-r` | string | regionCode | `KR` |
| `--max`, `-m` | number | 검색 결과 수, 최대 50 | `25` |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/search-channels.ts --keyword "AI 뉴스"
```

## DB 영향

- write: `youtube_channels`
- audit: `api_call_audits`, `youtube_api_key_daily_usage`, `daily_quota_usage`

## 외부 의존

`YOUTUBE_API_KEY` 또는 `youtube_api_keys` 활성 키가 필요하다. `search.list?type=channel` 은 100 unit, 후속 `channels.list` 배치는 1 unit 으로 기록된다.

## 출력

```typescript
interface SearchChannelsResult {
  ok: true;
  keyword: string;
  region: string;
  resultCount: number;
  channelIds: string[];
  unitsConsumed: number;
}
```

## 다음 단계

특정 채널의 영상 목록을 모으려면 `fetch-channel-videos.md` 로 이어간다.
