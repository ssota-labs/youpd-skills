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

### Implementation Status (Phase 1)

| Milestone | Status |
|---|---|
| **P1.0** — DB bootstrap, migrations, `workspace/init` | ✅ Done (`schema_migrations`, `workspace_meta` only) |
| **P1.1** — YouTube fetch routes (6 scripts) | 🚧 Reference stubs only |
| **P1.2–P1.5** — Snapshots, curation, analysis | 🚧 Reference stubs only |

Design SSOT (Notion, internal): [P1.0 D3](https://www.notion.so/36d346dac45681faa27fdfb0b39ef9fe), [Phase 1 Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c).

---

## Development SSOT: Notion

**Notion is the source of truth for how we build this project.** The repository holds the code; Notion holds the *why* — decisions, specs, policies, guides, and task state. Git history alone loses the reasoning, so durable knowledge about the project must live in Notion where it persists across versions and contributors. (This is separate from the product runtime, whose SSOT is the local `./.youpd/workspace.db`. The shipped plugin still has no Notion dependency.)

### Start every non-trivial task by connecting to Notion

Before doing meaningful work (planning, design, implementation, spec/policy changes), **request and confirm the Notion MCP connection first.** If the Notion MCP is unavailable, say so explicitly and do not pretend the SSOT was read or updated — surface it as a blocker rather than proceeding blind.

The development task database is:
`https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513`

### Search before you build — without being asked

Always assume relevant material may already exist. Before creating anything, search Notion for related tasks, ADRs, specs, policies, guides, and prior decisions, then reason about what you found. The goal is to think with the existing context, not to generate duplicates. Update or supersede an existing page when one fits; create a new page only when there is genuinely no suitable home.

This is proactive behavior: do it on your own initiative whenever the work plausibly touches existing knowledge, even if the user did not explicitly ask you to check Notion.

### What to record, and where

Capture durable knowledge as the right document type. The full document system (lifetimes, dependency order, per-type deliverables, naming) is defined in the **`youpd-version-workflow`** skill — read [`.cursor/skills/youpd-version-workflow/references/documentation-workflow.md`](.cursor/skills/youpd-version-workflow/references/documentation-workflow.md) before classifying or writing a document.

| What happened | Where it goes in Notion |
|---|---|
| A technical/architectural decision was made (driver, schema strategy, trade-off) | **ADR (D5)** — immutable; supersede with a new ADR, never edit retroactively |
| A current implementation contract changed (DB schema, route/CLI I/O, error codes, env vars) | **Topic Spec** — living, topic-based |
| A rule now recurs across versions (migration policy, naming, BYOK, error-code conventions) | **Policy** — cumulative |
| Version intent / user value / scope was defined | **D2 PRD** |
| Version implementation design (data model, API, algorithms for one version) | **D3 Tech Spec** |
| A version shipped | **D4 Release Notes** |
| Phase-wide route map / domain model / milestone plan | **Blueprint** |
| Task started, progressed, blocked, or finished | **Task board** row status update |

Use judgment about what is *durable*: record decisions, contract changes, policies, guides, root-cause/resolution of significant bugs, and test strategy. Skip ephemera like typo fixes, trivial refactors, or one-off command output — logging noise dilutes the SSOT.

### Keep the task board in sync

When you pick up a task, reflect its real state on the board (in progress → done/blocked). Do **not** mark a Notion task complete unless the user asked you to update task status — propose the status change and let the user confirm if there's any doubt.

### Order of operations for a typical change

1. Confirm Notion MCP is connected.
2. Search Notion + repo for related tasks, ADRs, specs, policies, prior decisions.
3. Classify the work type via `documentation-workflow.md` and check dependencies (roadmap → PRD → D3 → implementation).
4. Do the work in the repo.
5. Record durable outcomes in Notion (ADR / Spec / Policy / Release Notes as applicable) and update the task board.
6. Report what changed in both the repo and Notion, flagging any status update that needs user confirmation.

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
| `skills/youpd-skills/SKILL.md` | Router only; link to references, don't duplicate full contracts |
| `skills/youpd-skills/references/**` | Progressive disclosure docs for agents |
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
| `.cursor/skills/youpd-version-workflow/references/documentation-workflow.md` | Notion document system (ADR/Spec/Policy/PRD/D3/Release Notes) and dependency order |
| `README.md` | Human-oriented overview (Korean) |

When in doubt about schema or naming, follow the [Phase 1 Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c) for domain design and the milestone D3 (e.g. [P1.0 D3](https://www.notion.so/36c346dac45681faa27fdfb0b39ef9fe)) for what is implemented in code.
