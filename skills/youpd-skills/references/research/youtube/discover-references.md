# Route procedure: `research/youtube/discover-references`

> **상태**: ✅ P1.2 — agent procedure. 단일 mega script가 아니라 작은 scripts + P1.1 routes를 조합한다.

고객군·키워드군·소비자심리 단계 요청을 reference discovery 흐름으로 실행한다. 키워드는 SEO target이 아니라 성과 좋은 YouTube 영상 풀을 찾는 probe다.

## 절차

1. 사용자 요청을 구조화한다: 고객군, 문제/상황, 카테고리, 목표, 소비자심리 단계, 검색 폭.
2. `add-keyword` / `search-by-keyword` 실행 전 keyword probe와 단계 선택을 사용자에게 확인한다. 사용자가 "알아서"라고 명시하면 생략 가능.
3. P1.1 routes를 실행한다.
   - `add-keyword`
   - `search-by-keyword`
   - 필요 시 `list-hot-videos`, `search-channels`, `fetch-channel-videos`
4. `create-reference-folder`로 folder group + child folders를 만든다.
5. `record-discovery-run`으로 실행 이력을 최소 기록한다.
6. `curate-references`로 성과도·기여도 Good+ AND + 종합 점수순 후보를 폴더에 넣는다.
7. 고객 언어 회수가 필요하면 `fetch-comments`로 score 상위 영상 댓글을 가져온다.
8. `list-references`로 결과를 조회해 사용자에게 요약한다.

## 금지

- P1.2에서 제목/썸네일/후킹 각도 분석을 하지 않는다. 해당 요청은 P1.4+ 분석 라우트로 넘긴다.
- SEO 검색량/난이도 기준으로 우선순위를 정하지 않는다.
- 댓글은 고객 언어 회수까지만 사용한다. 감성/반응 분석은 P1.5+.

## 사용자 보고

- 실행한 keyword probe와 단계
- 검색/큐레이션된 영상 수
- 성과도·기여도·종합 점수 기준
- 댓글에서 회수한 다음 keyword probe 후보
