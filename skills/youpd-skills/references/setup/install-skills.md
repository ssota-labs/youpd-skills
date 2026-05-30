# Setup: `npx skills add` (툴킷 설치, 최초 1회)

> 개발 레포 **clone 하지 않음**. `skills/youpd-skills` 스킬 폴더만 설치한다.
> **유저는 터미널을 쓰지 않는다** — 아래 명령은 **에이전트가 Shell로 실행**한다 (`references/setup/onboarding.md` Phase 0).

## 권장 (글로벌 · Cursor + Claude Code + Codex · 비대화형)

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
```

| 플래그 | 의미 |
|--------|------|
| `--skill youpd-skills` | 이 스킬만 (레포 루트의 개발 파일 제외) |
| `-a cursor` / `-a claude-code` / `-a codex` | 해당 에이전트 skills 경로에 연결 |
| `-g` | **글로벌** — 툴킷 한 벌, 채널마다 복사 안 함 |
| `-y` | 확인 프롬프트 생략 (에이전트·CI) |

설치 경로 = **SKILL_ROOT** (`bootstrap`·스크립트 실행 기준).  
Cursor 등에서는 often `~/.agents/skills/youpd-skills` — **실행 로그로 확인**.

## 유저에게 (README 문구)

「터미널에 입력하세요」가 아니라, **아래 명령을 채팅에 붙여 넣고 `알아서 실행해줘` 라고 하세요.**

온보딩은 설치 후 `youpd 온보딩해줘` → `onboarding.md`.

## 최소 (플래그 없음 · 대화형, 에이전트용)

```bash
npx skills add ssota-labs/youpd-skills
```

CLI가 순서대로 묻는다:

1. 레포에 있는 스킬 목록 → **`youpd-skills` 선택**
2. 설치할 **에이전트** (Cursor, Claude Code, Codex 등)
3. **프로젝트** vs **글로벌** → 채널만 Cursor로 열 거면 **글로벌 권장**
4. 덮어쓰기 등 확인

사람이 처음 터미널에서 설치할 때는 이 방식도 된다. 에이전트가 대신 설치할 때는 **권장 한 줄**을 쓴다.

## 목록만 보기

```bash
npx skills add ssota-labs/youpd-skills --list
```

## DB 위치 (다시 한번)

`-g` 는 **툴킷**만 글로벌이다. **SQLite DB**는 Cursor로 연 **채널 폴더**의 `./.youpd/workspace.db` 에만 생긴다 (`workspace/init`).

## 다음

`references/setup/onboarding.md` Phase 1 이후 (채널 대화 → 폴더 → …).
