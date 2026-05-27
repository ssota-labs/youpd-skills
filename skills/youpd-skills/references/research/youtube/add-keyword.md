# Route: `research/youtube/add-keyword`

YouTube 검색의 시작점인 키워드 마스터 행을 등록한다. `trim().toLowerCase().normalize('NFC')` 로 정규화하며, `normalized_keyword + region_code + search_order` 조합이 같으면 기존 행을 재사용한다.

## 입력

스크립트: `skills/youpd-skills/scripts/research/youtube/add-keyword.ts`

| 인수 | 형태 | 설명 | 기본값 |
|---|---|---|---|
| `--keyword`, `-k` | string | 원본 키워드 | 필수 |
| `--region`, `-r` | string | ISO 3166-1 alpha-2 | `KR` |
| `--order`, `-o` | enum | `relevance` / `viewCount` / `date` / `rating` | `relevance` |

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/add-keyword.ts --keyword "AI 트렌드" --region KR
```

## DB 영향

- write: `youtube_keywords`
- external: 없음

## 출력

```typescript
interface AddKeywordResult {
  ok: true;
  keywordId: string;
  normalized: string;
  region: string;
  order: 'relevance' | 'viewCount' | 'date' | 'rating';
  created: boolean;
}
```

## 다음 단계

키워드 등록 직후 영상 풀이 필요하면 `search-by-keyword.md` 를 읽고 `--keyword-id <keywordId>` 로 이어간다.
