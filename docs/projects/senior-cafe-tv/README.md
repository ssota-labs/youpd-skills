# senior-cafe-tv (예시 채널 프로젝트)

youpd-skills로 운영하는 **YouTube 채널 워크스페이스** 예시입니다. 실제 clone·설치 후에는 사용자 PC의 `senior-cafe-tv/` 폴더(또는 본인이 정한 프로젝트명)가 런타임 루트가 되고, 이 디렉터리는 **복사용 템플릿·채널 맥락**만 담습니다.

## 채널 한 줄

시니어 본인과 **4050 자녀**가 함께 보는 유튜브 — 건강·일상·가족 소통. 부모님께 보내기 좋은 정보와, 자녀가 부모와 대화할 때 쓸 수 있는 화제를 만든다.

## 설치 시 폴더 이름

유저는 보통 다음처럼 **clone 대상 폴더명 = 프로젝트명**으로 둡니다.

```bash
git clone https://github.com/ssota-labs/youpd-skills.git senior-cafe-tv
cd senior-cafe-tv
```

자세한 절차와 에이전트용 초기 프롬프트는 [설치 가이드](../../installation.md)를 본다.

## 이 폴더를 설치 후 어떻게 쓰나

1. 설치가 끝난 **채널 프로젝트 루트**에 `docs/` 를 만들고, 아래 파일을 복사하거나 링크한다.
   - [`channel-brief.md`](./channel-brief.md) → `docs/channel-brief.md`
2. Agent에게 채널 작업을 맡길 때마다 “`docs/channel-brief.md` 를 읽고 진행해줘”라고 하면 된다.
3. 수집·분석 데이터는 `./.youpd/workspace.db` (프로젝트 cwd 기준)에 쌓인다.

## youpd에서 자주 쓰는 첫 작업

| 의도 | 사용자 말 예시 |
|------|----------------|
| 워크스페이스 | “youpd 워크스페이스 만들어줘” (설치 시 1회) |
| 키워드 | “키워드 ‘시니어 카페’, ‘부모님 건강검진’ 등록해줘” |
| 수집 | “등록한 키워드로 최근 영상 수집해줘” |
| 레퍼런스 | “성과 좋은 영상 레퍼런스로 골라줘” |

라우트 상세는 설치된 레포의 `skills/youpd-skills/SKILL.md` 와 `references/research/youtube/INDEX.md` 를 따른다.

## 파일

| 파일 | 용도 |
|------|------|
| [`channel-brief.md`](./channel-brief.md) | 시청자·톤·금지선 — 에이전트 컨텍스트 |
| [`README.md`](./README.md) | 본 안내 |
