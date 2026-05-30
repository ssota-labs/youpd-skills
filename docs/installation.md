# youpd-skills 설치 가이드 (유저)

개발 레포(`AGENTS.md`, `.cursor/skills`)를 clone하지 않습니다. **스킬 폴더만** 설치합니다.

## 1. 스킬 설치 (skills.sh / npx)

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills -g -y
```

- `-g`: 전역(머신 공용). 채널마다 프로젝트 scope로 설치해도 됩니다.
- 설치 경로는 CLI가 안내합니다 (에이전트가 `SKILL_ROOT`로 사용).

skills.sh 노출: [docs/skills-sh.md](./skills-sh.md)

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
