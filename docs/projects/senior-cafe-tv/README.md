# senior-cafe-tv (예시 시나리오)

고정된 “프로젝트 폴더”가 아니라, **설치 시 넣는 값의 예시**입니다.

## 동적으로 설치할 때

```bash
bash scripts/install-youpd-project.sh \
  --dir ~/youpd/senior-cafe-tv \
  --id senior-cafe-tv \
  --name "Senior Cafe TV" \
  --one-liner "시니어와 4050 자녀를 위한 유튜브 — 건강·일상·가족 소통" \
  --toolkit ~/youpd/youpd-skills \
  --audiences "senior-55-75,children-40-50"
```

생성되는 `project.json` 예시는 [`distribution/templates/youpd.project.example.json`](../../../distribution/templates/youpd.project.example.json) 와 동일한 형태입니다.

## 예전 방식 (정적 문서)

이 디렉터리의 [`channel-brief.md`](./channel-brief.md) 는 **수동 복사용 샘플**입니다. 새 설치는 `install-youpd-project.sh` 가 템플릿에서 `docs/channel-brief.md` 를 만듭니다.

## 가이드

- [installation.md](../../installation.md)
- [distribution.md](../../distribution.md)
