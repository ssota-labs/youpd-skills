# Route: `research/youtube/fetch-channel-videos`

채널 uploads playlist 기반 영상 수집 → video/channel snapshots + snapshot-linked scores.

## 사전 조건

- workspace DB, `YOUTUBE_API_KEY`
- 채널 없거나 uploads playlist 없으면 선행 `fetch-channel` 자동 수행

## 입력

| 인수 | 기본 | 설명 |
|---|---|---|
| `--channel-id` | (필수) | channel ID |
| `--max-videos` | `100` | 최대 수집 수 |
| `--published-after` | — | ISO cutoff |
| `--db`, `-d` | — | DB override |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-channel-videos.ts --channel-id UCxxxx --max-videos 50
```

## stdout

`result.sessionId`, `result.videoIds`, `unitsConsumed`

## 에러

`missing_api_key`, `not_found`, `quota_exceeded`
