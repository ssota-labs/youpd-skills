# Agent bootstrap prompt (동적)

채팅에 **아래 "프롬프트 본문"만** 붙여 넣으세요. `senior-cafe-tv` 같은 고정 예시는 필요 없습니다. 에이전트가 `.youpd/project.json` 을 만들거나, 대화에서 받은 값으로 채웁니다.

---

## 프롬프트 본문 (복사 시작)

```text
youpd-skills로 YouTube 채널 워크스페이스를 설치·초기화해줘.

## 내가 주는 정보 (비어 있으면 한 가지씩 물어봐)
- 프로젝트 ID (kebab-case, 폴더명): 
- 표시 이름: 
- 채널 한 줄 소개: 
- 부모 디렉터리 (예: ~/youpd): 
- 패턴: runtime+channel (권장) | full-clone (비권장, 개발 파일 포함)

## 반드시 지킬 것
- 전체 개발 레포 clone(AGENTS.md, .cursor/skills 포함)은 사용자가 명시하지 않는 한 하지 말 것.
- 런타임 설치: GitHub ssota-labs/youpd-skills 의
  `bash scripts/install-youpd-runtime.sh --dir <부모>/youpd-skills`
  (이미 있으면 그 경로에서 pull + pnpm install)
- 채널 폴더: `bash scripts/install-youpd-project.sh --dir <부모>/<프로젝트-id> --id <id> --name "<표시 이름>" --one-liner "<한 줄>" --toolkit <youpd-skills 절대경로>`
- Cursor 쓰는 경우: `bash scripts/install-youpd-runtime.sh --cursor-link` 로 로컬 플러그인 등록 안내 (또는 실행).
- API 키는 .env.local 에만; 값을 채팅에 출력하지 말 것.

## 초기화 순서
1. Node 24+, pnpm 10+ 확인
2. runtime 설치 스크립트 실행 → toolkit 경로 확보
3. project 스크립트 실행 → `<채널폴더>/.youpd/project.json` + `docs/channel-brief.md`
4. toolkit에서: `YOUPD_WORKSPACE_DB=<채널폴더>/.youpd/workspace.db pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label <프로젝트-id>`
5. 이후 작업은 채널 폴더를 cwd로, `skills/youpd-skills/SKILL.md` → references → scripts 만 사용

각 단계 stdout JSON·성공 여부를 한국어로 짧게 보고하고, 마지막에 제안 작업 1가지.
```

## 프롬프트 본문 (복사 끝)

---

## 이미 `.youpd/project.json` 이 있을 때

```text
이 워크스페이스의 .youpd/project.json 을 읽고 youpd 절차로 진행해줘.
지금 할 일: <의도>
```
