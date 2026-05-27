# Route: `research/youtube/fetch-channel`

채널 ID 또는 핸들(`@handle`)을 받아 `channels.list` 를 호출하고 `youtube_channels` 마스터를 최신 값으로 갱신한다.

## 입력

스크립트: `skills/youpd-skills/scripts/research/youtube/fetch-channel.ts`

| 인수 | 형태 | 설명 | 기본값 |
|---|---|---|---|
| `--channel-id` | repeatable string | UC로 시작하는 채널 ID | `--handle` 없으면 필수 |
| `--handle` | repeatable string | `@xxx` 형태 핸들 | `--channel-id` 없으면 필수 |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-channel.ts --handle @anthropic-ai
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-channel.ts --channel-id UC... --channel-id UC...
```

## DB 영향

- write: `youtube_channels`
- audit: `api_call_audits`, `youtube_api_key_daily_usage`, `daily_quota_usage`

## 외부 의존

`YOUTUBE_API_KEY` 또는 `youtube_api_keys` 활성 키가 필요하다. `channels.list` 는 호출당 1 unit 으로 기록된다.

## 출력

```typescript
interface FetchChannelResult {
  ok: true;
  resultCount: number;
  channelIds: string[];
  unitsConsumed: number;
}
```

## 멱등성

이미 적재된 채널을 재호출해도 안전하다. 같은 `channel_id` 는 UPSERT 되고 `collected_at` 이 갱신된다.
