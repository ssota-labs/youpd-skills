# Route: `research/youtube/create-reference-folder`

> **상태**: 사용 가능

Reference folder group과 자유 child folder를 생성/재사용한다.

## 실행

```bash
pnpm tsx skills/youpd-skills/scripts/research/youtube/create-reference-folder.ts \
  --group-name "AI 생산성 레퍼런스" \
  --default-stage-folders
```

## 입력

| 인수 | 형태 | 기본 | 설명 |
|---|---|---|---|
| `--group-name` | string | — | folder group 이름 |
| `--folder` | repeatable `name[:stage]` | — | 자유 child folder |
| `--default-stage-folders` | flag | false | 현상/욕구/계획/행동/보상 폴더 생성 |
| `--audience` | string | — | 고객군 |
| `--seed-theme` | string | — | 탐색 주제 |
| `--intent-summary` | string | — | 기획 의도 요약 |
| `--description` | string | — | 설명 |
| `--db`, `-d` | path | — | DB override |

## stdout result

```json
{
  "folderGroupId": "uuid",
  "folderIds": ["uuid"],
  "createdGroup": true,
  "createdFolderCount": 5
}
```

## DB 영향

- write: `reference_folder_groups`, `reference_folders`
- 외부 API 없음
