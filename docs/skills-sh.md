# skills.sh 등록 (Vercel Agent Skills 생태계)

[skills.sh](https://skills.sh)는 **별도 “등록 신청” 폼이 없습니다.** 공개 GitHub 레포에 스킬이 있고, 사용자가 `npx skills add` 로 설치하면 리더보드에 **익명 설치 통계**로 노출됩니다.

공식 문서: https://skills.sh/docs

## 우리 레포에서 필요한 것

1. **공개** GitHub 레포 `ssota-labs/youpd-skills` (또는 배포 전용 repo)
2. 스킬 경로: `skills/youpd-skills/SKILL.md` (YAML frontmatter `name`, `description` 필수)
3. README에 설치 한 줄

## 유저 설치 명령

```bash
# 권장: Cursor + 글로벌 툴킷 + 비대화형
npx skills add ssota-labs/youpd-skills --skill youpd-skills -a cursor -g -y

# 설치 가능 목록 확인
npx skills add ssota-labs/youpd-skills --list
```

`-g` = 툴킷 공용 · `-y` = yes to all prompts · 워크스페이스 DB는 채널 폴더에만 ([installation.md](./installation.md)).

설치 후 에이전트가 `references/setup/bootstrap.md` 절차로 `pnpm install`·YouTube 키(HTML)를 처리한다. **개발 레포 전체 clone은 필요 없다.**

## skills.sh 페이지·배지

레포가 공개되고 설치가 발생하면 (통계 반영까지 시간이 걸릴 수 있음):

- 페이지: https://skills.sh/ssota-labs/youpd-skills
- README 배지:

```markdown
[![skills.sh](https://skills.sh/b/ssota-labs/youpd-skills)](https://skills.sh/ssota-labs/youpd-skills)
```

## Cursor Marketplace 와의 차이

| | skills.sh + `npx skills add` | Cursor Marketplace |
|--|------------------------------|---------------------|
| 등록 | Git 공개 + 설치 통계 | [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) 검수 |
| 매니페스트 | `SKILL.md` + repo layout | `.cursor-plugin/plugin.json` |
| 개발 파일 | 스킬 서브트리만 설치 | 플러그인 번들 규칙 |

둘 다 쓸 수 있다. skills.sh는 **스킬 발견·설치**에, Cursor 플러그인은 **IDE 통합**에 가깝다.

## 관련

- [installation.md](./installation.md) — 채널 폴더 + bootstrap
- `skills/youpd-skills/references/setup/bootstrap.md`
