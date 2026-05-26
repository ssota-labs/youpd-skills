# Route: `research/youtube/search-channels`

> **상태**: 🚧 P1.1 — 스크립트 stub.

키워드로 YouTube 채널을 검색해 `youtube_channels` 마스터에 적재한다. 영상 검색과 분리되어 있으므로 같은 키워드로 영상·채널 양쪽을 찾고 싶다면 두 라우트를 모두 호출.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--keyword` | string | 검색어 (raw or normalized) |
| `--region` | string | (선택) regionCode |
| `--max-results` | number | 페이지 크기 |
| `--pages` | number | 페이지 수 |

## DB 영향

- write: `youtube_channels` (UPSERT, snippet 만 — 상세 채우기는 `fetch-channel` 의 일이다), `api_call_audits`
- read: 없음

## 외부 의존

YouTube Data API v3 — `search.list?type=channel` (1 페이지 = 100 unit)

## 노트

채널 행은 snippet 수준만 채워지고, `subscriber_count` 등 상세는 비어 있을 수 있다. 후속으로 `fetch-channel` 을 채널 ID 배치로 호출해 보강.
