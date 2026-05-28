# YouTube 리서치 라우트 인덱스 (Phase 1)

> Phase 1 YouTube 도메인 라우트를 한눈에 본다. 사용자 의도 → 라우트 매핑 + 권장 호출 순서.
> 개별 라우트 상세는 같은 폴더의 `<route>.md` 파일을 추가 Read 로 진입한다.

## Phase 1 의미 흐름

```
add-keyword                    [P1.1]  키워드 마스터 등록 (date-only 수집 전제)
       │
       ▼
search-by-keyword              [P1.1]  order=date 고정, 최초 500개 → 이후 publishedAfter 증분
       │
       ├─ list-hot-videos       [P1.1]  DB score 기반 Good+ 인기 영상 (API 정렬 없음)
       │
       ▼
search-channels                [P1.1]  search.list?type=channel
fetch-channel                  [P1.1]  channels.list 단건/배치
fetch-channel-videos           [P1.1]  playlistItems + videos.list 일괄
       │
       ▼
snapshot-channel / snapshot-video  [P1.2]  (P1.1 search/fetch 경로에 흡수됨)
       │
       ▼
curate-references / list-references [P1.3]
       │
       ▼
analyze-title / analyze-thumbnail   [P1.4]
       │
       ▼
fetch-transcript / analyze-intro    [P1.5]
```

> **인기 영상 의도**: YouTube `search.list order=viewCount` 를 쓰지 않는다. `list-hot-videos` 로 라우팅한다.
> **트렌딩 의도**: `fetch-trending` 은 P1.1 out-of-scope. 인기/핫 영상은 `list-hot-videos`.

## 라우트 매핑

| 라우트 | 사용자 의도 (예시) | 의존 (DB) | 외부 의존 |
|---|---|---|---|
| `add-keyword.md` | "트래블블로그 키워드 등록해줘" | `youtube_keywords` | none |
| `search-by-keyword.md` | "트래블블로그 영상 수집해줘" | keywords + sessions + videos + snapshots + scores | YouTube Data API |
| `list-hot-videos.md` | "이 키워드 인기 영상 보여줘" | keyword results + scores + hot_videos | none |
| `search-channels.md` | "트래블블로그 관련 채널 찾아줘" | channels + snapshots | YouTube Data API |
| `fetch-channel.md` | "이 채널 정보 가져와줘" | channels + snapshots | YouTube Data API |
| `fetch-channel-videos.md` | "이 채널 영상 100개 가져와줘" | channels + videos + snapshots + scores | YouTube Data API |
| `fetch-trending.md` | "오늘 트렌딩 가져와줘" | — | **P1.1 미구현** |

## P1.1 keyword collection 정책

- `search-by-keyword` 는 **date-only incremental collector** 다. `order=date` 고정.
- 최초 수집: 기본 **500개** (10 page × 50).
- 이후 수집: `last_incremental_published_at` watermark + 60초 overlap, 기본 1 page.
- `viewCount` / `relevance` / `rating` 정렬 옵션은 제공하지 않는다.
- 캐시 TTL 기본 24시간. cache hit 시 API 0 unit.

## 공통 stdout 계약

```typescript
interface RouteOk<T> {
  ok: true;
  route: string;
  dbPath: string;
  result: T;
  unitsConsumed: number;
}

interface RouteError {
  ok: false;
  route: string;
  code: 'validation_error' | 'missing_api_key' | 'quota_exceeded' | 'invalid_key'
    | 'not_found' | 'network_error' | 'db_error' | 'dangerous_scope' | 'unknown';
  message: string;
  detail?: unknown;
}
```

## 권장 호출 순서

```
add-keyword → search-by-keyword → list-hot-videos
  (필요 시) search-channels / fetch-channel / fetch-channel-videos
  (P1.3+) curate-references → analyze-*
```

## 구현 상태

- ✅ P1.0: workspace bootstrap
- ✅ P1.1: 6 routes (`add-keyword`, `search-by-keyword`, `search-channels`, `fetch-channel`, `fetch-channel-videos`, `list-hot-videos`)
- 🚧 P1.2+: snapshot standalone routes, curation, analysis
