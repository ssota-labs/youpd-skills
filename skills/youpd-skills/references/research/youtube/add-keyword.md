# Route: `research/youtube/add-keyword`

YouTube 키워드 마스터 행을 등록한다. `(normalized_keyword, region_code)` unique. 이미 있으면 재사용한다. keyword video collection order는 사용자 설정 불가이며 항상 `date`다.

## 사전 조건

- `./.youpd/workspace.db` 존재 (없으면 `workspace/init` 선행)
- API 키 불필요

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--keyword`, `-k` | string | (필수) | 원본 키워드 |
| `--region`, `-r` | string | `KR` | ISO 3166-1 alpha-2 |
| `--ttl-hours` | number | `24` | 캐시 TTL (시간) |
| `--initial-target-count` | number | `500` | 최초 date-only 수집 목표 개수 |
| `--db`, `-d` | path | env/cwd | DB 경로 override |

## 정규화

trim → Unicode NFC → ASCII lowercase → whitespace collapse

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/add-keyword.ts --keyword "AI 트렌드"
```

## stdout (성공)

```json
{
  "ok": true,
  "route": "add-keyword",
  "dbPath": "...",
  "unitsConsumed": 0,
  "result": {
    "keywordId": "uuid",
    "isNew": true,
    "normalizedKeyword": "ai 트렌드",
    "cacheExpiresAt": null,
    "initialTargetCount": 500
  }
}
```

## 에러 코드

| code | 조건 |
|---|---|
| `validation_error` | 빈 키워드, 잘못된 숫자 인수 |
| `db_error` | migration/DB 실패 |

## 사용자 보고

- 신규/재사용 여부, normalized keyword, initial target count(500) 안내
- 다음 단계: `search-by-keyword` 권장
