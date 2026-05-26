# Route: `research/youtube/fetch-transcript`

> **상태**: 🚧 P1.5 — 스크립트 stub. **선행 작업**: 자막 수급 경로 ADR.

영상의 자막/스크립트를 추출. 공식 captions API → 서드파티 transcript → ASR fallback 순서로 시도.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--video-id` | string (repeatable) | |
| `--lang` | string | (선택) 우선 언어 (default `ko` → `en` 순) |
| `--allow-asr` | boolean | ASR fallback 허용 여부 (기본 false; opt-in) |

## DB 영향

- write: `youtube_video_transcripts` (P1.5 신규)
- read: `youtube_videos`

## 외부 의존

- YouTube captions API (공식, OAuth 필요할 수 있음)
- 서드파티 transcript 라이브러리 (e.g. `youtube-transcript`)
- (옵션) Whisper ASR (BYOK, opt-in only)

## 미결 결정 사항 (ADR 필요)

- ToS 합법성: 공식 captions API 만 허용할지, 서드파티 라이브러리 의존을 허용할지.
- ASR 비용: 비용·시간 트레이드오프. v0 에 포함 X 가 기본.
