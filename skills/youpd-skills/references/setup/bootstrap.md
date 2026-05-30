# Route: `setup/bootstrap`

> 툴킷(스킬 폴더) 준비: Node/pnpm 검증, **`pnpm install` 자동 실행**, YouTube BYOK.
> 채널 워크스페이스의 `workspace/init` **전에** 에이전트가 실행한다. 유저에게 `pnpm install` 을 요청하지 않는다.

## 사전 조건

- `references/setup/install-skills.md` — `npx skills add` 로 툴킷(SKILL_ROOT)이 이미 설치되어 있어야 한다.

## 언제

- 채널 프로젝트에서 youpd 를 **처음** 쓸 때
- (권장) `setup/channel-project` 로 `.youpd/project.json` 생성 후
- `workspace/init` 또는 YouTube API 라우트 진입 전
- `node_modules` 가 없거나 `YOUTUBE_API_KEY` 가 없을 때

## 스크립트

`scripts/setup/bootstrap.ts` — **SKILL_ROOT**(본 스킬이 설치된 디렉터리)에서 실행:

```bash
pnpm exec tsx scripts/setup/bootstrap.ts
```

채널 폴더가 cwd 여도 위 명령은 **`pnpm --dir <SKILL_ROOT>`** 로 실행한다.

## 동작

1. Node 24+ 확인
2. `SKILL_ROOT/node_modules` 없으면 → `pnpm install` (SKILL_ROOT)
3. `SKILL_ROOT/.env.local` 로드
4. `YOUTUBE_API_KEY` 없으면 → 실패 JSON + env surface 안내 (아래)

## BYOK — HTML 입력 (`setup/env`)

키가 없으면 bootstrap stdout:

```json
{
  "ok": false,
  "code": "missing_api_key",
  "envSetup": {
    "serveCommand": "pnpm exec tsx scripts/setup/env.ts --mode serve --port 3848"
  }
}
```

에이전트 절차:

1. `serveCommand` 를 **백그라운드**로 실행 (SKILL_ROOT, `127.0.0.1` 만)
2. stdout 의 `url` 을 유저에게 전달 — **키 값은 채팅에 쓰지 않음**
3. 유저가 브라우저에서 저장 후 알려주면 프로세스 종료
4. `pnpm exec tsx scripts/setup/env.ts --mode check` 로 확인
5. bootstrap 재실행 → 성공 후 `workspace/init`

## stdout (성공)

```json
{
  "ok": true,
  "skillRoot": "/path/to/youpd-skills",
  "depsInstalled": true,
  "youtubeKeyConfigured": true,
  "nodeModulesPresent": true
}
```

## 에러 코드

| code | 조치 |
|------|------|
| `node_version` | Node 24+ 설치 |
| `pnpm_missing` | pnpm 10+ 설치 |
| `install_failed` | SKILL_ROOT 에서 `pnpm install` 로그 확인 |
| `missing_api_key` | `setup/env` serve → 저장 → bootstrap 재실행 |

## 채널 vs 툴킷

| 위치 | 내용 |
|------|------|
| **SKILL_ROOT** | `node_modules`, `.env.local`, 스크립트 |
| **채널 cwd** | `./.youpd/workspace.db`, `docs/channel-brief.md` |

LLM API 키는 사용하지 않는다. YouTube Data API 키만 BYOK.
