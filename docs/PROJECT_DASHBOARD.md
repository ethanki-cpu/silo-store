# PROJECT DASHBOARD

> Claude Code가 매 세션 가장 먼저 읽는 프로젝트 현황 문서다. 여기서 Stage/EPIC 이름만
> 확인하고, 상세 근거가 필요하면 [docs/STAGES.md](STAGES.md) / [docs/EPIC.md](EPIC.md) /
> [NEXT_TASK.md](../NEXT_TASK.md)를 따라간다(이 문서 자체에 상세를 복제하지 않는다).
>
> 최종 확인: 2026-07-28 (EPIC-056, `feature/EPIC-054A`→`054B`→`054C`→`054D`→`054E`→`054F`→`055`→`056` 계보 기준).

=====================================

## Project

Silo Store

=====================================

## Current Stage

Stage 1 — Foundation

=====================================

## Progress

Stage 1 (Foundation) 14개 세부 항목 기준: **완료 10 / 부분 완료 3 / 미착수 1(Block Editor 완전판은 별도 브랜치에 존재)** — Routing은 EPIC-054F가 76개 page.tsx로 확장, Board System은 EPIC-055가 마지막 미연결 구간(UniversalBoard stub 3개 그룹)까지 실제 게시판에 연결, EPIC-056이 14개 Board Module을 정립하고 `/boards/[id]`(약 72개 게시판) 전체에 Hero/Breadcrumb를 추가해 완료로 유지.

전체 EPIC: **60개 완료**, 진행 중 0개, 예정 0개(대기 중). 상세: [docs/STAGES.md](STAGES.md) §Stage 1, [docs/EPIC.md](EPIC.md).

=====================================

## Current EPIC

없음 (대기 중 — 다음 지시 대기). 직전 완료: EPIC-056(14개 Board Module 정립 + `/boards/[id]` 전체에 Hero/Breadcrumb 추가, `/studio` 페이지 재조립 — 브라우저 확인 완료).

=====================================

## Next EPIC

미정 — 사용자 지시 대기. 유력 후보(우선순위순, 아래 "Current Priority" 참고):
1. `feature/EPIC-053`(Block Editor) 브랜치 병합 여부 결정
2. Navigation 이중 구조(P0) 해결
3. 페이지별 SEO metadata 적용

=====================================

## Recent Completed

최근 완료 10개(최신순):

1. EPIC-056 — 14개 Board Module 정립 + `/boards/[id]`·`/studio` 등에 실제 화면 변화 적용
2. EPIC-055 — Universal Board System 완성(UniversalBoard stub 제거, 실제 게시판 연결, EmptyState 중복 통합)
3. EPIC-054F — Community/Heritage/Studio/Membership/Gallery/Archive 6개 카테고리 허브 Page 신설(공용 PageTemplate)
4. EPIC-054E — Stage/EPIC 분리 운영 체계 구축
5. EPIC-054D — 사이트 전체 Navigation/SEO/Routing 감사(Audit)
6. EPIC-054C — 모든 Page를 Board와 연결(BoardModule)
7. EPIC-054B — Page(화면)/Board(게시판) 분리, Page Module 시스템 신설
8. EPIC-054A — 모든 메뉴에 실제 Page 연결(Placeholder 19개 제거)
9. EPIC-052 — 마이페이지 Personal Hub 확장 + Tiptap 기본 에디터 도입
10. EPIC-051 — Studio(공간 문의) 게시판 생성 + 기존 예약 Flow 연동

상세: [docs/EPIC.md](EPIC.md) "완료" 섹션(전체 60건).

=====================================

## Current Priority

**최우선**: 별도 미병합 브랜치 `feature/EPIC-053`(Block Editor 완성)을 이 계보에 언제/어떻게 병합할지 사용자와 결정 — Stage 1의 "Block Editor" 항목이 이 결정 하나에 걸려 있음.

**차순위**: EPIC-054D가 발견한 P0(Navigation 이중 구조: `FALLBACK_NAV_TABS` vs 라이브 `site_navigations`) 해결 방향 논의.

=====================================

## Known Issues

**P0**
- Navigation 이중 구조: `src/lib/navConfig.ts`의 `FALLBACK_NAV_TABS`(EPIC-044 재작성분, `/heritage/*/[name]`·`/community/club/[name]` 동적 구조)와 라이브 `site_navigations`(DB 시드, `docs/navigation-blueprint.md` 반영분)가 서로 다른 nav 트리로 공존(EPIC-054D 발견).

**P1**
- 위 이중 구조로 인한 중복 콘텐츠 쌍: `/shop/heritage/*`(정적) vs `/heritage/*/[name]`(동적), `/space-inquiry/styling`(정적) vs `/shop/projects`(완전 구현), `/salon/*` 정적 페이지 다수 vs 동일 주제의 실제 게시판(Board Definition System).
- Breadcrumb 자동 생성 시스템 부재 — EPIC-056이 `/boards/[id]`(약 72개 게시판, `resolveBoardDefinition`으로 부모 hub 자동 추론)까지는 해결했지만, `/shop`/`/docent`/마이페이지 등 게시판이 아닌 나머지 페이지는 여전히 수동이거나 아예 없음.
- `Navbar.tsx` 반응형 브레이크포인트 부재(모바일 대응 UX 없음).
- Page Module 시스템의 `hero`/`notice`/`form`/`calendar`/`survey`/`ranking`/`profile_card` 7종이 아직 실제 Page에 연결되지 않음(Board 계열 4종만 연결됨, EPIC-054C).

**P2**
- 페이지별 SEO metadata/canonical 없음(root 값만 전 페이지 상속).
- `Navbar.tsx` 드롭다운은 Escape로 닫을 수 없음(포커스 이동으로만 닫힘, 순수 CSS 구조상 제약).
- `member_bucket_list`(EPIC-052) 등 여러 EPIC의 DB DDL/시드가 Supabase Management API 토큰 부재로 라이브 미적용 상태(NEXT_TASK.md에 목록).
- (EPIC-054F 발견) legacy `BOARD_DEFINITIONS.archive`(그룹, "자료게시판")와 신규 `INDIVIDUAL_BOARD_DEFINITIONS.archive`(hub, "Archive")가 동일 slug `"archive"` 사용 — 동작은 깨지지 않으나 혼동 여지.

**P3**
- `next.config.ts`에 `experimental.reactCompiler` 미설정 — 수동 메모이제이션 없이 렌더링(활성화 여부 검토 필요).
- `npm run lint`의 `react-hooks/set-state-in-effect` 27건은 저장소 전반에 걸친 pre-existing 이슈(단발성 수정이 아니라 전체를 훑는 별도 작업 필요, NEXT_TASK.md 기록).

=====================================

## Technical Debt

- `docs/database-schema.sql`이 라이브 DB와 주기적으로 드리프트(가장 최근 재동기화: 2026-07-23) — 스키마 변경 시마다 갱신 규칙은 있으나 강제되지 않음.
- 여러 EPIC(048~052)의 신규 게시판/컬럼 DDL이 Supabase Management API 토큰 없이는 에이전트가 직접 적용 못해, 라이브 미적용 상태로 누적됨(NEXT_TASK.md 최상단 다수) — EPIC-055로 확인된 실제 예시: 라이브 DB에는 여전히 legacy 게시판 6개(자유게시판/패트론 라운지/아티스트 홍보/After Adoption/자료게시판/질문과 답변)만 존재, 클럽/주제/hub 게시판은 전부 미시딩.
- `/api/boards/[id]/drafts`(서버 사이드 임시 저장, EPIC-053 브랜치) — 어떤 화면에서도 호출하지 않는 죽은 코드.
- ~~`src/components/shared/UniversalBoard.tsx`(EPIC-044 실데이터 없는 뼈대 stub)~~ — EPIC-055에서 해소(Universal Board System에 실제 연결 후 삭제).
- ~~`mypage/EmptyState.tsx`/`modules/EmptyState.tsx` 중복~~ — EPIC-055에서 해소(하나로 통합).
- 상세는 [NEXT_TASK.md](../NEXT_TASK.md) 전체 참고(이 문서에 전부 복제하지 않음).

=====================================

## Next Milestone

**Stage 1(Foundation) 완료** — 남은 5개 항목(docs/STAGES.md §Stage 1 "남은 EPIC" 참고):
1. `feature/EPIC-053`(Block Editor) 병합 여부 결정
2. Navigation 이중 구조 통합(P0)
3. 페이지별 SEO metadata
4. Responsive 레이아웃
5. Accessibility 전체 감사 마무리

이 5개가 마무리되면 Stage 2(Content Platform) 착수를 사용자와 논의한다.

=====================================
