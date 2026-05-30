# youpd-skills 설치 가이드 (유저)

개발 레포(`AGENTS.md`, `.cursor/skills`)를 clone하지 않습니다. **스킬 폴더만** 설치합니다.

## 1. 스킬 설치 (skills.sh / npx) — 툴킷만 글로벌

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills -a cursor -g -y
```

| 플래그 | 의미 |
|--------|------|
| `--skill youpd-skills` | 레포 안에서 **이 스킬 폴더만** 설치 (개발용 `AGENTS.md` 등은 안 옴) |
| `-a cursor` | Cursor용 경로에 연결 (생략 시 CLI가 에이전트를 물어봄) |
| `-g` / `--global` | **글로벌** — 툴킷을 머신에 한 벌만 둠. 채널 프로젝트마다 복사하지 않음 |
| `-y` / `--yes` | **확인 프롬프트 생략** — “어느 에이전트?” “덮어쓸까?” 등 질문 없이 끝까지 진행 (에이전트·CI용) |

`-y` 없이 실행하면 대화형으로 에이전트·scope를 고르게 됩니다. 사람이 터미널에서 처음 설치할 때는 `-y` 빼도 됩니다.

설치된 경로 = **`SKILL_ROOT`** (스크립트·`node_modules`·`.env.local`). CLI stdout 또는 Cursor Settings → Skills 에서 확인.

### DB는 어디?

**`-g`와 무관.** SQLite DB는 Cursor로 연 **채널 폴더**에만 생깁니다.

```
SKILL_ROOT/          ← -g 로 한 번만 (툴킷)
  scripts/
  node_modules/
  .env.local         ← YouTube API 키

~/youpd/my-channel/  ← Cursor 워크스페이스 (채널)
  .youpd/workspace.db
  .youpd/project.json
```

skills.sh: [docs/skills-sh.md](./skills-sh.md)

## 2. 채널 워크스페이스 (Cursor에서 여는 폴더)

```bash
mkdir -p ~/youpd/my-channel && cd ~/youpd/my-channel
```

Cursor로 **이 폴더만** 엽니다.

## 3. 에이전트에게 초기 설정 맡기기

채팅에 붙여 넣기:

```text
youpd 초기 설정해줘.

- 채널 폴더: (현재 워크스페이스 cwd)
- 프로젝트 id: my-channel
- 표시 이름: My Channel
- 한 줄 소개: (내 채널 설명)

순서:
1. SKILL_ROOT 에서 setup/project-init (channel-project reference)
2. bootstrap (pnpm install 자동, YouTube 키 없으면 env HTML serve — 키는 채팅에 쓰지 말 것)
3. workspace/init → 이 채널의 .youpd/workspace.db

references/setup/*.md 와 SKILL.md 만 따를 것.
```

## 수동 명령 (참고)

`SKILL_ROOT` = 스킬 설치 디렉터리.

```bash
cd ~/youpd/my-channel
pnpm --dir "$SKILL_ROOT" exec tsx scripts/setup/project-init.ts \
  --id my-channel --name "My Channel" --one-liner "…"

pnpm --dir "$SKILL_ROOT" exec tsx scripts/setup/bootstrap.ts
# 키 없으면: pnpm --dir "$SKILL_ROOT" exec tsx scripts/setup/env.ts --mode serve

YOUPD_WORKSPACE_DB="$PWD/.youpd/workspace.db" \
  pnpm --dir "$SKILL_ROOT" exec tsx scripts/workspace/init.ts --label my-channel
```

## 기여자 (full clone)

```bash
git clone https://github.com/ssota-labs/youpd-skills.git
cd youpd-skills
pnpm install
pnpm test:smoke
```

---

- [skills-sh.md](./skills-sh.md) — 리더보드·배지
- [README.md](../README.md)
