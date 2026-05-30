# Route: `db/exec`

> **상태**: ✅ P1.4

워크스페이스 DB에 **단일** SQL 문을 실행한다 (집계·조회용). 에이전트가 P1.4 폴더 분포 보고 시 D3 §9-3 패턴에 사용.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/db/exec.ts \
  --sql "SELECT hook_primary, COUNT(*) AS n FROM youtube_title_analyses GROUP BY hook_primary" \
  [--params '["arg1"]'] \
  [--db <path>]
```

## 금지

- `DROP`, `ATTACH`, `ALTER`, `CREATE`, 다중 statement (`;`), 위험 `PRAGMA`

## stdout

`RouteOk<{ rows, changes, lastInsertRowid }>`

## 에러

| code | 조건 |
|---|---|
| `dangerous_scope` | 금지 SQL |
| `validation_error` | 빈 SQL, 잘못된 params JSON |
