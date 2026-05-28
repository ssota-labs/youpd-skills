---
name: youpd-skills
description: YouTube/Threads/TikTok/Instagram/카드뉴스 콘텐츠 기획·제작 워크플로 자동화 스킬 킷. 키워드 입력으로 채널·영상 수집, 레퍼런스 큐레이션, 제목·썸네일·도입부 분석을 로컬 SQLite 워크스페이스에 누적합니다. 사용자가 "youpd 워크스페이스 만들어줘", "유튜브 키워드 등록해줘", "이 키워드로 영상 검색해줘", "이 영상 레퍼런스로 마킹해줘", "도입부 분석해줘" 등 youpd 관련 의도를 표현할 때 이 스킬을 사용하세요.
---

# youpd-skills

콘텐츠 기획·제작을 위한 **단일 진입 스킬**. 모든 도메인·플랫폼의 작업은 이 스킬로 시작하고, **상세 절차는 `references/<route>.md` 를 progressive disclosure 로 추가 로드**해 따른다.

## 핵심 원칙

- **로컬 완결**: 결과는 사용자 작업 디렉터리의 `./.youpd/workspace.db` (SQLite 단일 파일)에 누적된다. 외부 서버·SaaS·MCP 의존성 없음.
- **BYOK**: `YOUTUBE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` 등은 사용자 환경에 미리 설정되어야 한다. 키 부재 시 즉시 거절 + 설정 안내.
- **Forward-only 마이그레이션**: 머지된 `.sql` 파일은 신규 파일로만 수정. 자동 다운 마이그레이션 없음.
- **단일 SKILL + 라우팅**: 본 SKILL.md 는 라우터일 뿐. 실제 동작 절차는 `references/<route>.md` 를 Read 도구로 추가 로드해 그 파일이 시키는 대로 따른다.

## When to use

다음 의도가 보이면 이 스킬을 사용한다:

- **워크스페이스**: "youpd 시작", "workspace 만들어줘", "DB 초기화", "스키마 마이그레이션 적용"
- **YouTube 리서치 (Phase 1)**: 키워드 등록·date-only 수집, hot video 조회, 채널 검색·수집, 스냅샷·점수, 레퍼런스 마킹·조회, 제목/썸네일/도입부 분석

다음 의도는 **본 스킬의 범위 밖**이다 → 사용자에게 "Phase X 에서 도입 예정" 이라고 안내하고 본 스킬을 사용하지 말 것:

- Threads / TikTok / Instagram Reels / 카드뉴스 채널 (Phase 2-3)
- `plan` / `produce` 도메인 (Phase 2+, 본 스킬은 `research` + `analyze` 까지)
- 본 제품(유PD)의 노션 연동, MCP, 대시보드 — 별도 제품 라인업

## 라우팅 (어느 reference 파일을 읽어야 하나)

작업 시작 전에 사용자의 의도에 해당하는 `references/<route>.md` 를 **반드시** Read 도구로 읽어, 그 파일의 입출력 계약·실행 절차·에러 처리를 따른다.

| 사용자 의도 | 읽을 파일 | 구현 상태 |
|---|---|---|
| 워크스페이스 생성 · 마이그레이션 적용 | `references/workspace/init.md` | ✅ P1.0 |
| YouTube 라우트 인덱스 · 권장 호출 순서 | `references/research/youtube/INDEX.md` | ✅ |
| 키워드 마스터 등록 · 정규화 | `references/research/youtube/add-keyword.md` | ✅ P1.1 |
| 등록된 키워드로 영상 date-only 수집 | `references/research/youtube/search-by-keyword.md` | ✅ P1.1 |
| 수집 pool 기반 hot video (Good+) | `references/research/youtube/list-hot-videos.md` | ✅ P1.1 |
| 키워드로 채널 검색 | `references/research/youtube/search-channels.md` | ✅ P1.1 |
| 채널 ID/핸들로 채널 정보 fetch | `references/research/youtube/fetch-channel.md` | ✅ P1.1 |
| 채널의 업로드 영상 일괄 fetch | `references/research/youtube/fetch-channel-videos.md` | ✅ P1.1 |
| 트렌딩 (mostPopular) fetch | `references/research/youtube/fetch-trending.md` | ⏭ P1.1 out-of-scope |
| 채널 시점 수치 스냅샷 | `references/research/youtube/snapshot-channel.md` | 🚧 P1.2 |
| 영상 시점 수치 스냅샷 | `references/research/youtube/snapshot-video.md` | 🚧 P1.2 |
| 영상을 레퍼런스로 마킹 | `references/research/youtube/curate-references.md` | 🚧 P1.3 |
| 마킹된 레퍼런스 조회·필터 | `references/research/youtube/list-references.md` | 🚧 P1.3 |
| 제목 LLM 분석 · 축 매핑 | `references/research/youtube/analyze-title.md` | 🚧 P1.4 |
| 썸네일 LLM 분석 · 축 매핑 | `references/research/youtube/analyze-thumbnail.md` | 🚧 P1.4 |
| 자막/스크립트 추출 | `references/research/youtube/fetch-transcript.md` | 🚧 P1.5 |
| 도입부 후크 · 구조 분석 | `references/research/youtube/analyze-intro.md` | 🚧 P1.5 |

의도가 모호하면 위 라우트 후보를 1줄씩 사용자에게 제시하고 선택을 받는다. 절대 임의 추측으로 다중 라우트를 동시에 호출하지 말 것.

## 공통 사전 조건 (모든 라우트 진입 전 검증)

라우팅 후 첫 동작 직전, 다음을 빠르게 검증한다 (각 reference 파일에서 다시 명시되더라도 라우터 차원에서 한 번 거를 것):

1. **Node 24 + 의존성 설치 완료** — `pnpm install` 완료 여부 확인. SQLite는 Node 내장 `node:sqlite` 사용 (별도 네이티브 모듈 불필요).
2. **워크스페이스 존재 여부** — 의도가 `workspace/init` 외 라우트인데 `./.youpd/workspace.db` 가 없으면 먼저 init 을 권유.
3. **BYOK 키** — YouTube API 호출 라우트는 `YOUTUBE_API_KEY` 환경변수 확인. LLM 호출 라우트는 `ANTHROPIC_API_KEY` 또는 `OPENAI_API_KEY`. 없으면 즉시 거절 + `.env.example` 참고 안내.

## 호출 패턴

본 스킬의 모든 동작은 reference 파일에서 지시하는 **TS 스크립트를 Shell 도구로 실행**해 수행한다. 임의의 SQL 쿼리를 직접 작성하거나, reference 가 지정하지 않은 스크립트를 호출하지 말 것.

```bash
pnpm tsx skills/youpd-skills/scripts/<domain>/<action>.ts [args...]
```

스크립트는 항상 JSON 한 줄을 stdout 에 출력한다. 에이전트는 그 JSON 을 파싱해 사용자에게 한국어로 요약 보고한다.

## Reference 인덱스 (1단계 깊이)

- `references/workspace/init.md` — 워크스페이스 생성·마이그레이션 적용 (P1.0)
- `references/research/youtube/INDEX.md` — YouTube 도메인 라우트 묶음 + 권장 호출 순서 (Phase 1)

> **Phase 1 진행 상태**: P1.0 (workspace/init) 완료. P1.1 YouTube 6 routes 구현 완료. P1.2+ 는 reference 계약만 존재.
