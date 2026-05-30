# youpd-skills 설치 가이드

## 한 줄 요약

| 누가 | 무엇을 받나 | Cursor에서 여는 폴더 |
|------|-------------|----------------------|
| **채널 운영자** | 런타임 툴킷 + 채널 폴더 | 채널 폴더 (`my-channel/`) |
| **레포 기여자** | full `git clone` | `youpd-skills` 레포 루트 |

채널 운영자는 **`AGENTS.md` 가 없는** 경로를 쓰는 것이 좋습니다. 이유와 방법: [distribution.md](./distribution.md).

---

## 사전 요구 사항

| 항목 | 버전 |
|------|------|
| Node.js | **24+** |
| pnpm | **10+** |
| git | sparse-checkout 지원 (2.25+) |
| API 키 | `YOUTUBE_API_KEY` (`.env.example`) |

---

## 권장: 런타임 + 채널 (동적)

### 1) 툴킷만 설치 (개발 파일 제외)

```bash
mkdir -p ~/youpd
# 레포 안에서:
bash scripts/install-youpd-runtime.sh --dir ~/youpd/youpd-skills
# 또는 clone 후 해당 레포에서 동일 명령

# Cursor 로컬 플러그인 등록 (선택)
bash scripts/install-youpd-runtime.sh --dir ~/youpd/youpd-skills --cursor-link
```

`AGENTS.md`, `.cursor/skills`, `evals/` 등은 **체크아웃되지 않습니다**.

### 2) 채널 워크스페이스 생성

`senior-cafe-tv` 같은 이름은 **예시일 뿐** — 본인 `--id` 로 바꿉니다.

```bash
bash scripts/install-youpd-project.sh \
  --dir ~/youpd/senior-cafe-tv \
  --id senior-cafe-tv \
  --name "Senior Cafe TV" \
  --one-liner "시니어와 4050 자녀를 위한 유튜브" \
  --toolkit ~/youpd/youpd-skills \
  --audiences "senior-55-75,children-40-50"
```

생성물:

- `~/youpd/senior-cafe-tv/.youpd/project.json` — 에이전트·스크립트가 읽는 메타
- `~/youpd/senior-cafe-tv/docs/channel-brief.md`

### 3) DB 초기화 · 키

```bash
cd ~/youpd/youpd-skills
cp -n .env.example .env.local   # 키 입력
YOUPD_WORKSPACE_DB=~/youpd/senior-cafe-tv/.youpd/workspace.db \
  pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label senior-cafe-tv
```

### 4) Cursor

**`~/youpd/senior-cafe-tv` 만 연다** (툴킷 레포 루트를 채널 이름으로 열지 않음).

---

## 에이전트에게 맡기기 (동적 프롬프트)

고정 채널명 없이 쓰려면 아래 파일 **본문**을 복사하세요.

→ [`distribution/templates/agent-bootstrap.prompt.md`](../distribution/templates/agent-bootstrap.prompt.md)

에이전트는 대화에서 받은 값으로 `install-youpd-*.sh` 를 실행하고 `.youpd/project.json` 을 채웁니다.

### 설치 후 (짧은 프롬프트)

```text
.youpd/project.json 과 docs/channel-brief.md 를 읽고 youpd 절차로 진행해줘.
지금 할 일: <의도>
```

---

## 대안: full clone (비권장 · 운영자)

```bash
git clone https://github.com/ssota-labs/youpd-skills.git my-channel
```

개발용 `AGENTS.md`·Notion 워크플로 스킬이 함께 옵니다. Cursor에서 **반드시 채널 전용 하위 폴더만** 열거나, 위 **런타임 스크립트**를 쓰세요.

---

## Cursor 플러그인 JSON (정식 마켓 없이)

런타임 디렉터리의 [`.cursor-plugin/plugin.json`](../.cursor-plugin/plugin.json):

```json
{ "name": "youpd-skills", "skills": ["skills/youpd-skills"] }
```

`--cursor-link` 는 `~/.cursor/plugins/local/youpd-skills` → 런타임 경로 심볼릭 링크입니다. 상세: [distribution.md](./distribution.md).

---

## 예시 데이터

| 파일 | 용도 |
|------|------|
| [`distribution/templates/youpd.project.example.json`](../distribution/templates/youpd.project.example.json) | `project.json` 예시 |
| [`docs/projects/senior-cafe-tv/`](../docs/projects/senior-cafe-tv/README.md) | 예시 시나리오 설명 (정적 복사본 대신 템플릿 권장) |

---

## 자주 하는 실수

| 증상 | 해결 |
|------|------|
| 에이전트가 Notion·YPDS 언급 | full clone 루트를 연 상태 → 채널 폴더만 열기 또는 runtime 설치 |
| 스크립트를 찾을 수 없음 | `project.json` 의 `toolkit.path` 확인 |
| DB 위치 혼동 | 채널 폴더에서 `YOUPD_WORKSPACE_DB` 또는 `project.json` 의 `workspace.dbPath` |

---

## 관련

- [distribution.md](./distribution.md) — dev vs runtime, sparse, Cursor JSON
- [README.md](../README.md)
