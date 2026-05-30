# Route: `setup/channel-project`

> 채널 전용 폴더에 `.youpd/project.json` 과 `docs/channel-brief.md` 생성.
> **툴킷(SKILL_ROOT)** 과 **채널 cwd** 를 분리할 때 사용한다.

## 언제

- `npx skills add` 로 스킬만 설치한 뒤, Cursor에서 **채널 폴더만** 열었을 때
- bootstrap / workspace/init 전에 채널 메타를 파일로 남길 때

## 스크립트

`scripts/setup/project-init.ts` — **채널 폴더를 cwd** 로:

```bash
cd /path/to/my-channel
pnpm --dir "<SKILL_ROOT>" exec tsx scripts/setup/project-init.ts \
  --id my-channel \
  --name "My Channel" \
  --one-liner "채널 한 줄 소개"
```

`--toolkit` 생략 시 스크립트가 설치된 SKILL_ROOT 를 기록한다.

## 생성 파일

| 경로 | 용도 |
|------|------|
| `.youpd/project.json` | id, toolkit.path, workspace.dbPath |
| `docs/channel-brief.md` | 에이전트용 채널 요약 |

## 이후 순서

1. `references/setup/bootstrap.md` — 툴킷 `pnpm install` + YouTube 키(HTML)
2. `references/workspace/init.md` — `--db` = 채널의 `./.youpd/workspace.db`

## 예시 JSON

`templates/youpd.project.example.json` 참고.
