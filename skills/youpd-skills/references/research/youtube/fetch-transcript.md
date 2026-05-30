# Route: `research/youtube/fetch-transcript`

> **상태**: 사용 가능 — 공개 **timedtext** 자막 수급·DB 저장. ASR·공식 captions OAuth 는 후속.

영상의 자막/스크립트를 추출해 `youtube_video_transcripts`에 저장한다. 도입부 분석(`analyze-intro`) 전에 호출한다.

## 선행 조건

- `youtube_videos`에 해당 `video_id` 행 존재 (수집·큐레이션 완료)
- Node 24+ 네트워크 접근 (YouTube watch 페이지 fetch)

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/fetch-transcript.ts \
  --video-id <id> [--video-id <id> ...] \
  [--lang ko,en] \
  [--db <path>]
```

| 인수 | 기본 | 설명 |
|---|---|---|
| `--video-id` | (필수, 반복) | YouTube video ID |
| `--lang` | `ko,en` | 우선 언어 (쉼표 구분) |
| `--allow-asr` | false | **미구현** — 지정 시 `OPENAI_API_KEY` 확인 후 거절. 사용자 명시 승인 전 자동 ASR 금지 |

## stdout

`RouteOk<FetchTranscriptResult>`:

- `succeeded` / `failed` 건수
- `items[]`: `videoId`, `source`, `language`, `replaced`, `segmentCount`, `charCount`
- `failures[]`: `videoId`, `message`, `code` (일부 실패해도 `ok: true` — 배치 처리)

## 수급 경로 (dogfood)

1. **timedtext** (기본): watch 페이지 `captionTracks` → json3/srv3 파싱 → `source=timedtext`
2. **youtube_captions** (OAuth): 미지원
3. **asr_whisper**: `--allow-asr` — 미구현. 키 없으면 즉시 거절

자막이 없으면 `not_found` — 에이전트는 사용자에게 ASR 의향을 묻고, 거절 시 해당 영상 분석 스킵.

## DB

`youtube_video_transcripts`: `video_id` PK, `source`, `language`, `full_text`, `segments_json`, `fetched_at`. 동일 `video_id` 재호출 시 UPDATE.

## 에러 (단일 영상 실패는 failures에 포함)

| code | 조건 |
|---|---|
| `not_found` | 공개 자막 트랙 없음 / `video_id` 없음 |
| `network_error` | HTTP 실패 |
| `validation_error` | `--allow-asr` 미구현·키 없음 |
