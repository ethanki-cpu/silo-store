# PROJECT DASHBOARD

> Claude Code가 매 세션 가장 먼저 읽는 프로젝트 현황 문서다. 여기서 Stage/EPIC 이름만
> 확인하고, 상세 근거가 필요하면 [docs/STAGES.md](STAGES.md) / [docs/EPIC.md](EPIC.md) /
> [NEXT_TASK.md](../NEXT_TASK.md)를 따라간다(이 문서 자체에 상세를 복제하지 않는다).
>
> 최종 확인: 2026-07-29 (EPIC-068, `develop`/`feature/EPIC-068` 계보 기준).
>
> ⚠️ 이 문서는 EPIC-056(2026-07-28) 이후 장기간 갱신되지 않았다가 이번에 EPIC-067
> 완료 시점 기준으로 다시 동기화됐다 — EPIC-057~066의 상세 요약은 이 문서가 아니라
> [docs/EPIC.md](EPIC.md) "완료" 섹션에 있다(EPIC-057~062는 커밋 로그 기준 한 줄
> placeholder만 있고 소급 상세 작성은 아직 미완료, NEXT_TASK.md P2 기록).

=====================================

## Project

Silo Store

=====================================

## Current Stage

Stage 1 — Foundation

=====================================

## Progress

전체 EPIC: **68개 완료**(EPIC-057~062는 요약 소급 작성 대기 중), 진행 중 0개, 예정 0개(대기 중).
EPIC-060~062로 Page Builder CMS(Page→Module→Board→Post, Navigation이 Board가 아닌
독립 Page로 직결)가 신설되고, EPIC-064A~066으로 Visual Widget Builder + Board
Management System까지 완성됐다. EPIC-066 감사에서 "79개 페이지가 `PageEditButton`만
있고 `PageBuilderRenderer`를 호출하지 않아 위젯이 화면에 반영되지 않는" 구조적 결함을
발견했고, EPIC-067(Phase 1)이 핵심 도메인 12개를 우선 전환 완료. EPIC-068은 이 문제의
근본 원인(catch-all 라우트 부재로 카테고리 생성만으로는 페이지가 생기지 않던 아키텍처
공백)을 해결하는 자동 생성 메커니즘(`[...slug]` catch-all + `ensurePageForSlug`)을
신설하고, 그 위에 24개 정적 placeholder 페이지 전환 + 71개 페이지 위젯 백필(SQL 실행
대기) + 신규 게시판 30개를 추가 — 남은 정적 placeholder는 8개(`salon/docent-tour`,
`salon/drinks`, `space-inquiry/*3`, `studio/*3`), 마이페이지 12개 탭(병존형 필요)은
아직 미착수. 상세: [docs/STAGES.md](STAGES.md) §Stage 1, [docs/EPIC.md](EPIC.md).

=====================================

## Current EPIC

없음 (대기 중 — 다음 지시 대기). 직전 완료: EPIC-068(카테고리 생성 시 자동 페이지+위젯
템플릿 생성 메커니즘 신설 + 사이트 전반 위젯 백필/신규 게시판 30개).

=====================================

## Next EPIC

미정 — 사용자 지시 대기. 유력 후보(우선순위순, 아래 "Current Priority" 참고):
1. **EPIC-068 백필 SQL 미실행** — `docs/sql/EPIC-068-category-page-templates.sql`을
   Supabase SQL Editor에서 실행해야 신규 게시판/위젯이 실제로 반영됨.
2. EPIC-067 Phase 2 잔여 — 정적 placeholder 8개(`salon/docent-tour`, `salon/drinks`,
   `space-inquiry/*3`, `studio/*3`) + 마이페이지 12개 탭(병존형).
3. Dual-nav 구조 정리 — EPIC-068에서 추가로 확인된 구체 사례들(NEXT_TASK.md 참고).
4. `/admin/boards` 클릭 테스트(EPIC-066, 관리자 로그인 필요해 에이전트가 미검증).
5. `feature/EPIC-053`(Block Editor) 브랜치 병합 여부 결정 — 여전히 미해결.
6. 페이지별 SEO metadata 적용.

=====================================

## Recent Completed

최근 완료 10개(최신순, 상세는 [docs/EPIC.md](EPIC.md)):

1. EPIC-068 — 카테고리 생성 시 자동 페이지+위젯 템플릿 생성 메커니즘 + 사이트 전반 백필
2. EPIC-067 — Page Builder Integration Phase 1(핵심 도메인 12개 페이지, 병존형 패턴)
3. EPIC-066 — Board Widget 실데이터 렌더링 완성 + Board Management System(관리자 CRUD)
4. EPIC-065 — JSON 기반 Page Builder → No-Code Visual Widget Builder(위젯 23종)
5. EPIC-064A — 모든 Route에 관리자 전용 "페이지 수정" 버튼 부착(126개 slug)
6. EPIC-063 — Navigation System Completion(Page-first Architecture)
7. EPIC-062 — Page Architecture — Navigation → Page → Module → Board
8. EPIC-061 — Fallback 제거 — 8개 Hub 전부 Page Builder만 사용
9. EPIC-060 — Page Builder CMS 시스템 신설(Page→Module→Board→Post)
10. EPIC-058 — 상위 카테고리 그룹 헤더 클릭+펼침 분리

=====================================

## Current Priority

**최우선**: `docs/sql/EPIC-068-category-page-templates.sql` 실행 — 지금은 코드
메커니즘만 반영돼 있고, 신규 게시판 30개/71개 페이지 위젯 백필은 이 SQL을 사용자가
Supabase SQL Editor에서 실행해야 실제로 눈에 보인다.

**차순위**: dual-nav 구조 정리 — EPIC-068이 membership/gallery/heritage/archive/
community-topics 등 여러 곳에서 "만든 페이지 경로 ≠ 실제 nav href" 구체 사례를 다수
발견(NEXT_TASK.md 참고). `feature/EPIC-053`(Block Editor) 미병합 브랜치 처리 결정도
여러 EPIC째 계속 이월되고 있는 항목.

=====================================

## Known Issues

**P0**
- Navigation 이중 구조: `src/lib/navConfig.ts`의 `FALLBACK_NAV_TABS`와 라이브
  `site_navigations`가 서로 다른 nav 트리로 공존(EPIC-054D 발견). EPIC-063 감사에서
  라이브 `site_navigations` 콘텐츠 자체는 정상 연결돼 있음을 재확인했지만, 두 트리를
  일원화하는 근본 결정은 아직 내려지지 않았다.

**P1**
- EPIC-067 Phase 2 잔여: 정적 placeholder 8개(`salon/docent-tour`, `salon/drinks`,
  `space-inquiry/*3`, `studio/*3`) + 마이페이지 12개 탭(병존형 필요) — 목록은 NEXT_TASK.md 참고.
- EPIC-068 백필 SQL(`docs/sql/EPIC-068-category-page-templates.sql`) 미실행 — 실행 전까지
  신규 게시판 30개/71개 페이지 위젯은 코드만 준비돼 있고 실제 데이터는 비어있음.
- Dual-nav 구조 구체 사례 다수 발견(EPIC-068) — membership/gallery 각 5개, heritage
  grandma/grandpa, archive 소개지/포스터, community-topics/weekday 각 항목까지 "만든
  페이지 경로 ≠ 실제 nav href" 패턴 확인, 상세는 NEXT_TASK.md 참고.
- `/admin/boards`(EPIC-066) 클릭 테스트 미완료(관리자 로그인 필요, 에이전트 정책상 미수행).
- `boards/page.tsx`(디렉토리)는 `PageModuleRenderer`(compile-time 모듈, EPIC-054C)로
  이미 여러 Board를 배치 중이라 DB 기반 `PageBuilderRenderer`와 함께 쓰려면 별도 설계
  필요 — EPIC-067 Phase 1에서 의도적으로 제외.
- Breadcrumb 자동 생성 시스템 부재(게시판 외 나머지 페이지).
- `Navbar.tsx` 반응형 브레이크포인트 부재(모바일 대응 UX 없음).

**P2**
- 페이지별 SEO metadata/canonical 없음(root 값만 전 페이지 상속).
- `docs/EPIC.md`의 EPIC-057~062 상세 요약이 커밋 로그 기준 한 줄 placeholder만 있음
  (EPIC-063이 발견, 소급 작성 필요).
- `member_bucket_list`(EPIC-052) 등 여러 EPIC의 DB DDL/시드가 Supabase Management
  API 토큰 부재로 라이브 미적용 상태(NEXT_TASK.md에 목록).

**P3**
- `next.config.ts`에 `experimental.reactCompiler` 미설정.
- `npm run lint`의 `react-hooks/set-state-in-effect` 29건은 저장소 전반에 걸친
  pre-existing 이슈(EPIC-067 수정 파일과는 무관함을 확인).

=====================================

## Technical Debt

- `docs/database-schema.sql`이 라이브 DB와 주기적으로 드리프트 — 스키마 변경 시마다
  갱신 규칙은 있으나 강제되지 않음.
- `docs/PROJECT_DASHBOARD.md`/`docs/STAGES.md`가 EPIC-056~066 사이 장기간 갱신되지
  않았던 이력이 있음 — 이번에 EPIC-067 기준으로 재동기화했으나, 다음 EPIC부터도 완료
  시마다 갱신하는 습관을 유지할 것(EPIC-054E가 정한 규칙, 여러 차례 누락된 전례 있음).
- `/api/boards/[id]/drafts`(서버 사이드 임시 저장, EPIC-053 브랜치) — 어떤 화면에서도
  호출하지 않는 죽은 코드.
- 상세는 [NEXT_TASK.md](../NEXT_TASK.md) 전체 참고(이 문서에 전부 복제하지 않음).

=====================================

## Next Milestone

**Stage 1(Foundation) 완료** — 남은 항목(docs/STAGES.md §Stage 1 참고):
1. `feature/EPIC-053`(Block Editor) 병합 여부 결정
2. Navigation 이중 구조 통합(P0)
3. 페이지별 SEO metadata
4. Responsive 레이아웃
5. Accessibility 전체 감사 마무리
6. EPIC-067 Phase 2 잔여(정적 8개 + 마이페이지 12개 탭) + EPIC-068 백필 SQL 실행

이 항목들이 마무리되면 Stage 2(Content Platform) 착수를 사용자와 논의한다.

=====================================
