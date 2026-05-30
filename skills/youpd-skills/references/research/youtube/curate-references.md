# Route: `research/youtube/curate-references`

> **상태**: 사용 가능

검색·hot video 결과 또는 명시 video id를 reference child folder에 저장한다. 선별 기준은 수집 단계의 score다. 제목/썸네일/각도 분석은 하지 않는다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/curate-references.ts \
  --folder-id <uuid> \
  --search-session-id <uuid> \
  --stage plan \
  --limit 10
```

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--folder-id` | uuid | — | 대상 child folder |
| `--search-session-id` | uuid | — | `search-by-keyword` 검색 세션에서 후보 선택 |
| `--hot-date` | YYYY-MM-DD | — | `youtube_hot_videos`에서 후보 선택 |
| `--region`, `-r` | string | `KR` | hot-date 조회 region |
| `--video-id` | repeatable string | — | 명시 영상 추가 |
| `--stage` | enum | `unspecified` | 소비자심리 단계 |
| `--discovery-run-id` | uuid | — | 실행 이력 연결 |
| `--min-grade` | grade | `Good` | search/hot source의 Good+ 필터 |
| `--limit`, `-l` | number | `10` | 추가 후보 수 |
| `--reason` | string | — | 저장 사유 |
| `--db`, `-d` | path | — | DB override |

`--search-session-id`, `--hot-date`, `--video-id` 중 정확히 하나의 source mode만 사용한다.

## DB 영향

- read: `youtube_keyword_video_results`, `youtube_hot_videos`, `youtube_video_scores`
- write: `reference_folder_videos`
- score 값은 중복 저장하지 않고 `video_snapshot_collected_at` + `score_policy_version` identity만 저장
- 외부 API 없음
