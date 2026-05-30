# Route: `research/youtube/analyze-intro`

> **상태**: 사용 가능 — 에이전트 reasoning + `fetch-transcript` + `save-intro-analysis` 영속화. **외부 LLM API 없음.**

레퍼런스 영상 도입부(첫 N초) 자막을 읽고 후크·구조·페이싱을 분류한다.

## 선행 조건

- P1.2: `reference_folder_videos`에 큐레이션된 영상
- Glossary seed: `014` + `017` (hook-type 24값, `intro-structure`, `pacing-signal`, `reward-burden-balance`)
- Notion [P1.5 PRD](https://www.notion.so/36d346dac45681c6b6c0d96be9b39890) §3·§4

## 에이전트 절차

1. 미분석 후보:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/list-analysis-candidates.ts \
  --kind intro --folder-id <uuid> --limit 50
```

`hasTranscript: false` 인 영상은 먼저 자막 수급:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-transcript.ts \
  --video-id <id> [--lang ko,en]
```

2. `segments_json`에서 윈도 텍스트 추출 (기본 롱폼 0–15초, 숏폼 &lt;60초면 0–5초). 사용자 `--window-sec` 지정 시 우선.
3. PRD §3 프레임워크로 분류:
   - `hook_primary` / `hook_secondary` — `hook-type` (제목 15 + 도입부 9)
   - `intro_structure` — 8값 (`HPP`, `PAS`, …)
   - `pacing_signal` — 4값
   - `reward_burden_balance` — `engaging-intro` | `front-loaded-burden`
   - `reasoning`, 필요 시 `free_tags` (예: `partial_intro`, `tag_candidate:…`)
4. 저장 — `references/research/youtube/save-intro-analysis.md` 스크립트.

재분석: `--reanalyze`.

## 자막 부재

- timedtext 실패 → ASR 의향 질문. **자동 ASR 금지.**
- 거절 → 해당 영상 스킵, 사용자에게 사유 보고.

## 집계 (폴더 보고)

`db/exec` 단일 SELECT — PRD §11-2:

```sql
SELECT ia.intro_hook_primary, ia.intro_structure, COUNT(*) AS n
FROM reference_folder_videos rfv
JOIN youtube_intro_analyses ia ON ia.video_id = rfv.video_id
WHERE rfv.folder_id = ?
GROUP BY ia.intro_hook_primary, ia.intro_structure
ORDER BY n DESC;
```

## 외부 의존

- `fetch-transcript`: YouTube HTTP (timedtext). BYOK ASR은 미구현.
