# Route: `research/youtube/fetch-transcript`

> **상태**: 준비 중 — 자막 수급 경로(공식 API vs 서드파티 vs ASR)가 확정되기 전까지 실행할 수 없다.

영상의 자막/스크립트를 추출. 공식 captions API → 서드파티 transcript → ASR fallback 순서로 시도.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--video-id` | string (repeatable) | |
| `--lang` | string | (선택) 우선 언어 (default `ko` → `en` 순) |
| `--allow-asr` | boolean | ASR fallback 허용 여부 (기본 false; opt-in) |

## DB 영향

- write: `youtube_video_transcripts` (향후 마이그레이션)
- read: `youtube_videos`

## 외부 의존

- YouTube captions API (공식, OAuth 필요할 수 있음)
- 서드파티 transcript 라이브러리 (e.g. `youtube-transcript`)
- (옵션) Whisper ASR (BYOK, opt-in only)

## 아직 정하지 않은 사항

- ToS 합법성: 공식 captions API 만 허용할지, 서드파티 라이브러리 의존을 허용할지
- ASR 비용: 비용·시간 트레이드오프. 기본은 ASR 미포함
