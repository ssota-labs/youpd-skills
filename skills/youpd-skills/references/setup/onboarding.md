# Route: `setup/onboarding` (채널 첫 설정)

> **터미널을 쓰지 않는 유저**를 기본으로 한다. 설치(`npx skills add`)·폴더 생성·스크립트·브라우저(YouTube 키) 안내는 **전부 에이전트**가 Shell로 수행한다.
> 유저는 Cursor 채팅과, 안내받은 **브라우저 폼**만 사용한다.

## 유저가 Agent 채팅에 넣는 말 (README와 동일)

**설치(최초 1회)** — 명령 블록 + 실행 요청:

```text
아래 명령 알아서 실행해줘.

npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
```

**온보딩** — 설치가 끝난 뒤:

```text
youpd 온보딩해줘.
```

유저에게 「터미널을 열어서 입력하세요」라고 **하지 않는다**. 명령은 **채팅에 붙여 넣고 Agent가 Shell**로 실행한다.

## 에이전트 절대 규칙

1. **유저에게 터미널 명령을 “직접 쳐라”고 하지 않는다.** 필요한 명령은 에이전트가 Shell로 실행한다.
2. **YouTube API 키를 채팅에 요청·출력하지 않는다.** 마지막에 `setup/env` HTML만 연다.
3. **온보딩 순서를 지킨다.** HTML(API 키)은 채널 폴더·DB 준비 **후**에만.
4. 완료 전에 키워드 수집·분석 라우트로 가지 않는다 (시청자 논의까지 끝낸 뒤 제안).

---

## Phase 0 — 툴킷 설치 (에이전트가 Shell)

유저가 채팅으로 **명령 실행을 요청**했을 때만 수행. 이미 `SKILL_ROOT`에 `scripts/setup/bootstrap.ts` 가 있으면 **스킵**.

유저 메시지에 포함된 명령(또는 동일):

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
```

- stdout/stderr에서 **설치 경로**를 확인해 둔다 (예: `~/.agents/skills/youpd-skills`).
- 설치가 끝나면 **즉시** 본 온보딩(Phase 1~)을 이어간다. 별도 「온보딩해줘」 요청을 기다리지 않는다.

상세: `references/setup/install-skills.md`

---

## Phase 1 — 대화: 어떤 채널인지 (HTML 없음)

채팅으로만 수집 (한꺼번에 물어도 됨):

| 항목 | 예 |
|------|-----|
| 프로젝트 id (kebab-case) | `senior-cafe-tv` |
| 표시 이름 | 시니어카페TV |
| 채널 한 줄 소개 | 시니어와 4050 자녀를 위한 유튜브… |
| 채널 폴더 절대 경로 | `~/Projects/senior-cafe-tv` |

**이 단계에서는 시청자층을 깊게 묻지 않는다** (Phase 6).

---

## Phase 2 — 채널 폴더·메타·DB (에이전트가 Shell)

YouTube 키 **불필요**.

```bash
mkdir -p "<채널 절대경로>"
cd "<채널 절대경로>"

pnpm --dir "<SKILL_ROOT>" exec tsx scripts/setup/project-init.ts \
  --dir "<채널 절대경로>" \
  --id "<id>" \
  --name "<표시 이름>" \
  --one-liner "<한 줄>" \
  --toolkit "<SKILL_ROOT>"

YOUPD_WORKSPACE_DB="<채널>/.youpd/workspace.db" \
  pnpm --dir "<SKILL_ROOT>" exec tsx scripts/workspace/init.ts --label "<id>"
```

유저에게:

- 「`<채널 경로>` 폴더를 Cursor에서 워크스페이스로 열어 주세요.」(아직 안 열었으면)
- `.gitignore`에 `.youpd/*.db`, `.env*` 반영 제안 (에이전트가 파일 생성 가능)

상세: `references/setup/channel-project.md`, `references/workspace/init.md`

---

## Phase 3 — 툴킷 의존성 (에이전트가 Shell)

`bootstrap` — **현재**는 키 없으면 fail. 온보딩 중에는:

1. `SKILL_ROOT`에서 `pnpm install` 실행 (`node_modules` 없을 때)
2. Node 24+ 확인

(구현 예정: `bootstrap --toolkit-only` 로 키 검사 생략)

---

## Phase 4 — YouTube API 키 (브라우저 HTML, 이 시점에만)

채널 폴더·DB가 준비된 **후**.

```bash
pnpm --dir "<SKILL_ROOT>" exec tsx scripts/setup/env.ts --mode serve --port 3848
```

- 유저에게 **URL만** 전달 (예: `http://127.0.0.1:3848/`).
- 「브라우저에서 키를 입력하고 저장한 뒤, 완료됐다고 알려주세요.」
- 키 값은 채팅에 쓰지 말 것.

저장 위치: `<SKILL_ROOT>/.env.local`

---

## Phase 5 — API 연결 테스트 (에이전트가 Shell)

(구현 예정: `scripts/setup/test-youtube.ts`)

- 성공: 「YouTube API 연결 확인됐어요.」
- 실패: Phase 4 다시 (키 재입력 HTML)

---

## Phase 6 — 대화: 잠재 시청자층 (HTML 없음)

리서치 키워드 **전에** 채팅으로 논의:

- 주 시청자 / 부 시청자(예: 4050 자녀)
- 톤·피하고 싶은 것
- 벤치마크 채널(선택)

`docs/channel-brief.md` 와 `.youpd/project.json` 의 `channel.audiences` 등을 **업데이트**.

---

## Phase 7 — 온보딩 마무리

유저에게 요약:

| 항목 | 값 |
|------|-----|
| 채널 폴더 | … |
| DB | `.youpd/workspace.db` |
| 툴킷 | SKILL_ROOT |

다음은 **제안만** (자동 실행 X):

> 「첫 키워드를 등록해 볼까요? 예: ‘시니어 건강’」

yes 일 때만 `add-keyword` 등 리서치 라우트.

---

## 완료 체크리스트 (에이전트 자가 검증)

- [ ] `npx skills add` 완료, SKILL_ROOT 확인
- [ ] 채널 폴더 + `project.json` + `workspace.db`
- [ ] `SKILL_ROOT/node_modules` 존재
- [ ] `.env.local` + API 테스트 성공
- [ ] `channel-brief` 시청자 섹션 반영
- [ ] 유저가 채널 폴더를 Cursor로 연 상태
