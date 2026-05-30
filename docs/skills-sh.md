# skills.sh 등록 (Vercel Agent Skills 생태계)

[skills.sh](https://skills.sh)는 **별도 “등록 신청” 폼이 없습니다.** 공개 GitHub 레포 + 사용자의 `npx skills add` 설치 통계로 리더보드에 노출됩니다.

공식 문서: https://skills.sh/docs

## 유저 설치

### 권장

```bash
npx skills add ssota-labs/youpd-skills --skill youpd-skills \
  -a cursor -a claude-code -a codex \
  -g -y
```

### 플래그 없음 (대화형)

```bash
npx skills add ssota-labs/youpd-skills
```

스킬·에이전트·프로젝트/글로벌·확인을 CLI가 물어본다. 상세: [installation.md](./installation.md).

### 목록

```bash
npx skills add ssota-labs/youpd-skills --list
```

설치 후 `references/setup/bootstrap.md` (자동 `pnpm install`, YouTube 키 HTML). **DB는 채널 폴더** `.youpd/workspace.db` 만.

## skills.sh 페이지·배지

```markdown
[![skills.sh](https://skills.sh/b/ssota-labs/youpd-skills)](https://skills.sh/ssota-labs/youpd-skills)
```

## Cursor Marketplace

| | skills.sh + `npx skills add` | Cursor Marketplace |
|--|------------------------------|---------------------|
| 등록 | Git 공개 + install 통계 | [marketplace/publish](https://cursor.com/marketplace/publish) |
| 매니페스트 | `SKILL.md` | `.cursor-plugin/plugin.json` |

---

[installation.md](./installation.md)
