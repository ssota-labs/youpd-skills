# Route: `research/youtube/search-channels`

키워드로 YouTube 채널을 검색하고 상세 보강 후 channel master + snapshot + keyword channel results 저장.

## 사전 조건

- workspace DB, `YOUTUBE_API_KEY`

## 입력

| 인수 | 기본 | 설명 |
|---|---|---|
| `--keyword`, `-k` | (필수) | 검색 키워드 |
| `--region`, `-r` | `KR` | region |
| `--max-results` | `50` | 최대 채널 수 |
| `--pages` | `1` | search page 수 |
| `--db`, `-d` | — | DB override |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/search-channels.ts --keyword "트래블"
```

## stdout

`result.sessionId`, `result.channelIds`, `unitsConsumed` (≈ 100×pages + channels.list)

## 에러

`missing_api_key`, `quota_exceeded`, `validation_error`
