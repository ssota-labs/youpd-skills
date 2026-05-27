---
name: youpd-version-workflow
description: Guides youpd-skills version work from the Notion development task database. Use when the user asks to start, continue, identify, plan, or implement a youpd-skills phase/version task from Notion, mentions the youpd-skills development task database, or asks to work on the next version.
---

# youpd-skills Version Workflow

Use this skill to select and execute the next **youpd-skills** development unit from the Notion task database.

Notion task database:
`https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513`

## Core Rule

The implementation unit is a **version under a phase**. Do not start implementation until all required predecessor tasks are complete and the relevant PRD/design context has been read.

Normal sequence:

1. Phase roadmap
2. Phase-version PRD
3. Phase-version design
4. Phase-version development

If a predecessor is missing, blocked, or ambiguous, stop and report the dependency gap instead of implementing.

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

Choose the next work unit by dependency order, not by convenience.

Rules:

- A **development** task can start only if its roadmap, PRD, and design tasks are complete or explicitly accepted.
- A **design** task can start only if its phase-version PRD is complete or explicitly accepted.
- A **PRD** task can start only if the phase roadmap exists or the user explicitly asks to draft the roadmap first.
- If multiple eligible tasks exist, prefer the lowest unfinished phase-version number.
- If the current version is already in progress, continue it before starting a new version unless the user says otherwise.

### 3. Read The Required Context

Before creating an implementation plan, read:

- The phase roadmap
- The phase-version PRD
- The phase-version design
- `AGENTS.md`
- `README.md`
- Relevant current code on `main`

For `youpd-skills`, also read relevant route contracts:

- `skills/youpd-skills/SKILL.md`
- `skills/youpd-skills/references/**`
- Relevant `skills/youpd-skills/scripts/**`
- Relevant migrations in `skills/youpd-skills/scripts/lib/migrations/`

Do not plan from Notion alone. The implementation plan must reflect the current code on `main`.

### 4. Produce A Concrete Implementation Plan

Before editing code, summarize:

- Selected phase-version
- Notion task row(s) used
- Dependency status
- Documents read
- Current-code findings
- Files likely to change
- Verification commands
- Risks or open questions

Keep the plan specific enough that another agent could execute it.

### 5. Implement Conservatively

Follow project rules:

- Single SKILL + `references/<route>.md` progressive disclosure
- Do not create per-route `SKILL.md` files
- Runtime is Node 24+ with built-in `node:sqlite`
- No `better-sqlite3`, no ORM
- Scripts must emit one JSON line to stdout
- DB migrations are forward-only `.sql` files
- For `COALESCE` unique constraints, use `CREATE UNIQUE INDEX`, not inline `UNIQUE(...)`
- Keep all runtime files under `skills/youpd-skills/`
- Never commit secrets, `.env*`, `.youpd/`, or `*.db`

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
[roadmap/PRD/design task to do first]
```

