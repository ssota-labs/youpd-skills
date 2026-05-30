---
name: youpd-documentation-workflow
description: Write or update youpd-skills Notion documentation — PRD, D3 설계, Blueprint, Policy, ADR, dedicated Spec/릴리즈 노트 tasks. Use after AGENTS.md routes "work" to documentation (작업 유형 PRD/설계/로드맵 or explicit doc-only request). Not for small Spec patches during implementation.
---

# youpd-skills Documentation Workflow

Use for **documentation work units** on the Notion development task board. Small **topic Spec** or **Policy** updates that are side effects of a merged feature stay in [youpd-implementation-workflow](../youpd-implementation-workflow/SKILL.md) Close-out — use this skill only when the primary deliverable is a document.

## Databases

- Tasks: `https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513`
- Docs: `https://www.notion.so/5ac346dac45682cf98ed815c25b32d38` (`태그` per type)

Link every doc to the task via `관련 문서`.

## Progressive reference

Read [references/documentation-workflow.md](references/documentation-workflow.md) before classifying or editing.

## When to use this skill

| Route here | Route to implementation skill instead |
|---|---|
| `작업 유형` = PRD 작성, 설계 작성, 상세 로드맵 작성 | `구현`, `검증` |
| New Blueprint, Policy, ADR, version PRD/D3 | Small Spec patch after one PR (contract paragraph + changelog) |
| Dedicated “스펙 최신화” / large Spec restructure task | — |

## Workflow

1. Confirm task row(s) from AGENTS gate (already loaded).
2. Classify document type via reference Decision Flow.
3. Read dependencies (Blueprint, PRD, Policy) per reference preconditions.
4. Draft or update Notion page; set correct `태그` and templates.
5. Link via `관련 문서`; move task to `진행중` when starting, `보류` if blocked.
6. Close-out: summarize for user; propose `완료` only if user asked to update status.

Do **not** edit `main` code in this skill except to read for Spec accuracy.
