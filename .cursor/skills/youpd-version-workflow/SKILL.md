---
name: youpd-version-workflow
description: Guides youpd-skills version work from the Notion development task database. Use when the user asks to start, continue, identify, plan, or implement a youpd-skills phase/version task from Notion, mentions the youpd-skills development task database, or asks to work on the next version.
---

# youpd-skills Version Workflow

Use this skill to select and execute the next **youpd-skills** development unit from the Notion task database.

Notion task database:
`https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513`

## Progressive References

Before classifying a task as PRD, 설계, 스펙, or 구현, read:

- [references/documentation-workflow.md](references/documentation-workflow.md) — document types, dependency order, and per-type deliverables (from [제품 문서화 가이드](https://www.notion.so/ada346dac45682dca9f001cfff8ae0fc))

## Core Rule

The work unit may be **documentation** (Blueprint, Policy, PRD, D3, Spec, release notes, ADR) or **implementation** (code/scripts/migrations). Do not start implementation until roadmap, PRD, and D3 are complete or explicitly accepted.

Normal sequence:

1. Phase roadmap / Blueprint
2. Cumulative Policy (when recurring rules emerge)
3. Phase-version PRD (D2)
4. Phase-version design (D3)
5. Phase-version development
6. Topic Spec updates and release notes (after or alongside implementation)

If a predecessor is missing, blocked, or ambiguous, stop and report the dependency gap instead of proceeding.

## Workflow

### 1. Read The Notion Task Database

Use the Notion MCP/database tools to inspect the task database before coding.

Identify:

- Current phase and version in progress
- Candidate next version
- Task status fields
- Dependency/predecessor fields
- Links to roadmap, PRD, and design documents
- Any explicit blockers or owner notes

If the database schema is unclear, fetch the database/source schema first, then query rows.

### 2. Determine The Next Work Unit

Read [references/documentation-workflow.md](references/documentation-workflow.md) and classify the task type before proceeding.

Choose the next work unit by dependency order, not by convenience.

Rules:

- A **development** task can start only if its roadmap, PRD, and D3 design tasks are complete or explicitly accepted.
- A **D3 design** task can start only if its phase-version PRD is complete or explicitly accepted.
- A **PRD** task can start only if the phase roadmap/Blueprint exists or the user explicitly asks to draft the roadmap first.
- A **Spec** task updates topic-level current contracts from implemented code — it is not a substitute for PRD or D3. Read migrations, route references, and tests on `main`.
- A **Blueprint** or **Policy** task may precede or run parallel to version PRD/D3 when phase-wide context or recurring rules are needed.
- If multiple eligible tasks exist, prefer the lowest unfinished phase-version number.
- If the current version is already in progress, continue it before starting a new version unless the user says otherwise.

### 3. Read The Required Context

Before creating a plan, read documents matching the classified work type (see [references/documentation-workflow.md](references/documentation-workflow.md)):

| Work type | Read |
|---|---|
| PRD | Phase roadmap/Blueprint, D1 product overview |
| D3 design | Version PRD, Blueprint, applicable Policy |
| Spec | Current code on `main`, migrations, route references, tests |
| Implementation | Roadmap, PRD, D3, plus repo docs below |

Always read for implementation and spec work:

- `AGENTS.md`
- `README.md`
- Relevant current code on `main`

For `youpd-skills`, also read relevant route contracts:

- `skills/youpd-skills/SKILL.md`
- `skills/youpd-skills/references/**`
- Relevant `skills/youpd-skills/scripts/**`
- Relevant migrations in `skills/youpd-skills/scripts/lib/migrations/`

Do not plan from Notion alone. Plans for implementation and spec work must reflect the current code on `main`.

### 4. Produce A Concrete Plan

Before editing code or Notion docs, summarize:

- Selected phase-version and **task type** (PRD / D3 / Spec / implementation / other)
- Notion task row(s) used
- Dependency status
- Documents read
- Current-code findings (for Spec and implementation)
- Deliverables or files likely to change
- Verification commands (for implementation)
- Risks or open questions

Keep the plan specific enough that another agent could execute it.

### 5. Execute Conservatively

For **implementation**, follow project rules:

- Single SKILL + `references/<route>.md` progressive disclosure
- Do not create per-route `SKILL.md` files
- Runtime is Node 24+ with built-in `node:sqlite`
- No `better-sqlite3`, no ORM
- Scripts must emit one JSON line to stdout
- DB migrations are forward-only `.sql` files
- For `COALESCE` unique constraints, use `CREATE UNIQUE INDEX`, not inline `UNIQUE(...)`
- Keep all runtime files under `skills/youpd-skills/`
- Never commit secrets, `.env*`, `.youpd/`, or `*.db`

For **PRD, D3, Spec, Policy, Blueprint**, follow the deliverable guidance in [references/documentation-workflow.md](references/documentation-workflow.md). Do not mix document types (e.g. implementation detail in PRD, unimplemented Blueprint items in Spec).

### 6. Verify

Run at minimum after substantive code changes:

```bash
pnpm typecheck
pnpm test:smoke
```

For DB/init changes, both must pass before reporting completion. For a new route, add focused tests and run the relevant test command.

### 7. Report Back

End with:

- What version/task was worked on
- What changed
- Dependency assumptions
- Verification results
- Any Notion status update that still needs user confirmation

Do not mark Notion tasks complete unless the user asked you to update task status.

## Blocker Response Template

If dependencies are not satisfied, respond with:

```markdown
Cannot start implementation yet.

Selected candidate: [phase-version/task]
Blocked by:
- [missing/incomplete dependency]
- [missing PRD/design link, if any]

Next recommended action:
[roadmap/Blueprint/PRD/D3/Spec task to do first — see references/documentation-workflow.md]
```

