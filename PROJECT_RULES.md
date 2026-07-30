# PROJECT RULES

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> 기존 `PROJECT_BLUEPRINT.md`의 §8(프로젝트 규칙)/§9(개발 워크플로우)/§11(Stage와 EPIC을 혼용하지
> 않는 원칙, 문서 갱신 규칙) 절을 그대로 옮긴 것입니다. 정보를 삭제하거나 요약하지 않았습니다.
> Git 작업 절차 자체(시작/종료/커밋/푸시/스키마 변경/금지 사항)의 더 상세한 버전은
> [docs/git-sync.md](docs/git-sync.md)와 `CLAUDE.md`의 "Git operating rules" 절 참고 — 이
> 문서는 그와 별개로 `PROJECT_BLUEPRINT.md`에 있던 "영구 개발 규칙"만 옮긴 것이다.

## 1. 프로젝트 규칙 (구 PROJECT_BLUEPRINT.md §8)

코드에서 실제로 확인되는 규칙:

- **App Router** 사용 (`src/app`, `page.tsx`/`route.ts` 파일 컨벤션).
- **TypeScript** 전면 사용, `strict` 여부 등 세부 설정은 `tsconfig.json` 참고.
- **Supabase**: 서비스 롤 키 없이 anon key만 사용. 모든 테이블에 RLS(Row Level Security) 적용(정책 상세는 [`PROJECT_ARCHITECTURE.md`](PROJECT_ARCHITECTURE.md)의 "미확인 사항" 참고).
- **Server Component / Client Component 사용 방식**:
  - 인증이 필요 없는 단순 목록/조회 페이지(`/shop`, `/clubs`, `/rental` 등)는 `async` Server Component + `export const dynamic = "force-dynamic"`로 매 요청 최신 데이터를 가져옴.
  - 현재 로그인 사용자 정보가 필요한 페이지(`/mypage`, `/me`, `/shop/[id]`, `/boards/**`, `/attendance`, `/downloads`, `/polls` 등)는 `"use client"` + `useAuth()`/`useParams()`를 쓰는 Client Component.
  - `useSearchParams()`를 쓰는 페이지(`/docent`, 루트 레이아웃의 `Navbar`)는 자체 `<Suspense>` 경계로 감싼다.
- **가격/권한 계산은 서버(Route Handler)에서만** 수행하고 클라이언트 값은 신뢰하지 않는다(`PROJECT_ARCHITECTURE.md` §6 인증 구조 참고).
- 별도 테스트 러너, CI 설정 없음 (`package.json`/`CLAUDE.md` 기준).
- **아키텍처를 절대 중복 생성하지 않는다(Never duplicate architecture)**: 이미 존재하는 시스템(Board Definition System, Page Module 시스템, 인증 헬퍼, 공용 컴포넌트 등)과 같은 역할을 하는 새 구조를 별도로 만들지 않는다 — 기존 것을 재사용/확장한다. 이 원칙은 코드베이스 전반에서 실제로 지켜지고 있음이 확인된다(예: `search`/`cta` 마크업을 `BoardHeader.tsx`와 Page Module이 `SearchInput.tsx`/`CtaButtons.tsx`로 공유, `BoardEmptyState`를 `BoardRenderer`와 `PageModuleRenderer` 양쪽이 공유 — `PAGE_BUILDER.md` 참고).
- **DB 스키마 변경 시 `docs/database-schema.sql`을 반드시 함께 갱신한다** — 이 파일이 드리프트되면(실제로 2026-07-23 이전 한 차례 드리프트됨) 코드와 문서가 어긋나 이후 모든 세션이 잘못된 스키마를 전제로 작업하게 된다(`PROJECT_ARCHITECTURE.md` §3 참고).

## 2. 개발 워크플로우 (구 PROJECT_BLUEPRINT.md §9)

현재 이 저장소(및 AI 협업 세션)에서 실제로 적용 중인 절차:

```
작업 지시 (지정 범위)
        ↓
관련 파일만 확인 (전체 재분석 금지)
        ↓
코드 수정
        ↓
npm run type-check
        ↓
npm run lint
        ↓
(필요 시) localhost 개발 서버로 화면/API 동작 확인
        ↓
git diff 확인 → git commit (타입 접두사: feat/fix/refactor/style/docs/chore)
        ↓
CHANGELOG.md 업데이트
        ↓
NEXT_TASK.md 업데이트
        ↓
결과 보고 (변경 파일 목록 / git diff 요약 / type-check 결과 / lint 결과 / 두 문서 업데이트 내용)
```

- DB 스키마 변경은 Supabase 마이그레이션 파일이 아니라 Supabase Management API를 통한 ad-hoc DDL 실행으로 관리됨(`CLAUDE.md` 참고).
- `silo-store`는 `C:\Users\김재학` 루트에 있던 상위 git 저장소와는 별개로, 자체 `.git`을 가진 독립 저장소로 분리되어 있음.

### 검증 순서 요약(Verification order)

위 워크플로우에서 실제로 지켜지는 검증 순서는 다음과 같다(이 저장소 전반의 커밋 이력에서 반복 확인됨):

1. **Typecheck** — `npx tsc --noEmit` (또는 `npm run type-check`)
2. **Lint** — `npm run lint`
3. **Build** — 배포 전 또는 프로덕션 빌드 차이를 확인해야 할 때 `npm run build`
4. **Git Status** — 커밋 전 `git status`/`git diff`로 변경 범위 확인, 커밋 후 다시 `git status`로 완료 확인

## 3. Stage/EPIC 관리 원칙과 문서 갱신 규칙 (구 PROJECT_BLUEPRINT.md §11)

이 프로젝트는 수백 개의 EPIC이 누적될 수 있는 장기 프로젝트라, **EPIC 번호(작업 단위)**와
**Stage(프로젝트 전체 진행 단계)**를 분리해 관리한다. **절대 혼용하지 않는다** — Stage는
"프로젝트가 지금 어느 국면인가"이고, EPIC은 "무엇을 했는가"의 기록이다. 새 EPIC의 제목/커밋
메시지에 Stage 번호를 붙이거나, Stage 번호를 EPIC 번호처럼 순차 증가시키지 않는다.

- **Project Stages**: [docs/STAGES.md](docs/STAGES.md) — Stage 정의, 각 Stage의 포함 내용과 현재 진행률/남은 항목.
- **Project Dashboard**: [docs/PROJECT_DASHBOARD.md](docs/PROJECT_DASHBOARD.md) — 매 세션
  가장 먼저 읽는 현황 요약(현재 Stage/진행률/진행 중인 EPIC/다음 EPIC/최근 완료 10개/
  최우선 순위/이슈 P0-P3/기술 부채/다음 마일스톤). 상세 근거는 복제하지 않고 STAGES.md/
  EPIC.md/NEXT_TASK.md로 링크한다.
- **문서 갱신 규칙(항상 지킬 것)**: 새 EPIC이 완료되면 다음을 함께 갱신한다:
  - `docs/PROJECT_DASHBOARD.md` (Current EPIC/Next EPIC/Recent Completed/Progress 갱신)
  - `docs/STAGES.md` (해당 EPIC이 기여한 Stage의 진행률/남은 항목 갱신)
  - `CHANGELOG.md` (변경 이력 추가)
  - `NEXT_TASK.md` (다음 할 일 갱신)

## 미확인 사항 (구 PROJECT_BLUEPRINT.md "TODO / 확인 필요" 중 프로세스 관련 항목)

- **테스트 전략**: 현재 자동화 테스트가 전혀 없음(`package.json`에 테스트 러너 없음). 도입 여부/범위는 확인 필요.

---

## 문서 재구성 메모(2026-07-30, EPIC-073)

"검증 순서 요약"(§2)은 원문 §9의 워크플로우 다이어그램에 있던 순서(type-check → lint → 필요 시
localhost 확인)를 사용자가 이번 EPIC-073 지시에서 요청한 4단계 이름(Typecheck/Lint/Build/Git
Status)으로 다시 정리해 덧붙인 것 — 원문 다이어그램은 그대로 보존하고 요약을 추가했을 뿐, 원문을
지우거나 대체하지 않았다.
