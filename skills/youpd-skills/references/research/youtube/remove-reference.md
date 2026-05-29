# Route: `research/youtube/remove-reference`

> **상태**: ✅ P1.2

Child folder에서 레퍼런스 영상을 제거한다. 영상 master, snapshots, scores, comments는 보존한다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/remove-reference.ts \
  --folder-id <uuid> \
  --video-id <video-id>
```

## 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--folder-id` | uuid | 대상 child folder |
| `--video-id` | repeatable string | 제거할 영상 |
| `--db`, `-d` | path | DB override |

## DB 영향

- delete: `reference_folder_videos`
- 외부 API 없음
