# Implementation gate

Run **before** editing migrations, `skills/youpd-skills/scripts/**`, or route references.

## Checklist

1. **Task located** — current row in [development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513); read `Blocked by`, `Blocking`, `종속성`, `상태`, `관련 문서`.
2. **PRD + D3 linked** — version PRD and D3 (설계) exist in docs DB and appear in `관련 문서`. Empty pages do not count.
3. **Predecessors** — prior milestone IMPL is `완료` (or accepted WIP) **and** expected code exists on `main`.
4. **Override** — only if user explicitly accepted risk after a gap report (record in PR/commit).
5. **On failure** — do not open a “starter” implementation PR.

## Blocker template

```markdown
Cannot start implementation yet.

Selected candidate: [task ID / milestone]
Blocked by:
- [missing or blank PRD / D3 / ADR]
- [Notion Blocked by relation or incomplete predecessor]
- [repo vs Notion contract mismatch, if any]

Next recommended action:
- [YPDS-Px.x-PRD / DSGN / ADR task or doc to complete first]
```

Reference incident: 2026-05-29 P1.4 IMPL while DSGN and PRD were empty.
