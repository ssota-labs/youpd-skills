# 배포 모델: 개발 레포 vs 유저 런타임

## 문제

`git clone` 으로 받으면 **제품(스킬)** 과 **개발 도구**가 한꺼번에 옵니다.

| 포함됨 | 용도 |
|--------|------|
| `skills/youpd-skills/` | ✅ 유저·에이전트가 쓸 스킬·스크립트 |
| `AGENTS.md`, `.cursor/skills/` | ❌ Notion·구현 워크플로 (기여자용) |
| `evals/`, `docs/testing/` | ❌ 내부 검증 |

Cursor는 워크스페이스 루트의 `AGENTS.md` 를 자주 읽습니다. 채널 운영자가 **전체 레포를 채널 이름으로 연 경우** 에이전트가 개발 SSOT 절차까지 따라가려 할 수 있어, 유저 경로와 개발 경로를 **분리**하는 것이 좋습니다.

## 권장 구조 (동적·2폴더)

```
~/youpd/
  youpd-skills/          ← 런타임만 (sparse install)
  senior-cafe-tv/        ← 채널 워크스페이스 (Cursor에서 여는 폴더)
    .youpd/project.json  ← 프로젝트 메타 (동적)
    .youpd/workspace.db
    docs/channel-brief.md
```

- **툴킷**: 스크립트·`node_modules`·`.env.local`
- **채널 폴더**: DB·브리프·팀 메모만 — `AGENTS.md` 없음

`.youpd/project.json` 스키마: [`distribution/templates/youpd.project.schema.json`](../distribution/templates/youpd.project.schema.json)

## 1) 런타임만 받기 (AGENTS.md 제외)

```bash
bash scripts/install-youpd-runtime.sh --dir ~/youpd/youpd-skills
```

내부적으로 `git sparse-checkout` 으로 [`distribution/runtime-manifest.json`](../distribution/runtime-manifest.json) 에 적힌 경로만 체크아웃합니다.

채널 폴더 생성:

```bash
bash scripts/install-youpd-project.sh \
  --dir ~/youpd/my-channel \
  --id my-channel \
  --name "My Channel" \
  --one-liner "한 줄 소개" \
  --toolkit ~/youpd/youpd-skills
```

## 2) Cursor 로컬 플러그인 (JSON, 정식 마켓 없이)

정식 마켓플레이스 없이도 **매니페스트 JSON** 으로 스킬 경로만 등록할 수 있습니다.

[`/.cursor-plugin/plugin.json`](../.cursor-plugin/plugin.json):

```json
{
  "name": "youpd-skills",
  "skills": ["skills/youpd-skills"]
}
```

로컬 등록 (런타임 설치 후):

```bash
bash scripts/install-youpd-runtime.sh --dir ~/youpd/youpd-skills --cursor-link
```

→ `~/.cursor/plugins/local/youpd-skills` 가 런타임 디렉터리를 가리킵니다. Cursor는 **skills/** 만 플러그인 컴포넌트로 로드하고, `AGENTS.md` 는 워크스페이스에 없으면 로드하지 않습니다.

**중요**: Agent가 스크립트를 실행할 때의 cwd·`YOUPD_WORKSPACE_DB` 는 **채널 폴더** 기준으로 맞춥니다 (`.youpd/project.json` 의 `toolkit.path` 참고).

Claude Code는 기존 [`.claude-plugin/`](../.claude-plugin/plugin.json) 마켓 경로를 그대로 씁니다.

## 3) 동적 설치 프롬프트

고정 예시(`senior-cafe-tv`) 대신:

- [`distribution/templates/agent-bootstrap.prompt.md`](../distribution/templates/agent-bootstrap.prompt.md) — 복사용 프롬프트 (값은 대화·`project.json` 에서 채움)
- [`distribution/templates/youpd.project.example.json`](../distribution/templates/youpd.project.example.json) — 예시 JSON 한 파일

에이전트 절차 요약: **runtime 스크립트 → project 스크립트 → init → 채널 폴더를 Cursor로 열기**.

## 4) full clone 은 언제?

| 대상 | 방법 |
|------|------|
| ssota-labs 기여자 | 전체 clone + `AGENTS.md` |
| 채널 운영자 | `install-youpd-runtime.sh` + `install-youpd-project.sh` |
| 실험·포크 | full clone 가능하나 Cursor는 **채널 하위 폴더만** 열 것을 권장 |

## 5) 이후 공개 배포

- **Cursor Marketplace**: 동일 `.cursor-plugin/plugin.json` 제출
- **GitHub Release**: CI에서 runtime tarball (`runtime-manifest` 기준)
- **npm**: 별도 패키지 검토 (현재는 스크립트가 레포 루트 `package.json` 에 의존)

---

관련: [installation.md](./installation.md)
