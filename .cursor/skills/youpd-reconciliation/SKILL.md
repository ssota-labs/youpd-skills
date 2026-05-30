---
name: youpd-reconciliation
description: Run development SSOT reconciliation for youpd-skills — Notion task database (full), linked docs, and repo main. Use when the user asks for 정합성 체크, reconciliation, drift audit, or when a scheduler runs periodic consistency checks.
---

# youpd-skills Reconciliation

Reconcile **Notion development SSOT** with **repo `main`**. Default scope is the **entire** development task database (all rows, all statuses), unless the user narrows scope in chat.

## Prerequisites

- Notion MCP connected (AGENTS.md gate must already have passed).
- Know the current `main` revision (`git rev-parse HEAD`).

## Progressive references

Read before executing checks:

- [references/checklist.md](references/checklist.md) — axes, severity, per-row checks
- [references/report-template.md](references/report-template.md) — output format

## Workflow

### 1. Load full task database

Query the [development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513) with **no status filter** unless the user explicitly limited scope.

For each row (or paginate until complete), capture at minimum:

- Title / task ID (e.g. `YPDS-P1.4-IMPL`)
- `상태`, `작업 유형`
- `Blocked by`, `Blocking`, `종속성`
- `관련 문서` (linked PRD, D3, Spec, etc.)

### 2. Run reconciliation axes

Apply [references/checklist.md](references/checklist.md) across **all** loaded tasks:

- **A** Task ↔ Code (`완료` vs `main` implementation)
- **B** Doc ↔ Code (linked Spec/D3 vs migrations, scripts, tests)
- **C** Task ↔ Doc (`관련 문서`, empty PRD/D3 on IMPL)
- **E** Dependency graph (predecessor milestones in Notion vs code)

Do **not** audit shipped product skill contracts (`skills/youpd-skills/SKILL.md` Layer B) unless the user or a linked VERF task explicitly requests it — point to `docs/testing/skill-evaluation.md` instead.

### 3. File run log in Notion (required)

After every reconciliation run, create **one** page in [유PD 프로덕트 팀 문서](https://www.notion.so/5ac346dac45682cf98ed815c25b32d38) per [references/report-template.md](references/report-template.md):

- `태그` = **`정합성`**
- Title `정합성 체크 — YYYY-MM-DD`
- Body: scope, `main` SHA, which axes (A/B/C/E) ran, row count, one-line P0–P3 counts

**Do not** write reconciliation reports to the repo. Notion is the only durable log.

### 4. Report back in chat

Share the Notion URL, P0/P1 counts, top fixes, and suggested task moves (`보류` / doc tasks). Do **not** set tasks to `완료` unless the user asked.

## P0 policy

If **P0** exists (e.g. `완료` IMPL but code missing; empty PRD/D3 on active IMPL), recommend blocking new implementation on that milestone until resolved.
