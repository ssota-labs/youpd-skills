# AGENTS.md

Instructions for AI coding agents working in **ssota-labs/youpd-skills**.

## Project Overview

**youpd-skills** is an open-source agent skill kit for multi-channel content planning and production workflows (YouTube, Threads, TikTok, Instagram Shorts, card news). Phase 1 (internal dogfood) focuses on **YouTube long-form research**: collect → snapshot → curate references → analyze title/thumbnail/intro.

| Principle | Detail |
|---|---|
| **Local-first SSOT (runtime)** | User workspace at `./.youpd/workspace.db` (single SQLite file) — this is the SSOT for the *shipped product*, not for our development process (see [Development SSOT: Notion](#development-ssot-notion)) |
| **BYOK** | User supplies `YOUTUBE_API_KEY`, LLM keys, etc. Never commit secrets |
| **No hosted backend (in the product)** | The shipped plugin has no SaaS, MCP server, CLI binary, or Notion dependency. This constraint is about *runtime*; our *development workflow* uses Notion as SSOT (see below) |
| **Single package** | Not a monorepo. One semver, one plugin, one marketplace skill |
| **Phase 4 = public** | Currently private/internal. MIT license at public launch |

**Runtime:** Node **24+**, pnpm **10+**, TypeScript ESM, **Zod v4** at boundaries.

**Database:** Node built-in **`node:sqlite`** (`DatabaseSync`). No ORM, no `better-sqlite3`. Prepared statements only. Forward-only `.sql` migrations with `schema_migrations` ledger.

**Distribution:** Claude Code plugin (`.claude-plugin/`). On install, everything under `skills/` ships to the user's environment.

### Architecture: Single SKILL + Progressive Disclosure

Do **not** create multiple `SKILL.md` folders per route. The agreed structure:

```
skills/youpd-skills/
  SKILL.md              # Router only (≤200 lines, always loaded)
  references/           # Route contracts (read on demand)
    workspace/init.md
    research/youtube/*.md
  scripts/              # Executable TS (shell-invoked)
    workspace/init.ts
    research/youtube/   # P1.1+ stubs
    lib/
      db/               # client.ts, migrate.ts
      migrations/       # P1.0: 000_bootstrap.sql, 001_workspace.sql
      types/            # workspace.ts (P1.1+ domain types per milestone)
    __tests__/          # node:test smoke tests
```

**Agent flow for end users:**

1. Load `skills/youpd-skills/SKILL.md` (router).
2. **Read** the matching `references/<route>.md` for the user's intent.
3. **Run** the script path specified in that reference via shell.
4. Parse **one JSON line** from stdout and summarize for the user (Korean OK for user-facing text).

### Shipped skill content (no dev vocabulary)

`skills/youpd-skills/SKILL.md` and `skills/youpd-skills/references/**` ship with the plugin and are loaded by end-user agents. Use **product / user vocabulary** there only.

**Do not use** internal development labels or process terms, including:

- Milestone or phase labels (`P1.0`, `P1.1`, `Phase 1`, `Phase 2-3`, …)
- Engineering process words (`stub`, `ADR`, `D3`, `Blueprint`, `milestone`, `dogfood`, Notion as dev SSOT)
- Phase-style scope jargon (`out-of-scope` tied to a version — prefer **미지원** or **아직 제공하지 않음**)

**Do use** for route availability in `SKILL.md` and references:

| Label | Meaning |
|---|---|
| **사용 가능** | Script exists; agents may run the route |
| **준비 중** | Contract documented; not runnable yet — tell the user it is not available |
| **미지원** | Intentionally not offered (e.g. trending → route to `list-hot-videos`) |

When reporting to users, never cite phase numbers or internal version names. Say what works today and what is not available yet.

Implementation status, phase plans, and milestone tracking belong in **Notion** (development task database and linked docs) and in `scripts/**` / tests — not in shipped skill markdown or in this file. After changing route behavior, update route references with the availability labels above (not internal milestone IDs).

Design SSOT (Notion, internal): [Phase 1 Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c) and per-milestone PRD/D3 in the docs database.

---

## Development SSOT: Notion

**Notion is the source of truth for how we build this project.** The repository holds the code; Notion holds the *why* — decisions, specs, policies, guides, and task state. Git history alone loses the reasoning, so durable knowledge about the project must live in Notion where it persists across versions and contributors. (This is separate from the product runtime, whose SSOT is the local `./.youpd/workspace.db`. The shipped plugin still has no Notion dependency.)

### Development router (read first)

For **any** development request (work, reconciliation, new version, docs, implementation), start here. Skills are not auto-loaded every turn; this section is the always-on gate and intent router.

#### Step 0 — Notion (mandatory)

1. Confirm **Notion MCP** is connected. If not, stop — do not plan or code from memory.
2. Load context from the [development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513):
   - User named a task/version → fetch that row.
   - Otherwise → identify in-progress or next eligible row; confirm in one line before proceeding.
3. Document database (linked docs): `https://www.notion.so/5ac346dac45682cf98ed815c25b32d38`

#### Step 1 — Classify intent

| User / scheduler says | Intent | Read skill (Read tool) |
|---|---|---|
| 정합성 체크, reconciliation, drift audit | `reconcile` | `.cursor/skills/youpd-reconciliation/SKILL.md` |
| 작업 진행, continue task, implement, YPDS-* | `work` | See Step 2 |
| 새 버전, milestone setup, task template | `bootstrap-version` | `.cursor/skills/youpd-version-bootstrap/SKILL.md` |

**Reconcile default scope:** entire development task database (all `상태`), repo `main` at current HEAD — unless the user narrowed scope in chat.

#### Step 2 — `work` branch

Use the loaded task’s `작업 유형` and title:

| Route | Read skill |
|---|---|
| PRD 작성, 설계 작성, 상세 로드맵 작성; primary deliverable is Blueprint / Policy / ADR / dedicated Spec | `.cursor/skills/youpd-documentation-workflow/SKILL.md` |
| 구현, 검증 | `.cursor/skills/youpd-implementation-workflow/SKILL.md` |

**Small Spec/Policy patches** (single topic, same PR) → implementation skill Close-out, not documentation skill.

#### `work` → 구현/검증

Use [Project Overview](#project-overview) (runtime, DB), [Development Workflow](#development-workflow), [Testing Instructions](#testing-instructions), and [Code Style](#code-style) — these stay in AGENTS.md for long sessions. Before editing code, run the gate in `youpd-implementation-workflow` (`references/implementation-gate.md`).

### Search before you build

Search Notion for related tasks, ADRs, specs, and policies before creating duplicates.

### Notion docs and task board

- **Docs DB:** `https://www.notion.so/5ac346dac45682cf98ed815c25b32d38` — types, templates, anti-patterns: load [youpd-documentation-workflow](.cursor/skills/youpd-documentation-workflow/SKILL.md) when writing documents.
- **Tasks:** `상태` `대기`/`진행중`/`보류`/`완료`/`취소`; `작업 유형` PRD/설계/구현/검증/로드맵. Pick up → `진행중`; blocked → `보류`. Link outputs via `관련 문서`. **Do not** set `완료` unless the user asked — propose only.
- Record durable outcomes (decisions, contracts, policies); skip typo-only noise.

---

## Setup Commands

```bash
# Prerequisites: Node 24+, pnpm 10+
node --version   # must be >= 24
pnpm --version

pnpm install

# Git worktree (e.g. .cursor/worktrees/...): link BYOK from main clone
pnpm worktree:env

# Main clone first-time only (never commit .env.local)
cp .env.example .env.local
# fill YOUTUBE_API_KEY etc.; worktrees reuse it via pnpm worktree:env
```

**Workspace init** (creates `./.youpd/workspace.db` in cwd):

```bash
pnpm init
# or
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --db /tmp/test.db --label phase1-test
```

There is no dev server. All behavior is invoked through scripts or the skill router.

---

## Development Workflow

### Adding a new route (P1.1+ pattern)

1. Add **`references/<domain>/<action>.md`** — input/output contract, preconditions, error codes, script path.
2. Add **`scripts/<domain>/<action>.ts`** — must print **one JSON line** to stdout (`ok: true | false`).
3. Add a row to the routing table in **`skills/youpd-skills/SKILL.md`** (keep router ≤200 lines).
4. Update **`references/research/youtube/INDEX.md`** if YouTube domain.
5. Add tests if behavior is non-trivial (extend smoke or new `*.test.ts`).

Do **not** add a new `SKILL.md` per route.

### Database migrations

- Location: `skills/youpd-skills/scripts/lib/migrations/`
- Naming: lex order — `000–009` cross-platform, `010–019` YouTube, etc.
- **Forward-only:** never edit a merged migration file; add a new numbered file.
- **Unique constraints with `COALESCE`:** use `CREATE UNIQUE INDEX`, not inline `UNIQUE(...)` in `CREATE TABLE` (`node:sqlite` rejects expression constraints in table definitions).
- Runner: `scripts/lib/db/migrate.ts` — one file = one `BEGIN…COMMIT` transaction + ledger insert.
- Idempotency: re-running `pnpm init` on an existing DB must apply **zero** new migrations.

### Script conventions

- ESM: `"type": "module"`, import with `.ts` extension (see `tsconfig.json`).
- DB access via `openDb()` from `scripts/lib/db/client.ts`.
- Types in `scripts/lib/types/`; validate external input with Zod at script boundaries.
- Scripts emit structured JSON; never rely on unstructured stdout for agents.

Example:

```bash
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts
# stdout: {"ok":true,"dbPath":"...","created":true,...}
```

---

## Testing Instructions

```bash
pnpm typecheck          # tsc --noEmit
pnpm test:smoke         # migration runner + init.ts idempotency (preferred for DB changes)
pnpm test               # all tests under scripts/__tests__/
```

**Before merging DB or init changes**, always run:

```bash
pnpm typecheck && pnpm test:smoke
```

Smoke tests use temp SQLite files under the system temp dir; they do not touch `./.youpd/`. P1.0 smoke asserts **2** migrations (`000_bootstrap`, `001_workspace`), `schema_migrations` + `workspace_meta` tables, idempotent re-run, and `workspace_meta.id = 1` CHECK constraint.

Test location: `skills/youpd-skills/scripts/__tests__/*.test.ts` (Node built-in `node:test` + `tsx/esm`).

When adding P1.1+ scripts, add focused tests for: happy path, idempotency, missing env key rejection, and FK/CHECK constraint behavior where relevant.

### Shipped skill evals (product)

When changing `skills/youpd-skills/SKILL.md` or route references, also follow `docs/testing/skill-evaluation.md` (Notion: [스킬 테스트/평가 전략](https://www.notion.so/36f346dac456816084c0cea2d78e8827)). VERF / reconciliation do not replace this.

---

## Code Style

- **TypeScript strict** — match existing `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, etc.).
- **Minimal scope** — smallest correct diff; no unrelated refactors.
- **No ORM** — raw SQL via `db.prepare()` / `db.exec()`.
- **No over-abstraction** — prefer inline logic over one-off helpers.
- **Comments** — only for non-obvious business rules or migration rationale.
- **Secrets** — never commit `.env`, `.env.local`, API keys, or `*.db` files (see `.gitignore`).

### File layout rules

| Path | Purpose |
|---|---|
| `skills/youpd-skills/SKILL.md` | Router only; link to references, don't duplicate full contracts; no dev phase vocabulary (see [Shipped skill content](#shipped-skill-content-no-dev-vocabulary)) |
| `skills/youpd-skills/references/**` | Progressive disclosure docs for agents; same voice rules as `SKILL.md` |
| `skills/youpd-skills/scripts/**` | Runnable code (must ship with plugin) |
| `.claude-plugin/` | Marketplace + plugin manifest |
| Repo root `package.json` | Dev/build only; runtime deps = `zod` + Node 24 built-ins |

Plugin install copies **`skills/`** — scripts, references, migrations, and types must live **inside** `skills/youpd-skills/`, not repo-root `scripts/` or `migrations/`.

---

## Environment Variables

See `.env.example`. Key vars:

| Variable | When required |
|---|---|
| `YOUTUBE_API_KEY` | P1.1+ YouTube API routes |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | P1.4+ LLM analysis routes |
| `YOUPD_WORKSPACE_DB` | Optional override for DB path (default `./.youpd/workspace.db`) |
| `YOUPD_SCHEMA_VERSION_LABEL` | Optional override for `workspace_meta.schema_version_label` |

Reject and point to `.env.example` if a required key is missing — do not proceed with API calls.

---

## Out of Scope (do not implement here)

- Threads / TikTok / Instagram / card news (Phase 2–3)
- `plan` / `produce` domains (Phase 2+)
- Hosted server, MCP server, or Notion integration **as a product/runtime feature** (those belong to the main **youpd** product line). Note: Notion is still our *development* SSOT — see [Development SSOT: Notion](#development-ssot-notion) — that is a workflow practice, not a shipped dependency.
- CLI binary distribution
- Down migrations or automatic DB repair
- Project-scoped DB rows (`project_id`) — one task = one DB file

---

## Pull Request Guidelines

- **Repo:** `ssota-labs/youpd-skills` (GitHub)
- Run `pnpm typecheck` and `pnpm test:smoke` before opening a PR
- Title format: `[P1.x] Brief description` (e.g. `[P1.1] add search-by-keyword script`)
- Migration PRs: include smoke test updates if ledger/table expectations change
- Do not commit `.env*`, `node_modules/`, or `.youpd/` workspace files
- Keep D3/Notion design docs in sync when changing architecture (driver, folder layout, route contracts)

---

## Debugging & Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ExperimentalWarning: SQLite is an experimental feature` | Normal for `node:sqlite` on Node 24 | Safe to ignore in dev |
| `src refspec main does not match any` on push | No commits yet | `git add` + `git commit` first |
| `Migration failed: ... expressions prohibited in PRIMARY KEY` | Inline `UNIQUE(COALESCE(...))` | Use `CREATE UNIQUE INDEX` instead |
| `FOREIGN KEY constraint failed` in tests | Missing parent row or FKs off | Ensure migrations ran; `openDb()` sets `enableForeignKeyConstraints: true` |
| Push auth vs commit author mismatch | `git config user.email` ≠ GitHub account email | Align local git identity with GitHub profile if commits should link |

**Inspect workspace DB:**

```bash
pnpm init
sqlite3 .youpd/workspace.db ".tables"
sqlite3 .youpd/workspace.db "SELECT filename FROM schema_migrations ORDER BY filename;"
```

---

## Related Files (read first for context)

| File | Why |
|---|---|
| `skills/youpd-skills/SKILL.md` | End-user agent router |
| `skills/youpd-skills/references/workspace/init.md` | P1.0 route contract |
| `skills/youpd-skills/references/research/youtube/INDEX.md` | YouTube route index |
| `skills/youpd-skills/scripts/lib/db/migrate.ts` | Migration runner logic |
| `.cursor/skills/youpd-documentation-workflow/` | Notion document work (PRD, D3, Blueprint, Policy, ADR, dedicated Spec) |
| `.cursor/skills/youpd-implementation-workflow/` | 구현/검증 procedure (gate, close-out, small Spec patches) |
| `.cursor/skills/youpd-reconciliation/` | Full task DB ↔ `main` reconciliation (scheduler-friendly) |
| `.cursor/skills/youpd-version-bootstrap/` | New version Notion task templates |
| `README.md` | Human-oriented overview (Korean) |

When in doubt about schema or naming, follow the [Phase 1 Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c) for domain design and the milestone D3 (e.g. [P1.0 D3](https://www.notion.so/36c346dac45681faa27fdfb0b39ef9fe)) for what is implemented in code.

---

## Cursor Cloud specific instructions

### Node.js version

The project requires **Node 24+** for `node:sqlite` (`DatabaseSync`). The Cloud VM ships with Node 22 at `/exec-daemon/node`, which takes PATH priority over nvm. The update script installs Node 24 via nvm and prepends it to PATH so all subsequent commands use v24.

### No dev server

There is no dev server or web UI. All functionality is invoked via `pnpm tsx` scripts that emit one JSON line to stdout. The "hello world" verification is:

```bash
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --db /tmp/test.db --label test
```

### pnpm init caveat

`pnpm init` (the `package.json` script alias for `workspace/init.ts`) conflicts with pnpm's built-in `init` command when `package.json` already exists. Use the full command instead:

```bash
pnpm tsx skills/youpd-skills/scripts/workspace/init.ts
```

### SQLite experimental warning

`ExperimentalWarning: SQLite is an experimental feature` on Node 24 is expected and safe to ignore.

### BYOK keys

YouTube API and LLM keys are not needed for P1.0 tests or workspace init. They are only required for P1.1+ YouTube routes and P1.4+ analysis routes. Tests for those routes mock external APIs and do not require real keys.
