# youpd-skills 설치 · 온보딩 (유저)

**유저는 터미널을 쓰지 않는다.** 아래를 **Cursor Agent 채팅에 그대로 붙여 넣는다.**

```text
아래 명령어로 설치해주고,
npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
끝나면 스킬 읽어서 온보딩 진행해줘.
```

| 단계 | 에이전트 |
|------|----------|
| 설치 | 위 `npx` 를 Shell에서 실행 |
| 온보딩 | `SKILL.md` → `references/setup/onboarding.md` |

설치 경로(예: `~/.agents/skills/youpd-skills`) = **SKILL_ROOT**.  
**DB**는 채널 폴더 `.youpd/workspace.db` 만 (Cursor는 채널 폴더만 연다).

---

## 터미널을 쓰는 사람 (선택)

동일한 `npx` 를 터미널에서 실행한 뒤, 채팅: `youpd 온보딩해줘.`

---

- [skills-sh.md](./skills-sh.md) · [README.md](../README.md)
