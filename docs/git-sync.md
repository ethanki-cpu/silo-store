# Git Sync Workflow

> 회사 PC와 개인 노트북을 오가며 작업할 때 항상 동일한 절차를 따르기 위한 공식 문서입니다.
> Git 관련 작업은 이 문서를 기준으로 수행합니다.

## Git Workflow (전체 흐름)

1. 작업 시작 시 Push/Pull Workflow(아래)에 따라 원격과 동기화한다.
2. 하나의 Epic(Task)만 작업한다 (§작업 단위 참고).
3. 작업 종료 시 Commit Workflow(아래)에 따라 커밋/푸시한다.
4. 매 작업 종료마다 §작업 종료 시 반드시 업데이트 항목을 갱신한다.

---

## Push/Pull Workflow (작업 시작)

1. `git status` 확인
2. 로컬 변경사항이 있는지 확인
3. 변경사항이 있으면 **절대 pull하지 말고** 사용자에게 보고
4. 변경사항이 없으면
   ```bash
   git pull
   ```
5. pull 결과 요약
6. `git status` 재확인

---

## Commit Workflow (작업 종료)

1. type-check
2. lint
3. localhost 동작 확인
4. `git status` 확인
5. 변경 파일 요약
6. 사용자 승인
7. `git add .`
8. `git commit -m "<작업 내용>"`
9. `git push`

---

## 절대 하지 말 것

- git reset --hard
- git checkout --
- git push --force
- git pull --rebase
- force push
- 사용자 승인 없는 commit
- 사용자 승인 없는 push

---

## Schema 변경 절차

1. `docs/database-schema.sql` 백업
2. Schema 변경
3. `database-schema.sql` 최신화
4. `CHANGELOG.md` 업데이트

---

## 작업 종료 체크리스트 (반드시 업데이트)

- `CHANGELOG.md`
- `NEXT_TASK.md`
- `docs/database-schema.sql` (스키마 변경 시)
- `docs/EPIC.md` (Epic 진행 상태 변경 시)
- 관련 Blueprint 문서 (`docs/navigation-blueprint.md` / `docs/membership-blueprint.md` / `docs/content-blueprint.md` / `docs/design-system.md`) — 구조/권한/콘텐츠/디자인 변경 시

---

## 작업 단위

항상 하나의 Epic(Task)만 작업한다.

완료 후 반드시 STOP하고 사용자에게 보고한다.
