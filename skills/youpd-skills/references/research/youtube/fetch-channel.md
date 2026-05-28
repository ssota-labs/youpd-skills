# Route: `research/youtube/fetch-channel`

채널 ID 또는 handle 로 `channels.list` 상세 수집. handle은 `forHandle` → 실패 시 search fallback (+100 units).

## 사전 조건

- workspace DB, `YOUTUBE_API_KEY`
- `--channel-id` 또는 `--handle` 1개 이상

## 입력

| 인수 | 설명 |
|---|---|
| `--channel-id` | repeatable channel ID |
| `--handle` | repeatable @handle |
| `--db`, `-d` | DB override |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-channel.ts --channel-id UCxxxx
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-channel.ts --handle @example
```

## stdout

`result.sessionId`, `result.channelIds`, `unitsConsumed`

## 에러

`missing_api_key`, `not_found`, `invalid_key`, `quota_exceeded`
