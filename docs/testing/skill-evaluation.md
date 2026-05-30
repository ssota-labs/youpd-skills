# youpd-skills skill evaluation

This document summarizes the local testing policy for `youpd-skills` as an agent skill.

Full SSOT: [정책 — youpd-skills 스킬 테스트/평가 전략](https://www.notion.so/36f346dac456816084c0cea2d78e8827)

## Why this exists

`youpd-skills` is not only a TypeScript script package. It ships as a Claude Code plugin/skill where the end-user flow is:

1. The agent recognizes the user's intent.
2. The agent reads `skills/youpd-skills/SKILL.md`.
3. The agent loads the relevant `references/**` route contract.
4. The agent invokes one or more scripts.
5. The agent parses one JSON stdout line and reports back to the user.

Traditional code tests verify the scripts and database. They do not verify that an agent selects the right reference, follows progressive disclosure, calls scripts in the right order, or respects milestone boundaries. Skill-level evals cover that gap.

## Testing layers

### Layer A: code-level tests

Use existing repo commands to validate TypeScript, migrations, DB constraints, and script behavior.

```bash
pnpm typecheck
pnpm test:smoke
pnpm test
```

Use this layer for:

- migrations and idempotency
- FK/CHECK constraints
- script input validation
- JSON stdout shape
- missing env key rejection
- fixture-backed API behavior

### Layer B: route/reference contract checks

Verify the skill documents match implemented scripts.

Check:

- `skills/youpd-skills/SKILL.md` routes point to existing reference files.
- `skills/youpd-skills/references/research/youtube/INDEX.md` status labels match current code.
- Each route reference documents inputs that the script actually accepts.
- stdout examples match exported result types.
- out-of-scope language matches the active PRD/D3.
- stale milestone labels are removed when scope changes.

### Layer C: subagent skill evals

Run representative user prompts in isolated clean-context subagents and grade the trajectory plus final output.

The eval should check:

- trigger accuracy: the skill is used for relevant prompts and not used for unrelated prompts
- reference selection: the agent reads the right route/reference docs
- procedure adherence: scripts are called in the intended order
- boundary correctness: P1.2 does not perform P1.3 title/thumbnail analysis
- data correctness: DB rows and score identity are written as expected
- final report quality: the user-facing summary is grounded in script output and policy

## Subagent eval shape

```text
eval runner
├─ subagent A: test prompt 1
├─ subagent B: test prompt 2
├─ subagent C: test prompt 3
└─ grader: transcript + DB state + final output
```

Each subagent should run with:

- fresh context
- fixture workspace DB or temp DB
- mock YouTube API responses where possible
- a fixed user prompt
- captured transcript/tool sequence

## Grader types

Prefer deterministic graders where possible.

Examples:

- expected reference file was read
- forbidden route was not called
- required script order was followed
- stdout validated against schema
- DB contains expected rows
- no score values duplicated in curation rows where only score identity should be stored

Use LLM-as-judge only for semantic qualities:

- request structure is reasonable
- final report is clear and scoped
- boundary between P1.2 and P1.3 is respected
- comments are used only for customer-language recovery

Use human review for early dogfood, large PRD/D3 changes, score policy changes, or model upgrades.

## P1.4 minimum eval cases

Suite: [`evals/youpd-skills/p1_4_title_thumbnail_analysis.cases.json`](../evals/youpd-skills/p1_4_title_thumbnail_analysis.cases.json)

### P1.4-01: folder title hook distribution

Prompt:

> AI 업무 자동화 레퍼런스 폴더에 넣은 영상들 제목 후크 분포 보여줘. 아직 분석 안 된 건 분류해줘.

Expected:

- reads `analyze-title.md`, `list-analysis-candidates`, `save-title-analysis`, `db/exec`
- uses agent reasoning (no external LLM API for classification)
- persists `youtube_title_analyses` with glossary-valid codes
- reports hook distribution

### P1.4-02–06

See the suite JSON for thumbnail emotion, alignment, LLM negative routing, invalid enum, and discovery boundary cases.

Harness:

```bash
# Live (needs YOUTUBE_API_KEY in .env.local)
bash evals/youpd-skills/scripts/run_p14_live_e2e.sh

# Fixture (no API)
bash evals/youpd-skills/scripts/run_p14_fixture_e2e.sh
```

## P1.2 minimum eval cases

### P1.2-01: phenomenon-stage discovery

Prompt:

> 부모님 케어 관련해서 문제 인식 단계 레퍼런스 찾아줘.

Expected:

- uses P1.2 reference discovery flow
- chooses `phenomenon`/problem-recognition framing
- avoids direct title/thumbnail analysis
- creates/uses the correct folder stage
- curates score-ranked references

### P1.2-02: conversion-oriented discovery

Prompt:

> AI 자동화 강의 구매 직전 고객에게 먹힌 레퍼런스 찾아줘.

Expected:

- prioritizes `plan`/`action` style probes
- uses P1.1 search/score routes
- curates by performance/contribution/composite score
- does not call P1.3 analysis routes

### P1.2-03: multi-stage folder group

Prompt:

> 30대 직장인 AI 생산성 레퍼런스를 현상, 욕구, 계획으로 나눠서 찾아줘.

Expected:

- creates a folder group
- creates or uses child folders for the requested stages
- preserves stage/source reason on curation
- handles duplicate videos predictably

### P1.2-04: comment language recovery

Prompt:

> 성과 좋은 영상 댓글도 보고 다음 키워드 후보 뽑아줘.

Expected:

- fetches comments only for score-ranked candidates
- stores comments in `youtube_comments`
- extracts customer-language candidates
- does not perform sentiment analysis or a comment reaction report

### P1.2-05: negative title/thumbnail request

Prompt:

> 이 레퍼런스들의 썸네일 각도를 분석해줘.

Expected:

- routes to P1.3 title/thumbnail analysis context
- does not execute P1.2 curation flow as the primary action

### P1.2-06: missing API key

Prompt:

> 이 키워드로 유튜브 레퍼런스 찾아줘.

Environment:

- `YOUTUBE_API_KEY` missing

Expected:

- detects the missing key before API calls
- reports setup guidance
- does not partially pollute the workspace DB

## When to run skill evals

Run or update skill evals when:

- `SKILL.md` routing changes
- a `references/**` route contract changes
- a route script is added or renamed
- a milestone PRD/D3 changes workflow boundaries
- P1.2+ orchestration changes how multiple scripts are combined
- a model upgrade appears to affect tool use or trigger accuracy

For early dogfood, manual subagent eval plus human review is acceptable. Before public release, move toward scripted regression suites with fixture DBs and deterministic graders.

## Reporting expectations

For implementation PRs that affect skill behavior, include:

- code test results
- route/reference contract checks performed
- subagent eval cases run
- notable failures or skipped evals
- residual risk, especially around API quota, missing keys, and milestone boundaries

Recorded subagent eval runs are stored under [`evals/youpd-skills/runs/`](../evals/youpd-skills/runs/) as paired `.json` + `.md` files.
