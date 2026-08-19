# STAGES

> 이 문서는 프로젝트의 **진행 단계(Stage)**를 정의하는 공식 문서(SSoT)다.
>
> **Stage와 EPIC은 서로 다른 축이며 절대 혼용하지 않는다.**
> - **EPIC**은 작업 단위(하나의 변경 이력)다 — 상세 목록은 [docs/EPIC.md](EPIC.md) 참고.
> - **Stage**는 프로젝트 전체가 지금 어느 국면에 있는지를 나타내는 상위 분류(CTO Roadmap)다.
>
> 여러 EPIC이 모여 하나의 Stage를 이루지만, **EPIC 번호는 Stage와 무관하게 계속 증가한다.**
>
> 2026-07-30 (EPIC-073): CTO Roadmap 기준으로 문서 전면 재작성.
> 2026-08-06 (EPIC-081): Stage 2 공식 진입 선언. Stage 1 완료 조건 충족(EPIC-080이
> Navigation 이중 구조 통합을 코드/문서/DB 전부 완료) — 남은 세부 항목(SEO metadata, 반응형 레이아웃, 접근성 전체 감사)은
> Stage 1을 "닫는" 조건이 아니라 지속 개선 항목으로 재분류하고 Stage 2와 병행 진행한다.
> Stage 2의 구체적 전략(Community-Led Growth Flow, 기술적 뒷받침)은
> [`PROJECT_VISION.md`](../PROJECT_VISION.md) §Community-Led Growth Flow와
> [`PROJECT_ARCHITECTURE.md`](../PROJECT_ARCHITECTURE.md) §Stage 2 기술 전략 참고.

---

# STAGE 1 — Foundation

**목표**: 플랫폼 기반 구축

**완료**
- Authentication
- Authorization
- User System
- Layout
- Navigation
- Database
- Universal Board System
- Hub Page System
- Page Builder
- Widget System
- Admin System

**진행중**
- Board Management
- Widget ↔ Board 연결
- Widget Preview
- Widget Renderer
- Widget Property Panel
- Page Builder UX

**완료 조건**
- 관리자만으로 페이지 생성
- 관리자만으로 게시판 생성
- Widget 추가/삭제
- Widget ↔ Board 연결
- 개발자 도움 없이 운영 가능
- ~~Navigation 이중 구조 통합~~ **(EPIC-080, 2026-08-06 코드/문서/DB 전부 완료)** — `navConfig.ts`의
  `FALLBACK_NAV_TABS`를 라이브 `site_navigations`와 동기화, dual-nav 혼선으로 남은
  그림자 정적 페이지 17개 삭제+리다이렉트, 라이브 DB 반영(사용자가 Supabase SQL Editor에서
  직접 실행)까지 전부 완료.

> **Stage 1 → Stage 2 전환(EPIC-081, 2026-08-06)**: 위 완료 조건의 핵심(관리자 자율 운영,
> Navigation 일원화)은 충족되어 Stage 2에 공식 진입한다. SEO metadata/반응형 레이아웃/
> 접근성 감사 등 나머지 세부 항목은 Stage 1을 닫는 게이트가 아니라 지속 개선 항목으로
> 재분류해 Stage 2와 병행 진행한다(`docs/PROJECT_DASHBOARD.md` Known Issues 참고).

---

# STAGE 2 — Content Platform

**핵심**: 게시판을 만드는 단계가 아니다. 콘텐츠를 구축하는 단계이다.

> **(EPIC-081) Community-Led Growth Flow와의 대응**: 아래 Domain들은 단순 콘텐츠 목록이
> 아니라, [`PROJECT_VISION.md`](../PROJECT_VISION.md)의 5단계 성장 Flow(흥입 유입 →
> 유지/아카이빙 → 유대감 → 지식 구매 → 소속감/멤버십 락인) 각 단계가 실제로 딛고 서는
> 콘텐츠 기반이다 — 예: **Salon des Cent**(Community/Membership)는 1단계(흥미 유입)와
> 5단계(소속감/락인)를 동시에 지지하고, **Silo Store**(Treasure/Online Docent)는
> 4단계(지식 구매)를 지지한다. Stage 2 목표(콘텐츠 연결/검색/추천/아카이빙)는 이 Flow가
> 실제로 작동하기 위한 전제 조건이다. 상세는 `PROJECT_VISION.md` §Community-Led Growth Flow 참고.

**Domains**

**Silo Store**
- Treasure
- Treasure List
- Adoption Library
- Reviews

**Online Docent**
- Renaissance
- Baroque
- Rococo
- Neo Classicism
- Regency
- Victoria
- Art Nouveau
- Art Deco
- Beat Generation
- Counter Culture
- Digital

**Heritage**
- Grandmas
- Grandpas

**Salon des Cent**
- Community
- Membership
- Gallery
- Archive
- Studio

**목표**
- 콘텐츠 연결
- 콘텐츠 검색
- 콘텐츠 추천
- 콘텐츠 아카이빙

---

# STAGE 3 — Creator Platform

사용자가 직접 콘텐츠를 만드는 단계

- Story
- Gallery
- Collection
- Timeline
- Bucket List
- Visitor Log
- Media Library
- Draft
- Publish
- Revision
- Autosave
- Template

---

# STAGE 4 — Community Platform

- Like
- Comment
- Reply
- Follow
- Notification
- Activity Feed
- Badge
- Ranking
- Survey
- Club

---

# STAGE 5 — Business Platform

- Shop
- Reservation
- Rental
- Styling
- Membership
- Patron
- Payment
- Subscription
- CRM

---

# STAGE 6 — Experience Platform

- Timeline
- Collection
- Bucket List
- Visitor Log
- My Space
- My Exhibition
- Docent Course
- Achievement

---

# STAGE 7 — AI Platform

- AI Search
- AI Docent
- AI Curator
- AI Recommendation
- AI Writing
- AI Translation
- AI OCR

---

# STAGE 8 — Scale Platform

- SEO
- Analytics
- CDN
- Cache
- Monitoring
- Security
- Backup

---

**CURRENT STAGE**

Stage 2 — Content Platform (EPIC-081, 2026-08-06 공식 진입)

**CURRENT EPIC**

EPIC-136
헤더 편집 캔버스를 "스타일 전용 복제품"에서 실제 `<Navbar>` 그 자체로 전환 + 진짜 자유
드래그 — 사용자가 EPIC-135 캔버스를 "실제 사이트와 다르다"/"블록을 눌러도 왼쪽에
설정이 없다"/"드래그로 자유롭게 옮기게 해달라"고 재차 지적해 전면 재구축을 확정.
`Navbar.tsx`에 편집 모드 prop을 얹어 관리자 캔버스가 실제 컴포넌트를 그대로
렌더링(클론 폐기, 드리프트 구조적으로 불가능), 각 요소를 신규 `HeaderSlot`으로 감싸
클릭 선택+`transform: translate(dx,dy)` 기반 자유 드래그(EPIC-108 %좌표 시스템이 아닌
EPIC-117 tier1Tabs 트릭을 일반화 — Navbar의 기존 relative 구조를 안 건드림). 실측 중
`position:fixed` 헤더가 캔버스 안에서 안 보이던 버그 발견·수정. `src/components/craft/
chrome/`(EPIC-132/135 전체) 삭제. `tsc`/`lint`/`build` 0 errors, Browser pane 실측(실제
홈페이지 무회귀, `PointerEvent` 직접 디스패치로 드래그 로직 검증 — 저장→새로고침→
관리자/공개 홈페이지 양쪽 transform 유지 확인, PC/모바일 독립 확인). 브랜치
`feature/EPIC-136`.

직전 EPIC-135
"홈페이지 설정 관리"를 4개 분리 화면(로고/사이드바 아이콘/상단 탭/사용자 메뉴,
EPIC-134까지의 GrapesJS 접근 포함)에서 실제 페이지 렌더 순서 그대로(로고→
사용자 메뉴→상단 탭 1/2단→슬라이드쇼→좌우 사이드바 아이콘) 쌓아 보여주는
craft.js 캔버스 하나로 완전 통합 — 캔버스에서 블록을 클릭하면 왼쪽
SettingsSidebar에 그 블록 전용 설정이 뜨고(사용자가 명시적으로 정정한 좌측
배치), 저장은 여전히 `site_settings`(각 블록 `setProp`+기존 shim setter
이중 배선, EPIC-132와 동일 패턴). `HeaderGrapesEditor.tsx`(EPIC-134) 삭제,
새 `ChromeSlideshowBlock`(실제 공개 `HeroSlideshow.tsx` 재사용) 추가, 저장
시 `unified_header_layout`을 함께 비워 `Navbar.tsx`가 항상 이 화면이 쓴
`top_tab_style`/`account_menu_style` 값을 읽는 폴백 경로로 돌아가도록 보장.
Craft `<Frame>` 트리 안에 `<>...</>` React.Fragment를 그대로 끼워 넣으면
"Invariant failed: ...(undefined) does not exist in the resolver"로 죽는
버그(Fragment가 `.name`/`.displayName` 없는 Symbol이라 발생)를 실측 중
재발견 — HOTFIX-134의 기존 우회(`ChromeTierZone` 컴포넌트를 JSX 태그가 아닌
일반 함수로 직접 호출)를 그대로 따르되 감싸던 Fragment 자체도 제거해 해결.
`tsc`/`lint`/`build` 0 errors, Browser pane 실측으로 통합 캔버스 전체(로고/
계정메뉴/1·2단 탭/슬라이드쇼/좌측 사이드바 아이콘) 순서·클릭 선택·좌측
설정 패널 반영을 확인, 저장 버튼 클릭 후 실제 홈페이지 새로고침까지 왕복
검증. **다음에 확인 필요**: 실제 마우스로 탭 칩을 드래그해 1단/2단 사이·같은
단 안 순서를 바꾸는 손맛(브라우저 자동화가 신뢰되지 않은 drop 이벤트의
`dataTransfer.getData()`를 빈 값으로 반환하는 한계로 자동 검증 불가, 로직은
HOTFIX-134에서 검증된 것과 동일), 로고 블록에 새로 추가한 커스텀 폰트 관리
UI(추가/토글/삭제) 실사용. 상세는 CHANGELOG.md 동명 항목 참고. 브랜치
`feature/EPIC-135`.

> **참고**: 이 블록(그리고 바로 아래 "Current EPIC" 섹션)은 EPIC-109
> 시점(2026-08-14)부터 이번 갱신(EPIC-135, 2026-08-20)까지 최상단 마커만
> 갱신되지 않고 있었다 — 그 사이 실제 완료된 EPIC-110~134는 `docs/EPIC.md`/
> `CHANGELOG.md`에 전부 개별 기록되어 있으니 필요하면 그쪽을 참고할 것(이
> 파일 자체가 이미 알고 있던 기존 드리프트, 이번 세션에서 전체 소급 재작성은
> 하지 않음).

직전 EPIC-109
자유 배치 이미지 리사이즈에 비율 유지/직접입력/프리셋 추가 — `ImageBlock`에
`lockAspectRatio` 토글+비율 프리셋 드롭다운+직접입력, `FreePositionHandles`가
컨테이너 실제 픽셀 크기로 환산해 정사각형이 아닌 컨테이너에서도 정확한
픽셀 비율을 유지하도록 확장. `tsc`/`lint`/`build` 0 errors, 클린 세션에서
1:1 잠금 리사이즈 검증. 브랜치 `feature/EPIC-109`.

직전 EPIC-108
자유 배치(콜라주) + 홈페이지 슬라이드쇼 위젯 관리자 연동 — 컨테이너/텍스트/
이미지/버튼/영상/슬라이드쇼/게시판연동 7종에 이미지 위에 이미지처럼 자유롭게
겹쳐 드래그하는 배치 기능(`useFreePosition.ts`+`FreePositionHandles`/
`FreePositionSettingsSection`) 신설, `HeroSlideshowWidgetBlock`에
`syncWithSiteSettings` 토글로 관리자 "홈페이지 설정 관리"와 실시간 연동.
`tsc`/`lint`/`build` 0 errors, 임시 진단 라우트로 겹침·드래그 이동(20%→
37.96%)·리사이즈(30%→47.96%)·실제 관리자 슬라이드 데이터 로딩 전부 실측
확인. 브랜치 `feature/EPIC-108`.

직전 EPIC-107
홈페이지 슬라이드쇼를 Craft 위젯으로 전환 — 기존 `HeroSlideshow.tsx`를 새로
만들지 않고 그대로 감싼 `HeroSlideshowWidgetBlock`으로 Craft 캔버스 어디든
삽입 가능. `tsc`/`lint`/`build` 0 errors, 임시 진단 라우트로 실제 DOM 구조
일치 확인. 브랜치 `feature/EPIC-107`. **EPIC-101~107 로드맵(이미지 버그 →
프리폼 에디터 코어 → Kinfolk 16블록 → 헤더 모션 → Footer 전환 → 카테고리
필터 → 슬라이드쇼 위젯화) 전체 완료.**

직전 EPIC-106
게시판 연동 블록 카테고리 필터 — `GET /api/boards/[board_slug]/posts`에
`category` 파라미터+`availableCategories` 응답 신설(기존 tag/year 필터와
동일 패턴), `useBoardPosts.ts` 4번째 인자로 노출, `BoardEmbedBlock`/
`TimelineEmbedBlock` 설정 패널에 카테고리 드롭다운 추가. `tsc`/`lint`/
`build` 0 errors, 존재하지 않는 카테고리 필터로 0건 확인(실제 적용 검증).
브랜치 `feature/EPIC-106`.

직전 EPIC-105
하단 Footer를 Craft.js 비주얼 에디터로 전환 — 기존 폼 기반 `/admin/footer`를
다른 Craft 페이지와 동일한 자유 레이아웃 에디터로 교체. 신규 Craft 페밀리
(`FooterCompanyInfoBlock`/`FooterLinksRowBlock`), `GlobalFooter.tsx`(신규
Server Component)가 `Footer.tsx`(삭제)를 대체. 기존 `footer_config` 실데이터
마이그레이션, `page_builder(slug='footer')` 행 신규 생성. `tsc`/`lint`/
`build` 0 errors, 클린 서버 재시작 후 실렌더링 확인. 브랜치 `feature/EPIC-105`.

직전 EPIC-104
헤더 스크롤 모션 — Kinfolk.com처럼 스크롤 내리면 헤더가 숨고 올리면 다시
나타남. `useHideOnScroll.ts`(신규) + `Navbar.tsx` fixed+transform 전환,
LeftSidebar/RightSidebar는 transform 조상 밖 형제로 분리(containing block
보호). 개발 중 ResizeObserver 되먹임 루프(메뉴가 영원히 로딩 상태로 멈추는
버그)를 실제로 겪고 원인 특정+수정. `tsc`/`lint`/`build` 0 errors, 로컬에서
scrollY 시퀀스/사이드바 z-index stacking 확인. 브랜치 `feature/EPIC-104`.

직전 EPIC-103
Kinfolk 16블록 홈 레이아웃 — EPIC-102 원자 블록을 조합해 Kinfolk.com 홈페이지
1~16번 블록 구조를 재현. `SlideshowBlock.sticky`(1번, 커튼 효과)/
`BoardEmbedBlock.dragRow`·`spotlight`(3/6/9/4번)/`ImageBlock` 오버레이
캡션(5/8/10/13번)/신규 `ShopItemsGridBlock`(12번, 가격 있는 사일로 상점
데이터). `src/components/craft/home/defaultTree.tsx` 재구성. `tsc`/`lint`/
`build` 0 errors, 로컬 진단 라우트로 16블록 전체 실데이터 렌더링 확인. 홈
페이지에 이미 저장된 `craft_state`가 있어 라이브 반영은 사용자 결정 대기.
브랜치 `feature/EPIC-103`.

직전 EPIC-102
Craft.js 프리폼 에디터 코어 — Kinfolk 홈페이지 16블록 재현 요청을 계기로,
"정해진 섹션 블록만 추가" 방식이던 Craft 에디터를 "컨테이너 안에 원자 블록을
자유롭게 드래그앤드롭 + 개별 설정 패널 + 공통 모션"으로 전환하는 기반 작업.
원자 블록 8종(Container/Text/Image/Button/Video/Slideshow/BoardEmbed/
TimelineEmbed, `src/components/craft/primitives/`), `craft.related` 설정
패널 패턴 최초 도입(`SettingsSidebar.tsx`), 공통 모션(fade/slide-up/
slide-left, `useScrollReveal.ts`+`MotionSettingsSection.tsx`), Craft.js 공식
`connectors.create()` 기반 진짜 드래그 툴박스(`Toolbox.tsx`), 홈페이지 전용
독자 구현이던 CraftHomeEditor/Renderer를 공용 셸로 마이그레이션. `tsc`/
`lint`/`build` 0 errors, 로컬 dev 공개 홈페이지 무회귀 확인. 관리자 로그인
세션 없어 Toolbox 드래그/설정 패널/모션 저장 왕복은 다음 세션 확인 필요.
직전 EPIC-101(홈페이지 Craft.js 이미지 크기 버그 수정, `@container` 누락)도
같은 세션에 완료. 브랜치 `feature/EPIC-102`. Kinfolk 16블록 조합(EPIC-103)/
헤더 스크롤 모션(EPIC-104)/하단메뉴 Craft 전환(EPIC-105)/게시판 연동
다듬기(EPIC-106)/슬라이드쇼 위젯화(EPIC-107)는 이 기반 위에서 다음 세션에
순차 진행 예정.
직전 EPIC-089([Stage 2] Floating Action UX, YouTube-style Nested Comments, &
Admin/Sidebar Control)/EPIC-087(Admin Dashboard Overhaul 등)/EPIC-088(Admin
Detail Corrections 등)은 브랜치 `feature/EPIC-089`(등)에 완료돼 있으나
main/develop 병합은 아직 별도 승인 대기 중.

**NEXT EPIC**

미정 — 다음 지시 대기. `PROJECT_ARCHITECTURE.md` §Stage 2 기술 전략에 기록된 항목
(Event Telemetry, Paywall Routing 게이팅)이 실제 구현 후보 — Frictionless Archiving
브릿지는 EPIC-085로 구현 완료.

---
