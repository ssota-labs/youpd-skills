# youpd-skills (runtime)

YouTube·콘텐츠 리서치용 **런타임 설치본**입니다. `AGENTS.md`, Notion 개발 스킬, evals 등은 포함되지 않습니다.

## 빠른 시작

```bash
cp .env.example .env.local   # API 키 입력
pnpm install                 # 이미 실행됐을 수 있음
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label <프로젝트-id>
```

채널 메타데이터는 **채널 전용 폴더**의 `.youpd/project.json` 에 두는 것을 권장합니다. 설치·Cursor 플러그인: [distribution/templates/](../distribution/templates/) 및 GitHub `docs/distribution.md`.

## 업데이트

```bash
git pull
pnpm install
```
