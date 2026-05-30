# youpd-skills

> **상태**: Phase 1 (내부 dogfood). Phase 4 공개 예정.

콘텐츠 기획·제작 워크플로를 에이전트(Claude Code · Codex · Cursor)가 자동 수행하도록 만드는 OSS 스킬 킷. YouTube/Threads/TikTok/Instagram Shorts/카드뉴스 5채널을 단계적으로 닫아간다.

- **레포 정체성**: BYOK + 로컬 완결 + 사설 백엔드 0
- **결과 적재**: 사용자 작업 디렉터리 하위 `./.youpd/workspace.db` (SQLite 단일 파일, SSOT)
- **배포 모델**: GitHub clone (현재) · Claude Code Plugin Marketplace · Cursor 호환

## 유저 설치 (에이전트에게 맡기기)

마켓플레이스 없이 쓰려면 **GitHub에서 clone** 하면 됩니다. 보통 **폴더 이름 = 채널/프로젝트 이름**으로 clone 합니다.

```bash
mkdir -p ~/youpd && cd ~/youpd
git clone https://github.com/ssota-labs/youpd-skills.git senior-cafe-tv
cd senior-cafe-tv
pnpm install
cp .env.example .env.local   # YOUTUBE_API_KEY 등 입력
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label senior-cafe-tv
```

Cursor(또는 다른 에이전트)에 **설치 전체를 맡기려면** 아래 프롬프트를 채팅에 붙여 넣으세요. 상세·패턴 B(툴킷/채널 분리)는 [docs/installation.md](docs/installation.md) 를 보세요.

<details>
<summary><strong>초기 설치 프롬프트 (복사용)</strong></summary>

```text
나는 YouTube 채널 프로젝트 "senior-cafe-tv" 을 youpd-skills 로 시작하려고 해.

저장소: https://github.com/ssota-labs/youpd-skills.git
설치 위치: ~/youpd
프로젝트 폴더 이름: senior-cafe-tv (clone 할 때 이 이름을 쓸 것)
채널 설명: 시니어와 4050 자녀를 위한 유튜브 채널. 건강·일상·가족 소통 콘텐츠.

다음을 순서대로 직접 실행하고, 각 단계 결과를 한국어로 짧게 보고해줘.

1. Node 24+ 와 pnpm 10+ 설치 여부 확인. 부족하면 설치 방법 안내.
2. ~/youpd 가 없으면 만들고,
   git clone https://github.com/ssota-labs/youpd-skills.git senior-cafe-tv 실행.
3. cd ~/youpd/senior-cafe-tv 후 pnpm install.
4. .env.local 이 없으면 .env.example 복사. YOUTUBE_API_KEY 가 비어 있으면 .env.local 편집 요청 (키 값은 채팅에 출력하지 말 것).
5. pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label senior-cafe-tv
6. docs/projects/senior-cafe-tv/channel-brief.md 를 읽고, 프로젝트 루트에 docs/channel-brief.md 생성.
7. 다음에 할 만한 youpd 작업 한 가지 제안.

스크립트는 skills/youpd-skills/SKILL.md 와 references/ 계약만 따를 것.
```

</details>

- **예시 채널 문서**: [docs/projects/senior-cafe-tv/](docs/projects/senior-cafe-tv/README.md)
- **설치 가이드 전문**: [docs/installation.md](docs/installation.md)

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
