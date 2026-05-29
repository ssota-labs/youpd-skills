# Route: `research/youtube/list-references`

> **상태**: ✅ P1.2

Folder group 또는 child folder에 큐레이션된 레퍼런스를 조회한다. score 정렬은 `youtube_video_scores` JOIN으로 수행한다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/list-references.ts --folder-group-id <uuid>
```

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--folder-id` | uuid | — | 특정 child folder |
| `--folder-group-id` | uuid | — | folder group 전체 |
| `--stage` | enum | — | 단계 필터 |
| `--limit`, `-l` | number | `50` | 반환 수 |
| `--order` | enum | `score` | `score` / `added_at` / `published_at` |
| `--db`, `-d` | path | — | DB override |

`--folder-id` 또는 `--folder-group-id` 중 하나는 필요하다.

## DB 영향

- read: `reference_folder_videos`, `reference_folders`, `reference_folder_groups`, `youtube_videos`, `youtube_channels`, `youtube_video_scores`
- 외부 API 없음
