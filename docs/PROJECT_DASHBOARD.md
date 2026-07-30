# PROJECT DASHBOARD

> Claude Code가 매 세션 가장 먼저 읽는 프로젝트 현황 문서다. 여기서 Stage/EPIC 이름만
> 확인하고, 상세 근거가 필요하면 [docs/STAGES.md](STAGES.md) / [docs/EPIC.md](EPIC.md) /
> [NEXT_TASK.md](../NEXT_TASK.md)를 따라간다(이 문서 자체에 상세를 복제하지 않는다).
>
> 최종 확인: 2026-07-30 (EPIC-074B 기준).

=====================================

## PROJECT VISION

Silo Platform은

Instagram의 콘텐츠

네이버 블로그의 콘텐츠

그리고 앞으로 생성되는 모든 콘텐츠를

평생 보존 가능한 문화 플랫폼으로 만드는 프로젝트이다.

Stage 2부터는

기능 개발보다

콘텐츠 구축이 핵심이 된다.

전체 배경은 [docs/VISION.md](VISION.md) 참고.

=====================================

## Roadmap

| Stage | Status |
|---|---|
| Stage 1 | 95% |
| Stage 2 | Ready |
| Stage 3 | Waiting |
| Stage 4 | Waiting |
| Stage 5 | Waiting |
| Stage 6 | Waiting |
| Stage 7 | Waiting |
| Stage 8 | Waiting |

상세는 [docs/STAGES.md](STAGES.md) 참고.

=====================================

## Current EPIC

EPIC-074B

=====================================

## Next EPIC

EPIC-075

=====================================

**위 5개 섹션(PROJECT VISION/Roadmap/Current EPIC/Next EPIC)은 이 문서 최상단에
항상 유지한다 — 다음 EPIC 착수 시마다 Current EPIC/Next EPIC/Roadmap 상태를 갱신할 것.**

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
신설하고, 그 위에 24개 정적 placeholder 페이지 전환 + 71개 페이지 위젯 백필 + 신규
게시판 30개를 추가 — 백필 SQL은 사용자가 Supabase SQL Editor에서 실행 완료(2026-07-30
라이브 확인됨). 남은 정적 placeholder는 8개(`salon/docent-tour`, `salon/drinks`,
`space-inquiry/*3`, `studio/*3`), 마이페이지 12개 탭(병존형 필요)은 아직 미착수.
오랫동안 미병합 상태였던 `feature/EPIC-053`(Block Editor)도 `develop`에 정식 병합
완료(2026-07-30) — 상세: [docs/STAGES.md](STAGES.md) §Stage 1, [docs/EPIC.md](EPIC.md).

=====================================

> **Current EPIC/Next EPIC은 최상단 블록이 SSoT다** — 아래 "Progress"/"Recent
> Completed"/"Current Priority" 등은 그 시점의 서술형 기록이라 최상단 블록과 표현이
> 다를 수 있으니, 최신 상태는 항상 최상단을 기준으로 한다.

=====================================

## Recent Completed

최근 완료 10개(최신순, 상세는 [docs/EPIC.md](EPIC.md)):

1. EPIC-053(merge) — 오랫동안 미병합이던 Block Editor 브랜치를 `develop`에 정식 병합
2. EPIC-068 — 카테고리 생성 시 자동 페이지+위젯 템플릿 생성 메커니즘 + 사이트 전반 백필
3. EPIC-067 — Page Builder Integration Phase 1(핵심 도메인 12개 페이지, 병존형 패턴)
4. EPIC-066 — Board Widget 실데이터 렌더링 완성 + Board Management System(관리자 CRUD)
5. EPIC-065 — JSON 기반 Page Builder → No-Code Visual Widget Builder(위젯 23종)
6. EPIC-064A — 모든 Route에 관리자 전용 "페이지 수정" 버튼 부착(126개 slug)
7. EPIC-063 — Navigation System Completion(Page-first Architecture)
8. EPIC-062 — Page Architecture — Navigation → Page → Module → Board
9. EPIC-061 — Fallback 제거 — 8개 Hub 전부 Page Builder만 사용
10. EPIC-060 — Page Builder CMS 시스템 신설(Page→Module→Board→Post)

=====================================

## Current Priority

**최우선**: EPIC-068 백필 SQL이 실행 완료(2026-07-30)되어 하위 카테고리에 실제
게시판/글이 생겼으니, 그동안 단순한 구성(application 버튼 목록 등)으로 남아있던 6개
Hub 페이지(`/docent`, `/community/topics`, `/heritage`, `/gallery`, `/archive`,
`/membership`)를 Hero + 다중 Slide 위젯으로 고도화하고, `salon-gallery-awards`/
`shop-reviews` 두 orphan 페이지(기존 gallery 단독 위젯이 백필 가드에 걸려 hero/quote가
안 채워짐)를 마저 보강한다.

**차순위**: dual-nav 구조 정리 — EPIC-068이 membership/gallery/heritage/archive/
community-topics 등 여러 곳에서 "만든 페이지 경로 ≠ 실제 nav href" 구체 사례를 다수
발견(NEXT_TASK.md 참고).

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
- (해결됨, 2026-07-30) EPIC-068 백필 SQL(`docs/sql/EPIC-068-category-page-templates.sql`)
  실행 완료 — 신규 게시판 30개/71개 페이지 위젯이 라이브 DB에 실제로 반영됨(anon-key
  REST 조회로 확인).
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
- `/api/boards/[id]/drafts`(서버 사이드 임시 저장, EPIC-053) — `develop`에 병합은
  됐으나 어떤 화면에서도 호출하지 않는 죽은 코드.
- 상세는 [NEXT_TASK.md](../NEXT_TASK.md) 전체 참고(이 문서에 전부 복제하지 않음).

=====================================

## Next Milestone

**Stage 1(Foundation) 완료** — 남은 항목(docs/STAGES.md §Stage 1 참고):
1. Navigation 이중 구조 통합(P0)
2. 페이지별 SEO metadata
3. Responsive 레이아웃
4. Accessibility 전체 감사 마무리
5. EPIC-067 Phase 2 잔여(정적 8개 + 마이페이지 12개 탭)
6. `docs/sql/epic-053-1.sql` 실행(Block Editor Storage Bucket+Policy/GC 완전 반영)

이 항목들이 마무리되면 Stage 2(Content Platform) 착수를 사용자와 논의한다.

=====================================
