# Route: `research/youtube/fetch-comments`

> **상태**: ✅ P1.2

Score-ranked 레퍼런스 후보 영상의 top-level 댓글을 capped fetch로 가져와 `youtube_comments`에 저장한다. P1.2에서는 고객 언어 회수가 목적이며 댓글 감성/반응 분석은 하지 않는다.

## 사전 조건

- workspace DB 존재
- 대상 video가 `youtube_videos`에 존재
- `YOUTUBE_API_KEY` 설정

## 실행

```bash
export YOUTUBE_API_KEY=...
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-comments.ts \
  --folder-id <uuid> \
  --max-comments-per-video 20
```

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--video-id` | repeatable string | — | 직접 대상 영상 |
| `--folder-id` | uuid | — | 폴더 내 영상 전체 |
| `--discovery-run-id` | uuid | — | 실행 이력 연결 |
| `--max-comments-per-video` | number | `20` | 최대 50 |
| `--order` | enum | `relevance` | `relevance` / `time` |
| `--db`, `-d` | path | — | DB override |

## DB 영향

- write: `youtube_comment_fetch_sessions`, `youtube_comments`
- write: `api_call_audits`, `daily_quota_usage`

## 에러 코드

| code | 조건 |
|---|---|
| `missing_api_key` | `YOUTUBE_API_KEY` 없음 |
| `quota_exceeded` | quota precheck 초과 |
| `not_found` | YouTube API 404 |

## 사용자 보고

- fetch한 영상 수와 댓글 수
- 댓글에서 반복되는 고객 질문/불만/제약 조건 후보
- 다음 keyword probe 후보
