# youpd-skills eval cases

This directory contains skill-level eval cases for `youpd-skills`.

These are not TypeScript unit tests. They are scenario definitions for subagent/clean-context skill evals, as described in:

- [`docs/testing/skill-evaluation.md`](../../docs/testing/skill-evaluation.md)
- Notion SSOT: [정책 — youpd-skills 스킬 테스트/평가 전략](https://www.notion.so/36f346dac456816084c0cea2d78e8827)

## Current suites

- [`p1_2_reference_discovery.cases.json`](./p1_2_reference_discovery.cases.json)
- [`p1_4_title_thumbnail_analysis.cases.json`](./p1_4_title_thumbnail_analysis.cases.json)

## Harness scripts

- [`scripts/run_p14_live_e2e.sh`](./scripts/run_p14_live_e2e.sh) — live YouTube API + P1.4 classify (needs `YOUTUBE_API_KEY`)
- [`scripts/run_p14_fixture_e2e.sh`](./scripts/run_p14_fixture_e2e.sh) — no API; fixture DB seed + save routes

## Recorded runs

Executed subagent eval results live under [`runs/`](./runs/).

| Run | Model | Suite | Result |
|---|---|---|---|
| [`2026-05-29_composer-2.5-fast_p1_2_reference_discovery`](./runs/2026-05-29_composer-2.5-fast_p1_2_reference_discovery.md) | `composer-2.5-fast` | `p1_2_reference_discovery` | 6/6 pass |
| [`2026-05-29_composer-2.5-fast_p1_4_title_thumbnail_analysis`](./runs/2026-05-29_composer-2.5-fast_p1_4_title_thumbnail_analysis.md) | `composer-2.5-fast` | `p1_4_title_thumbnail_analysis` | 6/6 pass (fixture API fallback) |

Each run includes:

- `.json` — machine-readable case outcomes, scripts invoked, graders
- `.md` — human-readable summary and residual risk

## Intended execution model

Each case should be run in an isolated agent context with:

1. a temp or fixture workspace DB
2. mocked YouTube API responses when the case needs external data
3. captured transcript/tool-call trace
4. deterministic checks for scripts, DB effects, and forbidden routes
5. an optional LLM-as-judge pass for final response quality

The eval runner should grade both:

- **trajectory**: references read, scripts invoked, order, forbidden actions
- **outcome**: DB rows, JSON stdout parsing, and final user report

### User-prompt subagents (recommended)

Subagents should receive the **verbatim user utterance** as the main instruction — not internal harness steps ("run save-title-analysis now"). Only add non-user setup: working directory, temp DB path, `source .env.local`.

Example subagent prompt skeleton:

```text
You are a Cursor agent in /workspace with youpd-skills installed.
The user says:
「{verbatim user prompt}」
Use a dedicated temp DB. Handle this like production (SKILL.md → references → scripts).
```

See [`runs/2026-05-29_composer-2.5-fast_p1_4_user_prompt_eval.md`](./runs/2026-05-29_composer-2.5-fast_p1_4_user_prompt_eval.md).

## Boundary checks

P1.2 evals must enforce these boundaries:

- P1.2 curates by P1.1 score signals; it does not analyze title/thumbnail/angle quality.
- `fetch-comments` is for customer-language recovery only; it does not perform sentiment analysis or comment reaction reports.
- SEO ranking/difficulty is not the primary success criterion.
