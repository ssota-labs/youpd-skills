# Route: `research/youtube/fetch-channel-videos`

채널의 uploads 플레이리스트를 따라가 영상 ID를 수집한 뒤 `videos.list` 로 상세를 보강해 `youtube_videos` 에 적재한다. 채널에 `uploads_playlist_id` 가 없으면 먼저 `channels.list` 로 채널을 보강한다.

## 입력

스크립트: `skills/youpd-skills/scripts/research/youtube/fetch-channel-videos.ts`

| 인수 | 형태 | 설명 | 기본값 |
|---|---|---|---|
| `--channel-id` | string | UC로 시작하는 채널 ID | 필수 |
| `--max`, `-m` | number | 가져올 영상 수, 최대 200 | `50` |
| `--published-after` | ISO 8601 | 이 시점 이후 영상만 최종 적재 | 없음 |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-channel-videos.ts --channel-id UC... --max 50
```

## DB 영향

- read/write: `youtube_channels`
- write: `youtube_videos`
- audit: `api_call_audits`, `youtube_api_key_daily_usage`, `daily_quota_usage`

## 외부 의존

`YOUTUBE_API_KEY` 또는 `youtube_api_keys` 활성 키가 필요하다. `playlistItems.list` 는 페이지당 1 unit, `videos.list` 는 50개 배치당 1 unit 으로 기록된다.

## 출력

```typescript
interface FetchChannelVideosResult {
  ok: true;
  channelId: string;
  resultCount: number;
  videoIds: string[];
  unitsConsumed: number;
}
```

## 다음 단계

P1.2 이후에는 수집된 영상에 대해 `snapshot-video.md` 를 호출해 시점별 수치를 기록한다.
