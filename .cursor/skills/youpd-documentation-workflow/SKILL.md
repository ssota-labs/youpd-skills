---
name: youpd-documentation-workflow
description: Write or update youpd-skills Notion documentation — PRD, D3 설계, Blueprint, Policy, ADR, dedicated Spec/릴리즈 노트 tasks. Use after AGENTS.md routes "work" to documentation. Not for small Spec patches during implementation (use youpd-implementation-workflow Close-out).
---

# youpd-skills Documentation Workflow

Primary deliverable is a **Notion document**. Small **Spec/Policy** patches from a single implementation PR → [youpd-implementation-workflow](../youpd-implementation-workflow/SKILL.md) Close-out.

**Source SSOT:** [제품 문서화 가이드](https://www.notion.so/ada346dac45682dca9f001cfff8ae0fc)

## Databases

- Tasks: `https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513`
- Docs: `https://www.notion.so/5ac346dac45682cf98ed815c25b32d38` — set `태그`, link via task `관련 문서`

## Session workflow

1. Task row(s) already loaded via AGENTS router.
2. Classify document type (below).
3. Read dependencies per preconditions.
4. Draft/update Notion; correct `태그` and templates.
5. Link `관련 문서`; `진행중` when starting, `보류` if blocked.
6. Summarize for user; propose `완료` only if user asked.

Do **not** edit `main` except to read for Spec accuracy.

## When to use this skill

| Route here | Use implementation skill instead |
|---|---|
| `작업 유형` = PRD 작성, 설계 작성, 상세 로드맵 작성 | `구현`, `검증` |
| Blueprint, Policy, ADR, version PRD/D3 | Small Spec patch (one topic, same PR) |
| Dedicated Spec restructure / large contract rewrite | — |

## Document types

| Document | Lifetime | Role |
|---|---|---|
| **Blueprint** | Phase | Route map, domain model, milestone plan |
| **Policy** | Cumulative | Recurring rules (migrations, BYOK, errors) |
| **Spec** | Living | Current implementation contract |
| **D2 PRD** | Frozen at release | Why/what for one version |
| **D3 Tech Spec** | Frozen at release | What to implement this version |
| **D4 Release Notes** | Cumulative | Shipped vs plan |
| **D5 ADR** | Immutable | One major decision |

**Overlap rule:** longest-lived doc wins — Blueprint for phase map, Policy for recurring rules, Spec for current contracts.

## Spec routing

| Situation | Where |
|---|---|
| Dedicated Spec task or large restructure | This skill (Topic Spec below) |
| Small Spec/Policy after one PR | Implementation Close-out |

## Classification cues

| Signal | Work type | Not |
|---|---|---|
| 기획안, PRD, user value/scope | **D2 PRD** | D3, Spec |
| 설계, D3, Tech Spec | **D3 Tech Spec** | Blueprint, Spec |
| 스펙, 현재 구현 계약 (dedicated) | **Topic Spec** | D3, PRD |
| 구현, implementation | → implementation skill | — |
| Blueprint, phase roadmap | **Blueprint** | Version D3 |
| 정책, Policy | **Policy** | ADR |

## Dependency order

Roadmap → Blueprint → (Policy) + PRD → D3 → Implementation → Spec / Release notes. ADR at decision time.

| Work type | Can start when |
|---|---|
| Blueprint | Phase roadmap exists |
| Policy | Recurring rule identified |
| D2 PRD | Blueprint exists (or user asks to draft roadmap) |
| D3 | PRD accepted; Policy/Blueprint read |
| Topic Spec | Code/migrations/tests exist on `main` |
| D4 | Version shipped |

## Deliverables by type

### D2 PRD

User scenarios, scope in/out, reporting expectations, open questions → D3. **No** DB fields, API, migration SQL. Name: `{제품} v0.X 기획안 — {topic}`.

### D3 Tech Spec

Data model, interfaces, algorithms, verification plan for **this version only**. **No** phase-wide scope or recurring rules (→ Blueprint/Policy). Name: `{제품} v0.X 설계문서 — {topic}`.

### Topic Spec

**Current Contract** from `main`; **Not Implemented**; **Validation** (tests); **Change Log**. Name: `{제품} 스펙 — {area}`.

### Blueprint / Policy / D4 / D5

Route map & cuts; cumulative rules; ship report; `[ADR-NNNN]` immutable decision (supersede via new ADR line, not edits).

## Task DB mapping

| `작업 유형` | Section |
|---|---|
| 상세 로드맵 작성 | Blueprint |
| PRD 작성 | D2 PRD |
| 설계 작성 | D3 |
| 구현 / 검증 | → implementation skill |

`상태`: `대기` / `진행중` / `보류` / `완료` / `취소` — only set `완료` when user asked.

## Notion `태그`

| Type | `태그` | Template |
|---|---|---|
| Blueprint | `제품 로드맵` | — |
| Policy | `정책` | — |
| PRD | `PRD` | 신제품 스펙 문서(PRD) |
| D3 | `설계` | 신기술 스펙 문서 |
| Spec | `스펙` | — |
| Release | `릴리즈 노트` | — |
| ADR | `ADR` | — |
| Guide | `가이드` | — |
| Research | `리서치` | — |
| Development SSOT reconciliation log | `정합성` | — (see [youpd-reconciliation](../youpd-reconciliation/SKILL.md); one page per run, Notion only) |

## Anti-patterns

- Full phase schema in one D3 → Blueprint + per-version D3 cuts
- Recurring rules copied into every D3 → Policy
- Version-scoped Spec docs → topic-based Spec
- Unimplemented Blueprint items in Spec → Not Implemented section
- Implementation results in PRD → D4 or Spec
- Editing shipped D3 → new D3 or ADR
- Editing ADR body → new ADR; use Policy for living rules

## Examples

| Doc | Link |
|---|---|
| Blueprint | [Phase 1 Blueprint](https://www.notion.so/36d346dac456813daa20e054198e3a8c) |
| P1.0 PRD | [기획안](https://www.notion.so/36c346dac45681379c4ef2d1df1226b4) |
| P1.0 D3 | [설계](https://www.notion.so/36d346dac45681faa27fdfb0b39ef9fe) |
| DB Spec | [스펙 — DB](https://www.notion.so/36c346dac45681a1923af41aa49c6a33) |
| Route Spec | [스펙 — Route](https://www.notion.so/36f346dac45681e994aefccd54ff4487) |
