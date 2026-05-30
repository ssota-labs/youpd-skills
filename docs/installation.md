# youpd-skills 설치 가이드

유저가 Cursor · Claude Code · Codex 등 **에이전트 IDE**에서 youpd-skills를 쓰려면, 현재는 [GitHub 레포](https://github.com/ssota-labs/youpd-skills)를 로컬에 두는 것이 기본입니다. 마켓플레이스 원클릭 설치는 공개(Phase 4) 이후 검토 대상입니다.

## 사전 요구 사항

| 항목 | 버전 |
|------|------|
| Node.js | **24 이상** (`node:sqlite` 필요) |
| pnpm | **10 이상** |
| API 키 | YouTube 리서치: `YOUTUBE_API_KEY` (`.env.example` 참고) |

## 설치 패턴 (두 가지)

### A. 단일 폴더 — clone 후 프로젝트명으로 폴더 이름 변경 (권장: 채널 1개 = 폴더 1개)

가장 흔한 유저 흐름입니다. 레포를 **처음부터 채널/프로젝트 이름으로 clone** 하면 `mv` 없이 끝납니다.

```bash
mkdir -p ~/youpd && cd ~/youpd
git clone https://github.com/ssota-labs/youpd-skills.git senior-cafe-tv
cd senior-cafe-tv
pnpm install
cp .env.example .env.local
# .env.local 에 YOUTUBE_API_KEY 등 입력 (에이전트에게 요청해도 됨 — 값은 채팅에 붙여넣지 말 것)
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label senior-cafe-tv
```

- `./.youpd/workspace.db` 가 **이 폴더(cwd)** 에 생성됩니다.
- 스크립트·스킬·`pnpm` 의존성은 모두 이 디렉터리 안에 있습니다.
- upstream(`ssota-labs/youpd-skills`) 업데이트를 받으려면 `git remote` 가 origin을 가리키므로 `git pull` 로 스킬 킷만 갱신할 수 있습니다. 채널 전용 커밋과 섞이지 않게 하려면 **B 패턴**을 쓰세요.

### B. 툴킷 + 채널 분리 — 스킬 킷은 고정 이름, 채널은 형제 폴더

스킬 킷 업데이트와 채널 데이터를 분리할 때 유용합니다.

```bash
mkdir -p ~/youpd && cd ~/youpd
git clone https://github.com/ssota-labs/youpd-skills.git
mkdir senior-cafe-tv && cd senior-cafe-tv
# 워크스페이스 DB만 이 폴더에 둠
export YOUPD_WORKSPACE_DB="$PWD/.youpd/workspace.db"
pnpm tsx ../youpd-skills/skills/youpd-skills/scripts/workspace/init.ts --label senior-cafe-tv
```

이후 YouTube 라우트도 **같은 환경변수**를 쓰거나, `../youpd-skills` 에서 `pnpm tsx skills/youpd-skills/scripts/...` 를 실행할 때 `YOUPD_WORKSPACE_DB` 를 채널 폴더로 맞춥니다. `.env.local` 은 `youpd-skills` 쪽에 한 번만 두면 됩니다.

## Cursor에서 열기

1. 설치한 폴더(패턴 A면 `senior-cafe-tv`, 패턴 B면 작업할 채널 폴더 또는 `youpd-skills`)를 Cursor로 연다.
2. Agent 채팅에 아래 **초기 설치 프롬프트** 또는 **일상 작업 프롬프트**를 붙여 넣는다.
3. (선택) Rules → Skills 에 `youpd-skills` 가 보이는지 확인. 안 보이면 레포 루트의 `skills/youpd-skills/SKILL.md` 가 로드되는 워크스페이스인지 확인한다.

## 채널 컨텍스트 문서

레포 안의 예시는 [`docs/projects/senior-cafe-tv/`](./projects/senior-cafe-tv/README.md) 를 참고하세요. 설치가 끝난 뒤 채널 폴더에 `docs/channel-brief.md` 등으로 복사해 두면, 이후 에이전트가 시청자·포지셔닝을 잃지 않습니다.

---

## 에이전트에게 맡기는 초기 설치 프롬프트

아래 블록을 **그대로** Agent 채팅에 붙여 넣으세요. `{...}` 만 본인 환경에 맞게 바꿉니다.

### 패턴 A — 프로젝트 폴더 하나로 운영 (clone 이름 = 프로젝트명)

```text
나는 YouTube 채널 프로젝트 "{PROJECT_NAME}" 을 youpd-skills 로 시작하려고 해.

저장소: https://github.com/ssota-labs/youpd-skills.git
설치 위치: {PARENT_DIR} (예: ~/youpd)
프로젝트 폴더 이름: {PROJECT_NAME} (예: senior-cafe-tv — clone 할 때 이 이름을 쓸 것)
채널 설명: {CHANNEL_ONE_LINER}

다음을 순서대로 직접 실행하고, 각 단계 결과를 한국어로 짧게 보고해줘.

1. Node 24+ 와 pnpm 10+ 설치 여부 확인 (`node --version`, `pnpm --version`). 부족하면 설치 방법 안내.
2. `{PARENT_DIR}` 가 없으면 만들고, 그 안에
   `git clone https://github.com/ssota-labs/youpd-skills.git {PROJECT_NAME}` 실행.
   (이미 clone 되어 있으면 pull 만.)
3. `cd {PARENT_DIR}/{PROJECT_NAME}` 후 `pnpm install`.
4. `.env.local` 이 없으면 `.env.example` 을 복사. `YOUTUBE_API_KEY` 가 비어 있으면 나에게 .env.local 편집을 요청 (키 값은 채팅에 출력하지 말 것).
5. 워크스페이스 초기화:
   `pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label {PROJECT_NAME}`
   stdout JSON 한 줄을 파싱해 성공 여부 보고.
6. 레포에 `docs/projects/{PROJECT_NAME}/` 예시가 있으면 읽고, 채널 루트에 `docs/channel-brief.md` 를 만들어 요약해 넣어줘 (없는 필드는 채널 설명으로 채움).
7. 마지막에: Cursor에서 이 폴더를 연 상태로 쓸 때의 다음 한 가지 작업(예: 키워드 등록)을 제안해줘.

스크립트는 반드시 `skills/youpd-skills/references/` 계약과 `skills/youpd-skills/SKILL.md` 라우터를 따를 것. 임의 SQL·미문서화 스크립트 금지.
```

**senior-cafe-tv 예시 값**

| placeholder | 값 |
|-------------|-----|
| `{PROJECT_NAME}` | `senior-cafe-tv` |
| `{PARENT_DIR}` | `~/youpd` (원하는 경로) |
| `{CHANNEL_ONE_LINER}` | 시니어와 4050 자녀를 위한 유튜브 채널. 건강·일상·가족 소통 콘텐츠. |

### 패턴 B — youpd-skills 고정 + 채널 폴더만 분리

```text
youpd-skills 툴킷은 {TOOLKIT_DIR}/youpd-skills 에 두고,
채널 데이터만 {CHANNEL_DIR}/{PROJECT_NAME} 에 두고 싶어.

1. {TOOLKIT_DIR}/youpd-skills clone + pnpm install + .env.local 설정 (키는 채팅에 노출 금지).
2. mkdir -p {CHANNEL_DIR}/{PROJECT_NAME} && cd 그 폴더.
3. YOUPD_WORKSPACE_DB="$PWD/.youpd/workspace.db" 로 init 스크립트 실행
   (스크립트 경로는 youpd-skills 레포의 skills/youpd-skills/scripts/workspace/init.ts).
4. 이후 모든 youpd 스크립트는 같은 YOUPD_WORKSPACE_DB 를 유지할 것.
5. docs/projects/{PROJECT_NAME}/ 가 있으면 channel-brief 를 채널 폴더에 생성.
```

---

## 설치 후 일상 작업 프롬프트 (짧은 버전)

설치가 끝난 뒤에는 이렇게만 말해도 됩니다.

```text
이 워크스페이스는 youpd-skills 프로젝트 "{PROJECT_NAME}" 이야.
youpd SKILL.md → 해당 references → pnpm tsx 스크립트 순으로 처리해줘.

지금 하고 싶은 일: {USER_INTENT}
예: "키워드 '시니어 건강' 등록해줘" / "이 키워드로 영상 수집해줘" / "레퍼런스 폴더 만들어줘"
```

---

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| `node:sqlite` / ExperimentalWarning 외 실패 | Node 22 이하 | Node 24+ 사용 |
| DB가 엉뚱한 폴더에 생김 | cwd 와 `YOUPD_WORKSPACE_DB` 불일치 | init 전에 `pwd` 확인, B 패턴이면 env 고정 |
| `pnpm init` 이 package.json 을 덮어씀 | pnpm 내장 init 과 충돌 | `pnpm tsx skills/youpd-skills/scripts/workspace/init.ts` 사용 |
| API 호출 실패 | `.env.local` 미설정 | 레포 루트에 키 입력 후 같은 셸/에이전트 세션에서 재시도 |

---

## 관련 문서

- [README.md](../README.md) — 레포 개요
- [senior-cafe-tv 예시 프로젝트](./projects/senior-cafe-tv/README.md)
- 스킬 라우터: `skills/youpd-skills/SKILL.md`
