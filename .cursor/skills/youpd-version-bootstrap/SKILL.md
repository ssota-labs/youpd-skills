---
name: youpd-version-bootstrap
description: Bootstrap a new youpd-skills version on the Notion development task board — create YPDS-Px.x task rows (PRD, DSGN, IMPL, VERF), relations, and doc placeholders. Use when the user asks to add a new version, set up a milestone, or create phase tasks from template.
---

# youpd-skills Version Bootstrap

Create **Notion task structure** for a new version. Do **not** implement code in this skill.

## Prerequisites

- AGENTS.md Development router (Notion MCP, intent = bootstrap-version).
- Phase/version id agreed (e.g. `P1.5`) and [Phase Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c) read for scope name.

## Progressive reference

[references/task-templates.md](references/task-templates.md)

## Workflow

1. Confirm version label and predecessor milestone (previous IMPL `완료` or explicitly waived).
2. Create task rows per template with `작업 유형`, `상태` = `대기`, `Blocked by` / `종속성`.
3. Optionally create empty PRD/D3 pages in docs DB with correct `태그`; link via each task's `관련 문서`.
4. Report created task IDs and suggested first work unit (usually PRD or continue in-progress version).

Do not mark any task `완료`. Do not edit `main` code.
