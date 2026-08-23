# PROJECT DASHBOARD

> Claude Code가 매 세션 가장 먼저 읽는 프로젝트 현황 문서다. 여기서 Stage/EPIC 이름만
> 확인하고, 상세 근거가 필요하면 [docs/STAGES.md](STAGES.md) / [docs/EPIC.md](EPIC.md) /
> [NEXT_TASK.md](../NEXT_TASK.md)를 따라간다(이 문서 자체에 상세를 복제하지 않는다).
>
> 최종 확인: 2026-08-23 (EPIC-143 기준, Current EPIC 블록만 갱신). EPIC-090~101,
> EPIC-141~142 구간은 CHANGELOG.md/docs/EPIC.md에는 기록돼 있으나 이 대시보드
> 최상단 블록 갱신이 밀려 있었음(다음에 시간 날 때 소급 정리 권장).

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

**(EPIC-081, 2026-08-06)** Stage 2는 이제 "Community-Led Growth" 5단계 성장 Flow(흥미
유입 → 유지/아카이빙 → 유대감 → 지식 구매 → 소속감/멤버십 락인)로 구체화된다 — 상세는
[PROJECT_VISION.md](../PROJECT_VISION.md) §Community-Led Growth Flow, 이를 뒷받침하는
기술 전략은 [PROJECT_ARCHITECTURE.md](../PROJECT_ARCHITECTURE.md) §Stage 2 기술 전략 참고.

전체 배경은 [PROJECT_VISION.md](../PROJECT_VISION.md) 참고(2026-07-30 EPIC-073 문서 재구성 때 `docs/VISION.md`에서 이동).

=====================================

## Roadmap

| Stage | Status |
|---|---|
| Stage 1 | 완료(핵심 조건 충족, EPIC-081) — 잔여 세부 항목은 지속 개선으로 재분류 |
| Stage 2 | In Progress (EPIC-081, 2026-08-06 공식 진입) |
| Stage 3 | Waiting |
| Stage 4 | Waiting |
| Stage 5 | Waiting |
| Stage 6 | Waiting |
| Stage 7 | Waiting |
| Stage 8 | Waiting |

상세는 [docs/STAGES.md](STAGES.md) 참고.

=====================================

## Current EPIC

**(2026-08-23 갱신, 이 블록만 부분 갱신 — EPIC-141/142는 아래 목록에 개별 정리되지 않음, 상세는 docs/EPIC.md 상단 안내와 CHANGELOG.md 참고)**

EPIC-143(Instagram Graph API 기반 네이티브 피드 렌더링) — EPIC-142의 비공식
스크래핑+영구 재호스팅 요청을 이용약관/저작권 우려로 거부하고, 사일로 스토어
소유 계정(`_silo_store`)의 공식 Graph API(사용자가 직접 발급한 System User
장기 토큰)로 대체. 관리자 전용 `/api/instagram/fetch`가 게시물(IMAGE/VIDEO/
CAROUSEL_ALBUM)을 조회해 원본 CDN URL을 클라이언트에 노출하지 않고 서버가
직접 R2에 재호스팅, `instagram_feeds`(public read + admin write RLS)에
캐싱 — 프론트엔드는 이 캐시만 읽어 Instagram API 호출이 없다.
`InstagramFeedPost.tsx`(embla-carousel-react)가 iframe/embed 없이 네이티브로
렌더링. `tsc`/`lint` 0 errors, 실제 8개 게시물 라이브 동기화로 파이프라인
전체 검증 완료. **정정(같은 날, EPIC-143-후속)**: 실제 소비처는 별도 피드
페이지가 아니라 게시글 본문 내 기존 인스타그램 임베드를 실시간으로 네이티브
UI로 치환하는 것이었음 — `UniversalBlockRenderer.tsx`를 `processNativeInstagramEmbeds()`
(신규)로 교체, `instagram_feeds` 미매칭 시 EPIC-133 `InstagramMediaSlider`로
폴백. 과거 게시글도 즉시 소급 적용. 상세는 CHANGELOG.md 참고. 브랜치
`feature/EPIC-141`.

직전 EPIC-140(상단 탭/사용자 메뉴 추가·복제·삭제 + 드롭다운 z-index 버그 수정 +
신규 "상단 사이드바" Kinfolk형 메가 메뉴) — 헤더 드롭다운이 슬라이드쇼에
가려지던 z-index 버그 수정(EPIC-136이 position:fixed 제거하며 z-40도
같이 지웠던 게 원인), EPIC-138의 user_menu target_type을 활용해 상단
탭/사용자 메뉴 항목 추가·복제·삭제를 CategoryTreeManager.tsx와 동일한
로직으로 신설, 헤더 우측 새 아이콘을 누르면 위→아래로 슬라이드하는 3열
메가 메뉴(TopSidebarPanel.tsx, 컬럼1 실제 세션 데이터/컬럼2 관리자 링크/
컬럼3 hover cascade)를 신규 구현. `tsc`/`lint`/`build` 0 errors. 이번
세션은 로그인 세션 없는 새 브라우저 프로필이라 캔버스 내 실제 클릭/드래그는
직접 확인 못함(원인 추적·기존 검증 로직 재사용으로 근거 대체). 브랜치
`feature/EPIC-140`.

직전 EPIC-137("홈페이지 설정 관리"를 화면 전환 없는 단일 실시간 캔버스 +
Elements/Controls/Page/Themes 4탭 패널로 재구성) — 사용자가 EPIC-136도
여전히 "4개의 화면"이라 재차 거부, 화면 전환 없는 단일 캔버스(헤더→
슬라이드쇼→사이드바 아이콘 미리보기→하단 메뉴까지 실제 순서로 이어붙임)
+ Elements/Controls/Page/Themes 4탭 왼쪽 패널로 재편. 이미지 필드마다
실제 썸네일 미리보기 추가, Craft.js(하단 메뉴)와 커스텀 슬롯(헤더 등)
두 selection 체계를 CraftBridge로 통합. `tsc`/`lint`/`build` 0 errors,
Browser pane 실측(캔버스 연속성/썸네일/selection 통합/저장 왕복) 확인.
브랜치 `feature/EPIC-137`.

직전 EPIC-136
(헤더 편집 캔버스를 "스타일 전용 복제품"에서 실제 `<Navbar>` 그
자체로 전환 + 진짜 자유 드래그) — 사용자가 EPIC-135 캔버스를 "실제
사이트와 다르다"/"블록을 눌러도 왼쪽에 설정이 없다"/"드래그로 자유롭게
옮기게 해달라"고 재차 지적해 전면 재구축 확정. `Navbar.tsx`에 편집 모드
prop을 얹어 관리자 캔버스가 실제 컴포넌트를 그대로 렌더링(클론 폐기,
드리프트 구조적으로 불가능), 각 요소를 신규 `HeaderSlot`으로 감싸 클릭
선택+`transform: translate(dx,dy)` 기반 자유 드래그(EPIC-108 %좌표
시스템이 아닌 EPIC-117 tier1Tabs 트릭을 일반화). 실측 중 `position:fixed`
헤더가 캔버스 안에서 안 보이던 버그 발견·수정. `src/components/craft/
chrome/`(EPIC-132/135 전체) 삭제. `tsc`/`lint`/`build` 0 errors, Browser
pane 실측(실제 홈페이지 무회귀, `PointerEvent` 직접 디스패치로 드래그
로직 검증 — 저장→새로고침→관리자/공개 홈페이지 양쪽 transform 유지,
PC/모바일 독립 확인). 브랜치 `feature/EPIC-136`.

> 이 섹션은 EPIC-109(2026-08-14) 이후 EPIC-136(2026-08-20)까지 최상단
> 갱신이 밀려 있었다 — 그 사이 EPIC-110~135는 `docs/EPIC.md`/`CHANGELOG.md`에
> 개별 기록돼 있음(기존에 이미 알려진 드리프트, 전체 소급 재작성은 범위 밖).

직전 EPIC-109(자유 배치 이미지 리사이즈에 비율 유지/직접입력/프리셋 추가) —
`ImageBlock`에 비율 잠금 토글+프리셋 드롭다운+직접입력, `FreePositionHandles`가
컨테이너 실제 픽셀 크기로 환산해 진짜 픽셀 비율을 유지하도록 확장. `tsc`/
`lint`/`build` 0 errors, 클린 세션에서 1:1 잠금 리사이즈 픽셀 정확도 확인.
브랜치 `feature/EPIC-109`.

직전 EPIC-108(자유 배치(콜라주) + 홈페이지 슬라이드쇼 위젯 관리자 연동) —
컨테이너/텍스트/이미지/버튼/영상/슬라이드쇼/게시판연동 7종에 이미지 위에
이미지처럼 자유롭게 겹쳐 드래그하는 배치 기능(`FreePositionHandles`) 신설,
`HeroSlideshowWidgetBlock`에 관리자 "홈페이지 설정 관리"와 실시간 연동
토글 추가. `tsc`/`lint`/`build` 0 errors, 임시 진단 라우트로 겹침·드래그
이동·리사이즈·실제 관리자 데이터 로딩 전부 실측 확인. 브랜치
`feature/EPIC-108`.

직전 EPIC-107(홈페이지 슬라이드쇼를 Craft 위젯으로 전환) — 기존 `HeroSlideshow.tsx`
(히어로 슬라이드쇼, "홈페이지 설정 관리"가 관리하던 그 기능)를 새로 만들지
않고 그대로 감싼 `HeroSlideshowWidgetBlock`으로 Craft 캔버스 어디든 삽입
가능. `tsc`/`lint`/`build` 0 errors, 임시 진단 라우트로 실제 DOM 구조 일치
확인. 브랜치 `feature/EPIC-107`. **이것으로 EPIC-101~107 로드맵 전체 완료 —
다음 작업은 사용자 지시 대기.**

직전 EPIC-106(게시판 연동 블록 카테고리 필터) — `GET .../posts`에 `category`
파라미터+`availableCategories` 응답 추가(기존 tag/year 필터와 동일 패턴),
`BoardEmbedBlock`/`TimelineEmbedBlock` 설정 패널에 카테고리 드롭다운 신설.
`tsc`/`lint`/`build` 0 errors, 존재하지 않는 카테고리 필터 → 0건으로 파라미터
실제 적용 확인(라이브에 카테고리 채운 글이 아직 없어 양성 케이스는 추후
확인). 브랜치 `feature/EPIC-106`.

직전 EPIC-105(하단 Footer를 Craft.js 비주얼 에디터로 전환) — 기존 폼 기반
`/admin/footer`를 다른 Craft 페이지와 동일한 자유 레이아웃 에디터로 교체.
`GlobalFooter.tsx`(신규)가 `Footer.tsx`(삭제)를 대체, 기존 `footer_config`
실데이터를 마이그레이션. `tsc`/`lint`/`build` 0 errors, 클린 서버로 실렌더링
확인. 브랜치 `feature/EPIC-105`.

직전 EPIC-104(헤더 스크롤 모션) — Kinfolk.com처럼 스크롤 내리면 헤더가 숨고 올리면
다시 나타남. `useHideOnScroll.ts`(신규) + `Navbar.tsx` fixed+transform 전환.
개발 중 ResizeObserver 되먹임 루프(메뉴가 영원히 로딩 상태로 멈추는 버그)를
실제로 겪고 원인 특정+수정(rAF+반올림 값 비교로 루프 차단). `tsc`/`lint`/
`build` 0 errors, scrollY 시퀀스/사이드바 z-index stacking 로컬 확인 완료.
브랜치 `feature/EPIC-104`.

직전 EPIC-103(Kinfolk 16블록 홈 레이아웃) — EPIC-102 원자 블록을 조합해 Kinfolk.com
홈페이지 1~16번 블록 구조를 재현(`src/components/craft/home/defaultTree.tsx`
재구성). `SlideshowBlock.sticky`(커튼 효과)/`BoardEmbedBlock.dragRow`·
`spotlight`/`ImageBlock` 오버레이 캡션/신규 `ShopItemsGridBlock`(가격 있는
사일로 상점 데이터). `tsc`/`lint`/`build` 0 errors. **아직 라이브에 반영 안
됨**(홈페이지에 이미 저장된 `craft_state`가 있어 기본 트리 변경만으로는
실제 사이트가 안 바뀜 — 라이브 전환 여부 사용자 결정 대기). 상세는
[docs/EPIC.md](EPIC.md)/CHANGELOG.md 참고. 브랜치 `feature/EPIC-103`.

직전 EPIC-102(Craft.js 프리폼 에디터 코어) — Kinfolk 홈페이지 16블록 재현 요청을 계기로,
"정해진 6~7종 섹션 블록만 추가" 방식이던 Craft 에디터를 "컨테이너 안에 원자 블록을
자유롭게 드래그앤드롭 + 개별 설정 패널(`craft.related`, 이 코드베이스 최초 도입) +
공통 모션"으로 전환하는 기반 작업. 원자 블록 8종(Container/Text/Image/Button/Video/
Slideshow/BoardEmbed/TimelineEmbed) + 진짜 드래그 툴박스(`connectors.create`) +
SettingsSidebar + MotionSettingsSection, 홈페이지 전용 독자 구현이던
CraftHomeEditor/Renderer도 공용 셸로 마이그레이션. `tsc`/`lint`/`build` 0 errors,
관리자 로그인 세션 없어 실제 드래그/저장 왕복은 다음 세션 확인 필요. 직전
EPIC-101(홈페이지 Craft.js 이미지 크기 버그 수정)도 같은 세션에 완료. 상세는
[docs/EPIC.md](EPIC.md)/CHANGELOG.md 참고. 브랜치 `feature/EPIC-102`.

=====================================

## Next EPIC

미정 — EPIC-101~107(Kinfolk 홈페이지 재현 + Craft.js 프리폼 에디터 로드맵,
계획 파일 `C:\Users\nasdo\.claude\plans\fancy-mapping-eich.md`)이 전부
완료되어 다음 지시 대기. 남은 후보: 관리자 로그인 세션으로 EPIC-102~107의
"다음에 확인 필요" 항목들(Toolbox 드래그/설정 패널 저장 왕복 등, NEXT_TASK.md
기록) 실사용 검증. `PROJECT_ARCHITECTURE.md` §Stage 2 기술 전략의 Event
Telemetry/Paywall Routing도 별도 후보로 남아있음.

=====================================

**위 5개 섹션(PROJECT VISION/Roadmap/Current EPIC/Next EPIC)은 이 문서 최상단에
항상 유지한다 — 다음 EPIC 착수 시마다 Current EPIC/Next EPIC/Roadmap 상태를 갱신할 것.**

=====================================

## Project

Silo Store

=====================================

## Current Stage

Stage 2 — Content Platform (EPIC-081, 2026-08-06 공식 진입 — 상세는 [docs/STAGES.md](STAGES.md))

=====================================

## Progress

전체 EPIC: **70개 완료**(EPIC-057~062는 요약 소급 작성 대기 중), 진행 중 0개, 예정 0개(대기 중).
EPIC-060~062로 Page Builder CMS(Page→Module→Board→Post, Navigation이 Board가 아닌
독립 Page로 직결)가 신설되고, EPIC-064A~066으로 Visual Widget Builder + Board
Management System까지 완성됐다. EPIC-066 감사에서 "79개 페이지가 `PageEditButton`만
있고 `PageBuilderRenderer`를 호출하지 않아 위젯이 화면에 반영되지 않는" 구조적 결함을
발견했고, EPIC-067(Phase 1)이 핵심 도메인 12개를 우선 전환 완료. EPIC-068은 이 문제의
근본 원인(catch-all 라우트 부재로 카테고리 생성만으로는 페이지가 생기지 않던 아키텍처
공백)을 해결하는 자동 생성 메커니즘(`[...slug]` catch-all + `ensurePageForSlug`)을
신설하고, 그 위에 24개 정적 placeholder 페이지 전환 + 71개 페이지 위젯 백필 + 신규
게시판 30개를 추가 — 백필 SQL은 사용자가 Supabase SQL Editor에서 실행 완료(2026-07-30
라이브 확인됨). 남은 정적 placeholder는 7개(`salon/docent-tour`, `salon/drinks`,
`space-inquiry/*2`, `studio/*3` — `space-inquiry/item-rental`은 EPIC-087-PHASE-E에서
실제 신청 폼으로 전환 완료), 마이페이지 12개 탭(병존형 필요)은 아직 미착수.
오랫동안 미병합 상태였던 `feature/EPIC-053`(Block Editor)도 `develop`에 정식 병합
완료(2026-07-30) — 상세: [docs/STAGES.md](STAGES.md) §Stage 1, [docs/EPIC.md](EPIC.md).

=====================================

> **Current EPIC/Next EPIC은 최상단 블록이 SSoT다** — 아래 "Progress"/"Recent
> Completed"/"Current Priority" 등은 그 시점의 서술형 기록이라 최상단 블록과 표현이
> 다를 수 있으니, 최신 상태는 항상 최상단을 기준으로 한다.

=====================================

## Recent Completed

최근 완료 10개(최신순, 상세는 [docs/EPIC.md](EPIC.md)):

1. EPIC-099 — EPIC-098 후속 3건: 뉴스레터 구독 저장 + Craft 에디터 Toolbox UI + Craft.js를 5개 허브 페이지로 확장(전용 블록 15종 + 사이트 구성 관리 토글 + Native 위젯 4종, main/develop 병합 완료)
2. EPIC-098 — 홈페이지 전용 Craft.js 에디토리얼 빌더(Two-Track, main/develop 병합 완료)
3. EPIC-089 — Floating Action UX, YouTube-style Nested Comments, & Admin/Sidebar Control(브랜치 `feature/EPIC-089`)
4. EPIC-087 — Admin Dashboard Overhaul, Tier-based Access Control, & Global UX(PHASE-0~G, 브랜치 `feature/EPIC-087`)
5. EPIC-086 — Slide Module 글쓰기 버튼(main/develop 병합 완료)
6. EPIC-084-REVISED — Universal Navigation, Contextual Write Flow, 3-Column Category Selector, & Editor UX Overhaul(main/develop 병합 완료)
7. EPIC-085 — Universal Block Renderer, Frictionless Archiving (Scraping System), & Dynamic OG/SEO Engine(main/develop 병합 완료)
8. EPIC-084 — Universal Routing & Contextual Write Flow, Editor Media Control, & Admin Clean-up(main/develop 병합 완료)
9. EPIC-083 — Universal Editor Extension(Table/Color/FontFamily/SourceAttribution, main/develop 병합 완료)
10. EPIC-082 — Universal Media Library Schema & R2 Direct Upload Pipeline

(EPIC-090~097 구간은 docs/EPIC.md 소급 작성 대기 — 위 "최종 확인" 각주 참고)

=====================================

## Current Priority

**최우선**: EPIC-068 백필 SQL이 실행 완료(2026-07-30)되어 하위 카테고리에 실제
게시판/글이 생겼으니, 그동안 단순한 구성(application 버튼 목록 등)으로 남아있던 6개
Hub 페이지(`/docent`, `/community/topics`, `/heritage`, `/gallery`, `/archive`,
`/membership`)를 Hero + 다중 Slide 위젯으로 고도화하고, `salon-gallery-awards`/
`shop-reviews` 두 orphan 페이지(기존 gallery 단독 위젯이 백필 가드에 걸려 hero/quote가
안 채워짐)를 마저 보강한다.

**차순위**: ~~dual-nav 구조 정리~~ **(EPIC-080, 2026-08-06 완료 — 위 Known Issues P0 참고)**.
Stage 2 진입(EPIC-081)에 따라 다음 차순위는 `PROJECT_ARCHITECTURE.md` §Stage 2 기술 전략에
기록된 항목(Universal Content Editor 확장, R2 Direct Upload, Frictionless Archiving,
Event Telemetry, Paywall Routing) 중 하나를 사용자와 논의해 착수하는 것.

=====================================

## Known Issues

**해결됨**
- ~~Navigation 이중 구조~~ **(EPIC-080, 2026-08-06 코드/문서/DB 전부 완료)**: `FALLBACK_NAV_TABS`를
  라이브 `site_navigations`와 동기화, dual-nav 혼선으로 남은 그림자 정적 페이지 17개
  삭제+리다이렉트, 라이브 DB 반영(할머니/할아버지 href 정정 + 그림자 nav 항목 17개 삭제)까지
  전부 완료(사용자가 Supabase SQL Editor에서 직접 실행, Management API 재조회로 확인).

**P0**
- (없음)

**P1**
- EPIC-067 Phase 2 잔여: 정적 placeholder 8개(`salon/docent-tour`, `salon/drinks`,
  `space-inquiry/*3`, `studio/*3`) + 마이페이지 12개 탭(병존형 필요) — 목록은 NEXT_TASK.md 참고.
- (해결됨, 2026-07-30) EPIC-068 백필 SQL(`docs/sql/EPIC-068-category-page-templates.sql`)
  실행 완료 — 신규 게시판 30개/71개 페이지 위젯이 라이브 DB에 실제로 반영됨(anon-key
  REST 조회로 확인).
- (해결됨, EPIC-080) Dual-nav 구조 구체 사례 다수 발견(EPIC-068) — membership/gallery 각 5개,
  heritage grandma/grandpa, archive 소개지/포스터, community-topics/weekday 각 항목까지
  "만든 페이지 경로 ≠ 실제 nav href" 패턴 확인됐던 것은 EPIC-080에서 코드/문서/DB 전부 해소.
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

**(EPIC-081, 2026-08-06) Stage 2(Content Platform) 공식 진입 완료.** Stage 1의 핵심 완료
조건(Navigation 이중 구조 통합 포함, EPIC-080)은 충족되었다 — 아래는 Stage 1을 닫는 게이트가
아니라 Stage 2와 병행하는 지속 개선 항목으로 재분류:
1. 페이지별 SEO metadata
2. Responsive 레이아웃
3. Accessibility 전체 감사 마무리
4. EPIC-067 Phase 2 잔여(정적 8개 + 마이페이지 12개 탭)
5. `docs/sql/epic-053-1.sql` 실행(Block Editor Storage Bucket+Policy/GC 완전 반영)

**Stage 2 다음 마일스톤**: `PROJECT_ARCHITECTURE.md` §Stage 2 기술 전략(Universal Content
Editor 확장, R2 Direct Upload, Frictionless Archiving, Event Telemetry, Paywall Routing)
중 우선순위를 사용자와 논의해 다음 EPIC으로 착수.

=====================================
