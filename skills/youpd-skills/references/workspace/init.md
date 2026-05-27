# Route: `workspace/init`

> 워크스페이스 SQLite DB 파일 생성 + 마이그레이션 적용 + `workspace_meta` 시드.
> 본 스킬의 모든 다른 라우트는 이 라우트가 한 번 이상 성공한 워크스페이스에서만 동작한다.

## 언제 이 라우트를 사용하나

- 사용자가 새 youpd 작업 디렉터리에서 처음 작업을 시작할 때
- 사용자가 명시적으로 "DB 초기화", "워크스페이스 만들어줘", "스키마 마이그레이션 적용" 등을 요청할 때
- 다른 라우트 진입 시 `./.youpd/workspace.db` 가 없거나, 스키마 ledger 가 비어 있을 때 → 자동으로 본 라우트로 fallback

## 입력 (CLI args / env)

스크립트: `skills/youpd-skills/scripts/workspace/init.ts`

| 입력 | 형태 | 설명 | 기본값 |
|---|---|---|---|
| `--db <path>` | CLI flag | 워크스페이스 DB 파일 경로 override | `process.env.YOUPD_WORKSPACE_DB` 또는 `./.youpd/workspace.db` |
| `--label <text>` | CLI flag | `workspace_meta.schema_version_label` | `process.env.YOUPD_SCHEMA_VERSION_LABEL` 또는 `package.json#version` |
| `--json` | CLI flag | stdout 출력 포맷을 JSON 한 줄로 강제 (기본) | always JSON |

호출 예시:

```bash
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --db /tmp/test.db --label phase1-test
pnpm init        # package.json scripts 의 단축
```

## 사전 조건

1. Node 24 (`node --version`) + `pnpm install` 완료. DB 접근은 Node 내장 `node:sqlite` (`DatabaseSync`) 사용 — 네이티브 빌드 불필요.
2. 입력된 `--db` 경로의 부모 디렉터리에 쓰기 권한이 있어야 한다 (없으면 자동 생성 시도).

위가 충족되지 않으면 스크립트는 즉시 `exit code != 0` + stderr 에 한국어 안내를 출력한다.

## 동작 순서 (스크립트 내부)

1. `--db` 인수 + env + 기본값 순서로 DB 경로 결정.
2. `path.dirname(dbPath)` 디렉터리가 없으면 `mkdir -p` (recursive).
3. Node 내장 `node:sqlite` (`DatabaseSync`) 로 DB 파일 열기. 없으면 자동 생성됨.
4. `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON` 설정.
5. `scripts/lib/db/migrate.ts#runMigrations(db, migrationsDir)` 호출:
   - `000_bootstrap.sql` 을 unconditional 하게 exec (CREATE IF NOT EXISTS + INSERT OR IGNORE 라 idempotent).
   - `schema_migrations` ledger 의 모든 행을 읽어 `applied: Set<string>` 구성.
   - `migrationsDir` 에서 `.sql` 파일을 lex 순으로 열거.
   - ledger 에 없는 파일을 한 파일 = 한 트랜잭션으로 적용 + ledger 에 INSERT.
   - 트랜잭션 실패 시 해당 파일은 ledger 에 기록 안 됨 → 다음 호출에서 재시도.
6. `workspace_meta` 가 비어 있으면 `(id=1, created_at=NOW, schema_version_label=<입력 또는 기본>)` 1행 INSERT. 이미 있으면 skip.
7. 결과를 JSON 한 줄로 stdout 에 출력 + `exit 0`.

## 출력 (stdout, JSON 1 line)

```typescript
interface WorkspaceInitResult {
  ok: true;
  dbPath: string;             // 절대 경로
  created: boolean;           // DB 파일이 이번 호출에서 새로 생성됐는지
  appliedMigrations: string[];// 이번 호출에서 ledger 에 새로 기록된 파일들 (lex 순)
  totalLedgerCount: number;   // 적용 후 schema_migrations 행 수
  schemaVersionLabel: string; // workspace_meta 에 저장된 라벨
  workspaceMetaCreated: boolean; // workspace_meta 행을 이번에 새로 만들었는지
}
```

에러 시:

```typescript
interface WorkspaceInitError {
  ok: false;
  code: 'NODE_VERSION' | 'DB_DIR_DENIED' | 'MIGRATION_FAILED' | 'UNKNOWN';
  message: string;            // 사용자용 한국어 1-2 문장
  detail?: unknown;           // 마지막 SQL 파일명, errno 등
}
```

## 일관성 / 멱등성

- **재실행 안전**: 같은 디렉터리에서 두 번 호출하면 `appliedMigrations: []`, `workspaceMetaCreated: false` 가 반환되어야 한다 (smoke test 의 핵심).
- **부분 실패 복구**: 한 파일이 트랜잭션 도중 실패하면 그 파일은 ledger 에 기록되지 않으므로, 원인 수정 후 재호출하면 그 파일부터 다시 시도한다. 그러나 이전 파일이 만든 테이블은 그대로 남아 있을 수 있으므로, **DDL 순서가 바뀌는 fix** 는 새 마이그레이션 파일로만 추가할 것.
- **DB 파일 손상**: `node:sqlite` 가 파일을 못 열면 즉시 `code: 'UNKNOWN'` + 사용자에게 수동 삭제 안내. 자동 백업/복구는 P1.0 범위 밖.

## 에이전트 호출 절차 (이 reference 를 읽은 LLM 이 따라야 할 단계)

1. 사용자에게 DB 경로를 확인 (기본값으로 진행할지 묻기). 사용자가 묵시 동의하면 기본값.
2. Shell 도구로 `pnpm tsx skills/youpd-skills/scripts/workspace/init.ts` (또는 `pnpm init`) 실행.
3. stdout 의 JSON 한 줄을 파싱.
4. `ok: true` 인 경우:
   - `created === true` → "새 워크스페이스를 만들었어요. 적용된 마이그레이션 N개." 형태로 보고.
   - `created === false && appliedMigrations.length > 0` → "기존 워크스페이스에 마이그레이션 N개를 새로 적용했어요." 보고.
   - `created === false && appliedMigrations.length === 0` → "워크스페이스는 이미 최신 상태예요." 보고.
5. `ok: false` 인 경우 `code` 별 한국어 안내:
   - `NODE_VERSION` → "Node 24 가 필요합니다."
   - 그 외 → `message` 그대로 사용자에게 보여주고 detail 도 함께 1-2줄.

## 변경 이력

- 2026-05-27: P1.0 scope 정리 — migration은 `000_bootstrap.sql`, `001_workspace.sql` 2개만 적용. YouTube/glossary domain schema는 Phase 1 Blueprint 및 후속 milestone D3에서 도입.
- 2026-05-26: P1.0 초기 작성.
