# Implementation close-out

Required at end of every **구현** or **검증** session.

## 3a Verify

```bash
pnpm typecheck
pnpm test:smoke
```

Add `pnpm test` when routes, migrations, or constraints changed. DB/init merges require typecheck + smoke both green.

## 3b Record (Notion)

- Link new/updated docs via task `관련 문서`
- Set correct `태그` (스펙, 정책, 릴리즈 노트, ADR, …)
- Move task to `진행중` when starting; `보류` if blocked

## 3c Small Spec / Policy (in this workflow)

Update here (do **not** open youpd-documentation-workflow) when **all** apply:

- Change shipped in the same PR/session
- One topic Spec area (or one Policy rule)
- Update limited to Current Contract + Change Log (and tests reference)

Use **youpd-documentation-workflow** when the task is a dedicated Spec restructure, new Policy from scratch, or multi-area contract rewrite.

## 3d Reconcile delta

Compare task `상태` and title to `main`:

| Finding | Severity |
|---|---|
| Code merged but task not ready for `완료` proposal | P2 |
| User asked `완료` but code missing | P0 |
| D3/Spec clearly contradicts merged code | P1 |

For **`검증`** tasks: run or recommend [youpd-reconciliation](../../youpd-reconciliation/SKILL.md) with **full task database** scope unless recently done.

## 3e Report

- Task ID, what changed (repo + Notion)
- Verification commands and results
- Reconcile delta / P0–P1
- Whether `완료` can be proposed (only if user asked to update status)
- Skill evals run/skipped (if routes changed)
