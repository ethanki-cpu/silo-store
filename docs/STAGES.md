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

EPIC-102
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
