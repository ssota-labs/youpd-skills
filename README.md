# youpd-skills

> **상태**: Phase 1 (내부 dogfood). Phase 4 공개 예정.

콘텐츠 기획·제작 워크플로를 에이전트(Claude Code · Codex · Cursor)가 자동 수행하도록 만드는 OSS 스킬 킷. YouTube/Threads/TikTok/Instagram Shorts/카드뉴스 5채널을 단계적으로 닫아간다.

- **레포 정체성**: BYOK + 로컬 완결 + 사설 백엔드 0
- **결과 적재**: 사용자 작업 디렉터리 하위 `./.youpd/workspace.db` (SQLite 단일 파일, SSOT)
- **배포 모델**: GitHub clone (현재) · Claude Code Plugin Marketplace · Cursor 호환

## 유저 설치

마켓플레이스 없이 쓸 때 **full clone은 개발 파일(`AGENTS.md`, `.cursor/skills` …)까지 같이 옵니다.** 채널 운영자는 **런타임만** 받는 것을 권장합니다.

```bash
# 1) 툴킷 (스킬·스크립트만, sparse)
bash scripts/install-youpd-runtime.sh --dir ~/youpd/youpd-skills --cursor-link

# 2) 채널 폴더 (본인 id·한 줄 소개로 바꿈)
bash scripts/install-youpd-project.sh \
  --dir ~/youpd/my-channel --id my-channel --name "My Channel" \
  --one-liner "채널 한 줄 소개" --toolkit ~/youpd/youpd-skills

# 3) DB + 키 (툴킷 디렉터리에서)
cd ~/youpd/youpd-skills && cp -n .env.example .env.local
YOUPD_WORKSPACE_DB=~/youpd/my-channel/.youpd/workspace.db \
  pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label my-channel
```

**Cursor에서는 `~/youpd/my-channel` 만 연다.** 플러그인 JSON: [`.cursor-plugin/plugin.json`](.cursor-plugin/plugin.json).

| 문서 | 내용 |
|------|------|
| [docs/installation.md](docs/installation.md) | 설치 절차 |
| [docs/distribution.md](docs/distribution.md) | dev vs runtime, Cursor 로컬 플러그인 |
| [distribution/templates/agent-bootstrap.prompt.md](distribution/templates/agent-bootstrap.prompt.md) | **동적** 에이전트 초기 프롬프트 |

## 빠른 시작 (개발자)

```bash
pnpm install
pnpm test:smoke      # workspace/init 멱등성 + 마이그레이션 ledger 검증
pnpm init            # 현재 디렉터리에 ./.youpd/workspace.db 생성
```

**Git worktree** (`.cursor/worktrees/...` 등): ignored 파일은 복사되지 않으므로 메인 클론의 `.env.local`을 링크한다.

```bash
pnpm install
pnpm worktree:env    # .env.local ← main worktree symlink
```

메인 클론 최초 1회: `cp .env.example .env.local` 후 키 입력. 워크트리마다 `pnpm worktree:env`만 실행하면 된다.

## 디렉터리 구조

```
youpd-skills/
  .claude-plugin/
    marketplace.json                 # 마켓플레이스 매니페스트 (1개 플러그인)
    plugin.json                      # 본 플러그인 매니페스트
  skills/
    youpd-skills/                    # ★ 단일 스킬 (라우팅 + progressive disclosure)
      SKILL.md                       # 라우터 (≤200줄, 항상 LLM에 로드)
      references/                    # progressive disclosure 본문
        workspace/init.md
        research/youtube/
          INDEX.md
          add-keyword.md
          search-by-keyword.md
          ... 등
      scripts/                       # 에이전트가 호출하는 실행 스크립트
        workspace/init.ts
        research/youtube/...         # P1.1+
        lib/
          db/                        # node:sqlite 클라이언트 + 마이그레이션 러너
          migrations/                # 손으로 쓴 .sql, lex 순 forward-only
          types/                     # workspace.ts (P1.0); P1.1+ domain types added per milestone
        __tests__/                   # node:test 기반 smoke
  package.json                       # 개발/빌드 (Node 24 + node:sqlite + zod v4)
  tsconfig.json
  .env.example
  .gitignore
```

## 설계 원칙

- **단일 SKILL + 라우팅**: 마켓플레이스에는 `youpd-skills` 한 개만 노출. 도메인별 동작은 `references/<route>.md`를 progressive disclosure로 추가 로드해 LLM에 주입.
- **ORM 없음**: Node 내장 `node:sqlite` prepared statement 직접 사용. 마이그레이션은 손으로 쓴 `.sql` 파일을 lex 순으로 적용.
- **Forward-only**: 머지된 마이그레이션 파일은 신규 파일로만 수정. 자동 다운 마이그레이션 없음.
- **P1.0 scope**: workspace bootstrap만 구현 (`schema_migrations`, `workspace_meta`). YouTube/glossary domain tables는 Phase 1 Blueprint에 정의되어 있으며 P1.1+ D3에서 migration으로 도입.
- **플랫폼별 테이블 접두사**: `youtube_*` 등. 새 플랫폼 추가는 새 .sql 파일만 더하는 방식.

## 관련 문서 (Notion 내부)

- [youpd-skills 제품 로드맵](https://www.notion.so/36c346dac4568198b8f9c4610244d020)
- [Phase 1 상세 로드맵 — YouTube 리서치](https://www.notion.so/36c346dac4568145b8d2fad3f1212d0f)
- [Phase 1 Technical Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c)
- [P1.0 기획안 — DB 스키마 부트스트래핑](https://www.notion.so/36c346dac45681379c4ef2d1df1226b4)
- [P1.0 설계문서 — DB 스키마 부트스트래핑](https://www.notion.so/36d346dac45681faa27fdfb0b39ef9fe)

## 라이선스

MIT (Phase 4 공개 시점 부여 예정. 현재는 내부 사용 중).
