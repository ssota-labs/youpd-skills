# Route: `research/youtube/add-keyword`

> **상태**: 🚧 P1.1 — 스크립트 stub. 호출 시 "P1.1 구현 예정" 응답.

YouTube 검색의 시작점인 키워드 마스터 행을 등록한다. 정규화된 키워드(대소문자·공백·특수문자 처리) + region/검색 옵션으로 unique. 이미 등록된 키워드면 재사용해 캐시 만료 여부만 검사한다.

## 계획된 입력

| 인수 | 형태 | 설명 |
|---|---|---|
| `--keyword` | string | 원본 키워드 (사용자 입력 그대로) |
| `--region` | string | ISO 3166-1 alpha-2 (예: `KR`, `US`). 기본 `KR`. |
| `--order` | enum | `relevance` / `viewCount` / `date` / `rating`. 기본 `relevance`. |
| `--ttl-hours` | number | 캐시 만료 시간 (시간). 기본 24. |

## DB 영향

- write: `youtube_keywords` (UPSERT on `unique(normalized_keyword, region_code, search_order)`)
- read: 없음

## 출력 (planned)

```typescript
interface AddKeywordResult {
  ok: true;
  keywordId: string;            // uuid (신규/기존 모두)
  isNew: boolean;
  normalizedKeyword: string;
  cacheExpiresAt: string;       // ISO 8601
}
```

## 외부 의존

없음 (DB write only).

## 미결 결정 사항 (D2 작성 시 확정)

- 키워드 정규화 규칙: trim + lowercase 가 기본. 한글의 경우 NFC 정규화. 형태소 분석은 v1?
- 같은 normalized_keyword + region 인데 search_order 만 다른 경우 별도 행으로 둘지 한 행에 통합할지.

> 본격 구현 전에 `youpd-skills P1.1 D2 PRD` 작성 후 본 reference 본문이 채워진다.
