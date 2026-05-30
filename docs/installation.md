# youpd-skills 설치 가이드 (유저)

개발 레포(`AGENTS.md`, `.cursor/skills`)를 **clone하지 않습니다.** `npx skills add` 로 스킬 툴킷만 설치합니다.

---

## 설치 명령어

### 권장 — 글로벌 툴킷 · Cursor + Claude Code + Codex · 비대화형

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
```

| 플래그 | 의미 |
|--------|------|
| `--skill youpd-skills` | 레포에서 **이 스킬 폴더만** 설치 |
| `-a cursor` | Cursor (`~/.cursor/skills/` 등) |
| `-a claude-code` | Claude Code (`~/.claude/skills/` 등) |
| `-a codex` | Codex (`~/.codex/skills/` 등) |
| `-g` / `--global` | **글로벌** — 툴킷을 머신에 한 벌. 채널 프로젝트마다 스킬 복사 안 함 |
| `-y` / `--yes` | **확인 프롬프트 생략** (어느 에이전트? 덮어쓸까? 등을 묻지 않음) |

에이전트·스크립트가 설치할 때는 위 **권장 한 줄**을 쓴다.

### 최소 — 플래그 없음 (대화형)

```bash
npx skills add ssota-labs/youpd-skills
```

아무 옵션도 없으면 CLI가 **대화형**으로 진행한다. 대략 다음을 고른다:

1. **어떤 스킬?** — `youpd-skills` 선택 (다른 스킬이 보이면 이 이름만)
2. **어떤 에이전트?** — Cursor, Claude Code, Codex 등 (복수 선택 가능)
3. **어디에?** — 현재 프로젝트 vs **글로벌** (`-g` 와 동일한 선택지를 메뉴로)
4. **확인** — 덮어쓰기·경로 관련 질문 (`-y` 가 없으면 여기서 멈출 수 있음)

터미널에서 처음 설치하는 사람은 이 방식이 이해하기 쉽다.  
**채널 폴더만 Cursor로 연다**는 운영이면, 대화형에서도 **글로벌**을 고르는 것이 `-g` 권장과 같다.

### 그 밖에

```bash
# 스킬 이름만 확인
npx skills add ssota-labs/youpd-skills --list

# Cursor만 + 글로벌 + 비대화형
npx skills add ssota-labs/youpd-skills --skill youpd-skills -a cursor -g -y
```

---

## SKILL_ROOT vs DB (헷갈리기 쉬운 부분)

```
SKILL_ROOT/              ← -g 로 한 번 (툴킷: scripts, node_modules, .env.local)
  skills/youpd-skills/   ← 실제 내용 (CLI 설치 구조에 따라 경로는 다를 수 있음)

~/youpd/my-channel/      ← Cursor 워크스페이스 (채널)
  .youpd/workspace.db    ← 데이터 SSOT (여기만)
  .youpd/project.json
```

**`-g`는 DB 위치와 무관**하다. DB는 항상 **채널 cwd** 또는 `YOUPD_WORKSPACE_DB` / `--db` 로 정한 경로다.

---

## 2. 채널 워크스페이스

```bash
mkdir -p ~/youpd/my-channel && cd ~/youpd/my-channel
```

Cursor로 **이 폴더만** 연다.

## 3. 에이전트 초기 설정

```text
youpd 초기 설정해줘.

- 채널 폴더: (현재 워크스페이스 cwd)
- 프로젝트 id: my-channel
- 표시 이름: My Channel
- 한 줄 소개: (내 채널 설명)

순서: channel-project → bootstrap → workspace/init
references/setup/*.md 와 SKILL.md 만 따를 것. YouTube 키는 env HTML, 채팅에 키 금지.
```

## 수동 명령 (참고)

`SKILL_ROOT` = 위 `npx skills add` 로 설치된 youpd-skills 디렉터리.

```bash
cd ~/youpd/my-channel
pnpm --dir "$SKILL_ROOT" exec tsx scripts/setup/project-init.ts \
  --id my-channel --name "My Channel" --one-liner "…"

pnpm --dir "$SKILL_ROOT" exec tsx scripts/setup/bootstrap.ts

YOUPD_WORKSPACE_DB="$PWD/.youpd/workspace.db" \
  pnpm --dir "$SKILL_ROOT" exec tsx scripts/workspace/init.ts --label my-channel
```

## 기여자 (full clone)

```bash
git clone https://github.com/ssota-labs/youpd-skills.git
cd youpd-skills && pnpm install && pnpm test:smoke
```

---

- [skills-sh.md](./skills-sh.md) — 리더보드·배지
- Shipped: `skills/youpd-skills/references/setup/install-skills.md`
