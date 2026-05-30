# Route: `research/youtube/view-workspace`

> **상태**: 사용 가능 — 로컬 읽기 전용 워크스페이스 뷰어 (정적 HTML + 선택적 localhost 서버)

수집·큐레이션 결과를 코드/SQL 없이 브라우저에서 본다. DB는 **읽기 전용**으로 열며, BYOK·외부 API 호출은 없다.

## 실행

**정적 HTML (기본)** — DB 옆에 `workspace-view.html` 생성:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/view.ts
# 또는
pnpm tsx skills/youpd-skills/scripts/research/youtube/view.ts --mode static --output ./.youpd/workspace-view.html
```

**localhost 미리보기** — 프로세스가 종료될 때까지 HTTP 서버 유지:

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/view.ts --mode serve --port 3847
```

브라우저에서 stdout JSON의 `result.url` 을 연다.

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--mode` | enum | `static` | `static` (HTML 파일) / `serve` (ephemeral HTTP) |
| `--output`, `-o` | path | `<db-dir>/workspace-view.html` | static 모드 출력 경로 |
| `--port`, `-p` | number | `3847` | serve 모드 포트 |
| `--host` | string | `127.0.0.1` | serve 모드 바인드 주소 |
| `--db`, `-d` | path | `./.youpd/workspace.db` | 워크스페이스 DB |

## 뷰 (4종 + 드릴다운)

| 뷰 | 내용 |
|---|---|
| **검색** | 등록 키워드, 최근 검색 세션, 핫 비디오 (점수 배지) |
| **레퍼런스** | 폴더 그룹/자식 폴더, 큐레이션 영상 (소비자 단계·성과/기여 배지) |
| **채널** | 채널 목록 → 채널 상세 (영상 목록) |
| **영상** | 제목·썸네일·조회·점수, 레퍼런스 폴더 소속, 저장된 댓글 |

행 클릭으로 채널/영상 상세로 드릴다운한다.

## stdout (성공)

```json
{
  "ok": true,
  "route": "view-workspace",
  "dbPath": "/path/to/.youpd/workspace.db",
  "result": {
    "mode": "static",
    "htmlPath": "/path/to/.youpd/workspace-view.html",
    "byteLength": 12345,
    "counts": {
      "titleAnalyses": 0,
      "thumbnailAnalyses": 0,
      "foldersWithStats": 0,
      "analysisSurfaceEnabled": false
    }
  },
  "unitsConsumed": 0
}
```

`serve` 모드는 `result.url`, `result.host`, `result.port` 를 포함한다. P1.4.5부터 `result.counts`에 분석 표면 요약이 포함된다 (`youtube_title_analyses` 존재 시 `analysisSurfaceEnabled: true`).

## 사전 조건

1. `./.youpd/workspace.db` 존재 (`workspace/init` 완료).
2. 수집·레퍼런스 데이터가 있으면 뷰 내용이 풍부해진다 (없어도 빈 상태로 렌더).

## 에러 코드

| code | 조건 |
|---|---|
| `not_found` | DB 파일 없음 |
| `validation_error` | 잘못된 `--mode` / `--port` |
| `db_error` | SQLite 읽기 실패 |

## 이 라우트에서 하지 않는 것

- DB 편집·레퍼런스 추가/삭제
- 인증·공유·호스티드 대시보드
- 신규 npm 런타임 의존성·마이그레이션

## 스크립트 경로

`skills/youpd-skills/scripts/research/youtube/view.ts`
