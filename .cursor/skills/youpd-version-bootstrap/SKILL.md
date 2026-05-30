---
name: youpd-version-bootstrap
description: Bootstrap a new youpd-skills version on the Notion development task board — YPDS-Px.x rows (PRD, DSGN, IMPL, VERF), relations, optional doc placeholders. Use when the user asks to add a new version or milestone task setup.
---

# youpd-skills Version Bootstrap

Create **Notion task structure** only — no `main` code edits.

## Prerequisites

- AGENTS.md Development router (Notion MCP, intent = `bootstrap-version`).
- Version id agreed (e.g. `P1.5`); read [Phase 1 Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c) for topic title.

## Workflow

1. Confirm predecessor milestone (`P1.(x-1)` IMPL `완료` or explicitly waived).
2. Create rows below; `상태` = `대기`, set `Blocked by` / `종속성`.
3. Optionally create empty PRD/D3 in docs DB; link `관련 문서`.
4. Report task IDs; suggest first work → usually `YPDS-P1.x-PRD` via documentation skill (unless Blueprint missing).

Do not set any task `완료`.

## Task templates

Replace `P1.x` with target version.

| Task ID | `작업 유형` | Typical `Blocked by` |
|---|---|---|
| `YPDS-P1.x-PRD` | PRD 작성 | Blueprint / prior VERF |
| `YPDS-P1.x-DSGN` | 설계 작성 | `YPDS-P1.x-PRD` |
| `YPDS-P1.x-IMPL` | 구현 | `YPDS-P1.x-DSGN` + predecessor IMPL |
| `YPDS-P1.x-VERF` | 검증 | `YPDS-P1.x-IMPL` |

**Relations**

- DSGN after PRD `완료` or accepted draft
- IMPL: PRD + D3 in `관련 문서` before `진행중`
- VERF description: run full-task [youpd-reconciliation](../youpd-reconciliation/SKILL.md) after impl

**Optional doc placeholders**

| Page | `태그` | Template |
|---|---|---|
| `youpd-skills P1.x 기획안 — {topic}` | PRD | 신제품 스펙 문서(PRD) |
| `youpd-skills P1.x 설계문서 — {topic}` | 설계 | 신기술 스펙 문서 |
