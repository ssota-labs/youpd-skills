# Route: `research/youtube/record-discovery-run`

> **상태**: ✅ P1.2

P1.2 discovery 실행 이력을 최소한으로 기록한다. 키워드 생성 전체를 저장하지 않고 실제 실행한 search session과 단계 요약만 남긴다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/record-discovery-run.ts \
  --folder-group-id <uuid> \
  --request-text "30대 직장인 AI 생산성 레퍼런스 찾아줘" \
  --stage plan \
  --search-session-id <uuid> \
  --complete
```

## 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--folder-group-id` | uuid | 결과 folder group |
| `--request-text` | string | 사용자 요청 원문/요약 |
| `--audience` | string | 고객군 |
| `--seed-theme` | string | 주제 |
| `--stage` | repeatable enum | `phenomenon/desire/plan/action/reward/mixed/unspecified` |
| `--keyword-probe-summary` | string | 실행 keyword probe 요약 |
| `--search-session-id` | repeatable uuid | P1.1 search session |
| `--complete` | flag | completed_at 기록 |
| `--db`, `-d` | path | DB override |

## DB 영향

- write: `reference_discovery_runs`
- 외부 API 없음
