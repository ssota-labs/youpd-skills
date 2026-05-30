# youpd-skills 설치 · 온보딩 (유저)

**전제: 유저는 터미널을 쓰지 않는다.** `npx`, `pnpm`, `mkdir` 은 **Cursor Agent(또는 Claude Code 등)가 Shell로 실행**한다.  
유저는 **채팅**과, 안내받은 **브라우저(YouTube API 키 폼)** 만 사용한다.

---

## 유저가 할 일 (2가지)

### 1) Cursor Agent 채팅 — 처음 한 번

```text
youpd-skills 설치하고 온보딩해줘.
```

에이전트가 순서대로:

1. `npx skills add … -g -y` 실행 (설치)
2. 채널이 어떤지 질문
3. 채널 폴더·DB 생성
4. 브라우저로 YouTube API 키 입력 안내
5. API 테스트
6. 잠재 시청자층 대화

계약: `skills/youpd-skills/references/setup/onboarding.md`

### 2) Cursor에서 폴더 열기

에이전트가 알려준 **채널 폴더**만 워크스페이스로 연다 (예: `~/Projects/senior-cafe-tv`).  
youpd-skills **개발 레포**나 툴킷 경로(`~/.agents/skills/...`)를 열지 않는다.

---

## 이미 설치한 뒤

```text
youpd 온보딩해줘.
```

---

## 에이전트가 실행하는 설치 명령 (참고)

유저에게 복사하라고 하지 말고, 에이전트 Shell:

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
```

설치 경로 예: `~/.agents/skills/youpd-skills` (환경마다 다름 — 실행 결과로 확인).

| 플래그 | 의미 |
|--------|------|
| `-g` | 툴킷 글로벌 1벌 |
| `-y` | 설치 확인 질문 생략 |
| `-a cursor …` | Cursor / Claude Code / Codex |

**DB**는 채널 폴더의 `.youpd/workspace.db` 만 (`-g`와 무관).

---

## 터미널을 쓰는 사람 (선택)

직접 설치만 하고 온보딩은 Agent에게 맡기려면:

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex -g -y
```

이후 채팅: `youpd 온보딩해줘.`

---

## 기여자

`git clone` + `pnpm install` — [README.md](../README.md) 기여자 섹션.

---

- [skills-sh.md](./skills-sh.md)
- Shipped: `references/setup/onboarding.md`
