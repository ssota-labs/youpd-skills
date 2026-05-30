# Reconciliation log (Notion only)

**Do not** save reconciliation reports under the repo (`docs/`, `evals/`, markdown files, etc.). The durable record is **one Notion page per run** in the docs database.

## Where to file

| Field | Value |
|---|---|
| Database | [유PD 프로덕트 팀 문서](https://www.notion.so/5ac346dac45682cf98ed815c25b32d38) (`data_source_id`: `b2a346da-c456-8251-a5c9-876afa9c62ef`) |
| `태그` | `정합성` only |
| `상태` | `확정` |
| Page title | `정합성 체크 — YYYY-MM-DD` (audit date; one page per run) |

If `정합성` is missing from `태그` options, extend the data source (include **all** existing options plus `정합성`):

```sql
ALTER COLUMN "태그" SET multi_select('가이드', '제품 로드맵', 'PRD', 'ADR', '설계', '릴리즈 노트', '리서치', '정책', '스펙', '정합성')
```

Use `notion-create-pages` with `parent.type` = `data_source_id`. Link the new page from an open VERF task or a standing reconciliation task via `관련 문서` when one exists (optional).

## Page body (minimal)

Log **what was checked**, not a full drift write-up. Use this shape:

```markdown
## 실행 요약

- **Repo:** ssota-labs/youpd-skills @ `abcdef1` (`main`)
- **범위:** 개발 태스크 DB 전체 (모든 `상태`) — or user-narrowed scope
- **스캔 행 수:** N

## 수행한 축

- [x] A — Task ↔ Code
- [x] B — Doc ↔ Code
- [x] C — Task ↔ Doc
- [x] E — Dependency graph

## 결과 요약 (한 줄)

P0: n | P1: n | P2: n | P3: n — top finding in one line if any P0/P1
```

Uncheck axes that were **out of scope** for this run (e.g. user asked for axis A only). Do not paste long P0/P1 tables into the Notion page unless the user asked for a detailed filed report.

## Chat reply

After filing Notion, summarize in chat: Notion page URL, axes run, P0/P1 counts, and top fixes. Do **not** set tasks to `완료` unless the user asked.
