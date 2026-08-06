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
> 2026-08-06 (EPIC-081): Stage 2 공식 진입 선언. Stage 1 완료 조건 대부분 충족(EPIC-080이
> Navigation 이중 구조 통합의 코드/문서 부분을 완료, DB 반영만 사용자 조치 대기 —
> `NEXT_TASK.md` 참고) — 남은 세부 항목(SEO metadata, 반응형 레이아웃, 접근성 전체 감사)은
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
- ~~Navigation 이중 구조 통합~~ **(EPIC-080, 2026-08-06)** — `navConfig.ts`의
  `FALLBACK_NAV_TABS`를 라이브 `site_navigations`와 동기화, dual-nav 혼선으로 남은
  그림자 정적 페이지 17개 삭제+리다이렉트. 코드/문서는 완료, 라이브 DB 반영은
  `docs/sql/EPIC-080-nav-unification.sql` 실행 대기(사용자 조치 필요, `NEXT_TASK.md` 참고).

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

EPIC-081
Community-Led Growth Vision & Architecture Alignment — CEO의 Community-Led Growth Flow와
CTO의 기술 전략(Universal Editor/R2, Frictionless Archiving, Event Telemetry, Paywall
Routing)을 PROJECT_VISION.md/PROJECT_ARCHITECTURE.md에 명문화(문서 전용, 코드 변경 없음).

**NEXT EPIC**

미정 — 다음 지시 대기. `PROJECT_ARCHITECTURE.md` §Stage 2 기술 전략에 기록된 항목
(Universal Content Editor 확장, R2 Direct Upload, Frictionless Archiving 브릿지, Event
Telemetry, Paywall Routing 게이팅)이 실제 구현 후보.

---
