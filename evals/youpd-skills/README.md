# youpd-skills eval cases

This directory contains skill-level eval cases for `youpd-skills`.

These are not TypeScript unit tests. They are scenario definitions for subagent/clean-context skill evals, as described in:

- [`docs/testing/skill-evaluation.md`](../../docs/testing/skill-evaluation.md)
- Notion SSOT: [정책 — youpd-skills 스킬 테스트/평가 전략](https://www.notion.so/36f346dac456816084c0cea2d78e8827)

## Current suites

- [`p1_2_reference_discovery.cases.json`](./p1_2_reference_discovery.cases.json)

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

## Boundary checks

P1.2 evals must enforce these boundaries:

- P1.2 curates by P1.1 score signals; it does not analyze title/thumbnail/angle quality.
- `fetch-comments` is for customer-language recovery only; it does not perform sentiment analysis or comment reaction reports.
- SEO ranking/difficulty is not the primary success criterion.
