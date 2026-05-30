# youpd-skills 설치 · 온보딩 (유저)

**유저는 터미널을 쓰지 않는다.** README의 **명령어 블록을 채팅에 복사**하고, 「실행해줘」「알아서 해줘」라고 하면 **Agent가 Shell**에서 실행한다.

---

## 1) 설치

Agent 채팅에 **그대로 붙여 넣기:**

```text
아래 명령 알아서 실행해줘.

npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
```

에이전트가 설치 경로(예: `~/.agents/skills/youpd-skills`)를 알려주면 2단계로.

| 플래그 | 의미 |
|--------|------|
| `-g` | 툴킷 글로벌 1벌 |
| `-y` | 설치 확인 질문 생략 |
| `-a …` | Cursor · Claude Code · Codex |

---

## 2) 온보딩

```text
youpd 온보딩해줘.
```

에이전트: `skills/youpd-skills/references/setup/onboarding.md`  
(채널 질문 → 폴더·DB → 브라우저 API 키 → 테스트 → 시청자 논의)

**Cursor 워크스페이스**는 에이전트가 만든 **채널 폴더**만 연다.

---

## 터미널을 쓰는 사람 (선택)

위 `npx` 를 터미널에서 직접 실행해도 된다. 이후 채팅: `youpd 온보딩해줘.`

---

- [skills-sh.md](./skills-sh.md)
- [README.md](../README.md)
