# Version task templates

Replace `P1.x` with the target version. Adjust titles to match Blueprint cut names.

## Standard row set

| Task ID pattern | `작업 유형` | Typical `Blocked by` |
|---|---|---|
| `YPDS-P1.x-PRD` | PRD 작성 | Blueprint / prior version VERF |
| `YPDS-P1.x-DSGN` | 설계 작성 | `YPDS-P1.x-PRD` |
| `YPDS-P1.x-IMPL` | 구현 | `YPDS-P1.x-DSGN` + predecessor IMPL (e.g. P1.(x-1)) |
| `YPDS-P1.x-VERF` | 검증 | `YPDS-P1.x-IMPL` |

## Relations

- `YPDS-P1.x-DSGN` → blocked by PRD `완료` or accepted draft
- `YPDS-P1.x-IMPL` → link PRD + D3 in `관련 문서` before `진행중`
- `YPDS-P1.x-VERF` → description should mention full [youpd-reconciliation](../../youpd-reconciliation/SKILL.md) after impl

## Doc placeholders (optional at bootstrap)

| Page | `태그` | Template |
|---|---|---|
| `youpd-skills P1.x 기획안 — {topic}` | PRD | 신제품 스펙 문서(PRD) |
| `youpd-skills P1.x 설계문서 — {topic}` | 설계 | 신기술 스펙 문서 |

## First work after bootstrap

Usually route AGENTS **work** → **youpd-documentation-workflow** for `YPDS-P1.x-PRD`, unless Blueprint for the phase is still missing.
