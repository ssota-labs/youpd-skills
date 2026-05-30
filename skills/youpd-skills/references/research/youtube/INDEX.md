# YouTube 리서치 라우트 인덱스

> YouTube 도메인 라우트를 한눈에 본다. 사용자 의도 → 라우트 매핑 + 권장 호출 순서.
> 개별 라우트 상세는 같은 폴더의 `<route>.md` 파일을 추가 Read 로 진입한다.

## 워크플로 흐름

```
add-keyword                    키워드 마스터 등록 (date-only 수집 전제)
       │
       ▼
search-by-keyword              order=date 고정, 최초 500개 → 이후 publishedAfter 증분
       │
       ├─ list-hot-videos       DB score 기반 Good+ 인기 영상 (API 정렬 없음)
       │
       ▼
search-channels                search.list?type=channel
fetch-channel                  channels.list 단건/배치
fetch-channel-videos           playlistItems + videos.list 일괄
       │
       ▼
discover-references            에이전트 절차: keyword probe → 수집 라우트 → score curation
       │
       ▼
create-reference-folder / curate-references / list-references / fetch-comments
       │
       ▼
view-workspace                 로컬 읽기 전용 HTML 뷰어 (제목·썸네일 분석 표면)
       │
       ▼
analyze-title / analyze-thumbnail   사용 가능
       │
       ▼
fetch-transcript / analyze-intro    사용 가능
```

> **인기 영상 의도**: YouTube `search.list order=viewCount` 를 쓰지 않는다. `list-hot-videos` 로 라우팅한다.
> **트렌딩 의도**: `fetch-trending` 은 미지원. 인기/핫 영상은 `list-hot-videos`.

## 라우트 매핑

| 라우트 | 사용자 의도 (예시) | 의존 (DB) | 외부 의존 |
|---|---|---|---|
| `add-keyword.md` | "트래블블로그 키워드 등록해줘" | `youtube_keywords` | none |
| `search-by-keyword.md` | "트래블블로그 영상 수집해줘" | keywords + sessions + videos + snapshots + scores | YouTube Data API |
| `list-hot-videos.md` | "이 키워드 인기 영상 보여줘" | keyword results + scores + hot_videos | none |
| `search-channels.md` | "트래블블로그 관련 채널 찾아줘" | channels + snapshots | YouTube Data API |
| `fetch-channel.md` | "이 채널 정보 가져와줘" | channels + snapshots | YouTube Data API |
| `fetch-channel-videos.md` | "이 채널 영상 100개 가져와줘" | channels + videos + snapshots + scores | YouTube Data API |
| `fetch-trending.md` | "오늘 트렌딩 가져와줘" | — | **미지원** |
| `discover-references.md` | "30대 직장인 AI 생산성 레퍼런스 찾아줘" | 수집·큐레이션 라우트 조합 | route 조합 |
| `create-reference-folder.md` | "AI 생산성 레퍼런스 폴더 만들어줘" | reference_folder_groups + reference_folders | none |
| `record-discovery-run.md` | "이번 탐색 이력 기록해줘" | reference_discovery_runs | none |
| `curate-references.md` | "이 검색 결과에서 성과 좋은 영상 넣어줘" | reference_folder_videos + scores | none |
| `list-references.md` | "이 폴더 레퍼런스 보여줘" | reference folders + videos + scores | none |
| `remove-reference.md` | "이 영상 폴더에서 빼줘" | reference_folder_videos | none |
| `fetch-comments.md` | "성과 좋은 영상 댓글도 보고 고객 언어 뽑아줘" | youtube_comments + comment fetch sessions | YouTube Data API |
| `view-workspace.md` | "워크스페이스 DB 브라우저로 보여줘" | read-only 전 테이블 스냅샷 | none (local HTML) |

## 키워드 수집 정책

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
  create-reference-folder → record-discovery-run → curate-references → fetch-comments → list-references
  view-workspace
  analyze-title / analyze-thumbnail
  fetch-transcript → analyze-intro
```

## 제공 상태

- **사용 가능**: 워크스페이스 초기화; 키워드·채널·영상 수집 6종; 레퍼런스 폴더·큐레이션·댓글; 로컬 워크스페이스 뷰어(제목·썸네일 분석 표면); 제목·썸네일 분석 저장
- **미지원**: `fetch-trending` (인기 영상은 `list-hot-videos`); 단독 snapshot 라우트(수집 경로에 통합됨)
- **사용 가능**: 자막 추출 (timedtext); 도입부 분석 저장
- **미지원**: ASR(Whisper), 공식 captions OAuth
