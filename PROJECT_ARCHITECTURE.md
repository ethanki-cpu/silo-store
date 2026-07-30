# PROJECT ARCHITECTURE

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> 기존 `PROJECT_BLUEPRINT.md`의 §1(프로젝트 개요 중 아키텍처 부분)/§2(기술 스택)/§3(프로젝트 구조)/
> §4(주요 기능)/§5(API 구조)/§6(인증 구조)/§7(공통 컴포넌트)/§9.5(SEO/Sitemap/robots.txt) 절을
> 그대로 옮긴 것입니다. 정보를 삭제하거나 요약하지 않았습니다 — 문장 단위로 원문 그대로입니다.
> 프로젝트의 "왜"는 [`PROJECT_VISION.md`](PROJECT_VISION.md), 영구 개발 규칙은
> [`PROJECT_RULES.md`](PROJECT_RULES.md) 참고. Board System/Page Builder/Widget/Membership/
> Navigation의 더 깊은 상세는 각각 [`BOARD_SYSTEM.md`](BOARD_SYSTEM.md)/[`PAGE_BUILDER.md`](PAGE_BUILDER.md)/
> [`WIDGET_SYSTEM.md`](WIDGET_SYSTEM.md)/[`MEMBERSHIP_SYSTEM.md`](MEMBERSHIP_SYSTEM.md)/
> [`NAVIGATION_SYSTEM.md`](NAVIGATION_SYSTEM.md) 참고.

## 1. 아키텍처 개요 (구 PROJECT_BLUEPRINT.md §1, 프로젝트 목적 문장 제외)

- **사용 기술 스택**: Next.js(App Router) + React + TypeScript + Tailwind CSS, 백엔드는 별도 서버 없이 Next.js Route Handler + Supabase(Postgres + Auth)로 구성.
- **전체 아키텍처**: 단일 Next.js 앱. 브라우저(Client Component)와 Route Handler 양쪽 모두 동일한 `@supabase/supabase-js` 클라이언트(anon key)로 Supabase에 직접 접근한다. 별도의 Express/Node 백엔드나 서비스 롤 키는 존재하지 않는다. 인증된 요청은 클라이언트가 `Authorization: Bearer <access_token>`을 Route Handler에 직접 전달하는 방식으로 신원을 넘긴다.
- **상단 네비게이션(EPIC-018 이후)**: 사일로상점/살롱데상/공간 문의/마이페이지 4개 탭, 화면 중앙 정렬. 상세는 [docs/navigation-blueprint.md](docs/navigation-blueprint.md) 및 [`NAVIGATION_SYSTEM.md`](NAVIGATION_SYSTEM.md) 참고.

```
[Browser: React Client Components] --Authorization: Bearer--> [Next.js Route Handlers] --anon key--> [Supabase Postgres/Auth]
[Server Components (읽기 전용 목록)] ------------------------------------------------> [Supabase Postgres]
```

## 2. 기술 스택 (구 PROJECT_BLUEPRINT.md §2)

`package.json` 기준 실제 의존성:

- **Next.js** `16.2.11` (App Router, Turbopack dev)
- **React** `19.2.4` / **react-dom** `19.2.4`
- **TypeScript** `^5`
- **Supabase**: `@supabase/supabase-js` `^2.110.8`
- **Tailwind CSS** `^4` (`@tailwindcss/postcss`)
- **Tiptap**(ProseMirror) `^3` — `@tiptap/react`/`@tiptap/starter-kit`/`@tiptap/extension-link`/`@tiptap/extension-placeholder`/`@tiptap/pm` (EPIC-052). `isomorphic-dompurify`(EPIC-052, 게시글 HTML 저장/렌더링 정제). EPIC-053에서 `@tiptap/extension-underline`/`@tiptap/extension-text-align`/`@tiptap/extension-text-style`/`@tiptap/extension-highlight`/`@tiptap/extension-color`/`@tiptap/extension-image`/`@tiptap/extension-task-list`/`@tiptap/extension-task-item` 추가 설치. EPIC-053.1에서 서버 사이드 JSON→HTML 렌더링용 `@tiptap/html` 추가(`@tiptap/extension-image`는 커스텀 `FigureImage` 노드로 대체되어 더 이상 쓰이지 않음 — `src/lib/blockEditorCore.ts` 참고).
- **@dnd-kit** `core`/`sortable`/`utilities` (EPIC-035, 관리자 카테고리 드래그앤드롭)
- **ESLint** `^9` + `eslint-config-next`
- 그 외 별도 상태관리 라이브러리(Redux/Zustand 등), UI 컴포넌트 라이브러리, 테스트 러너는 사용하지 않음 (`package.json`에 존재하지 않음).

> **개발 환경 설정(`.env.local`)**: 신규 개발자용 5분 설정 가이드는 [README.md](README.md#개발-환경-설정-envlocal) 참고. 핵심 규칙만 요약하면: `NEXT_PUBLIC_SUPABASE_URL`은 Project URL만(뒤에 `/rest/v1/` 등 경로를 절대 붙이지 않음), `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 `anon`/`public` 키만 사용하고 `service_role` 키는 이 프로젝트 어디에서도 사용하지 않는다(EPIC-020에서 URL 오염으로 인한 로그인/데이터 조회 장애가 실제로 발생한 바 있음).

> **주의(2026-07-30 EPIC-070 이후 드리프트)**: 위 `isomorphic-dompurify` 항목은 원본
> `PROJECT_BLUEPRINT.md`의 서술을 그대로 옮긴 것이지만, EPIC-070에서 이 패키지는 Vercel
> 서버리스에서의 jsdom 크래시 문제로 제거되고 `sanitize-html`로 교체되었다(CHANGELOG.md EPIC-070
> 참고) — 이 문서 재구성 작업은 "정보 이동만" 지시받아 원문을 고치지 않았으나, 실제 코드 기준
> 최신 상태는 아니므로 다음에 이 문서를 갱신할 때 반영할 것.

## 3. 프로젝트 구조 (구 PROJECT_BLUEPRINT.md §3)

```
silo-store/
├── docs/
│   └── database-schema.sql     # DB 스키마 문서 (마지막 동기화: 2026-07-23, 아래 참고)
├── public/                     # 정적 에셋 (기본 Next.js 아이콘류)
├── src/
│   ├── app/                    # App Router 라우트 전체 (페이지 + API)
│   │   ├── api/                 # Route Handlers ("백엔드" 역할, 5번 참고)
│   │   ├── (각 기능별 폴더)/page.tsx  # 화면
│   │   └── layout.tsx           # 루트 레이아웃 (AuthProvider + Navbar 마운트)
│   ├── components/              # 공통 UI 컴포넌트 (7번 참고)
│   └── lib/                     # 인증/설정/Supabase 클라이언트 등 공용 로직 (6번 참고)
├── CLAUDE.md / AGENTS.md        # AI 에이전트용 프로젝트 규칙 문서
├── NEXT_TASK.md / CHANGELOG.md  # 작업 추적 문서 (9번 참고 — 이제 PROJECT_RULES.md §개발 워크플로우)
└── package.json
```

> **DB 문서 동기화 기준**: `docs/database-schema.sql`은 **2026-07-23**에 Supabase Management API로
> `information_schema.columns` / `pg_constraint`를 직접 조회하여 실제 운영 DB 기준으로 재작성됨
> (테이블 31개 전수 확인). 그 이후 스키마가 바뀌었는데 이 파일이 갱신되지 않았다면 다시 드리프트된 상태이니,
> 스키마 변경 작업을 할 때마다 이 파일도 함께 갱신할 것 (기존 규칙: "구조 변경 시 PROJECT_BLUEPRINT.md도 갱신" —
> 2026-07-30 재구성 이후로는 "구조 변경 시 이 문서(PROJECT_ARCHITECTURE.md)도 갱신"으로 읽는다).
>
> **Database schema documentation is maintained only in `docs/database-schema.sql`.**
> 프로젝트 밖에 있던 `silostore_schema.sql`은 2026-07-23부로 더 이상 관리하지 않는
> 참고용 사본이며, 이 프로젝트의 공식 DB 스키마 문서(Single Source of Truth)가 아님.

## 4. 주요 기능 (구 PROJECT_BLUEPRINT.md §4)

`src/app` 아래 실제 존재하는 페이지/라우트를 기준으로 구현 여부를 확인함.

> 게시판(Board) 관련 기능의 더 깊은 상세(Board Type/렌더링/lifecycle/권한/관계)는
> [`BOARD_SYSTEM.md`](BOARD_SYSTEM.md)와 [docs/content-blueprint.md](docs/content-blueprint.md) 참고
> — 아래 표는 원본 Blueprint의 전체 기능 인벤토리를 그대로 보존한 것이라 게시판 행에도 원문 그대로
> Board Definition System 설명이 남아있다(의도적 중복, 문서 하단 "중복 안내" 참고).

### 구현되어 화면까지 동작하는 기능

| 기능 | 경로 | 비고 |
|---|---|---|
| 로그인 | `/login` | 이메일/비밀번호 + Google/Kakao OAuth |
| 회원가입 | `/signup` | 이메일/비밀번호 가입 후 `members.name` 갱신 |
| 사일로상점(물품 목록/상세) | `/shop`, `/shop/[id]` | 시대(Time Slip) 필터, 등급별 큐레이션 4단계 공개, 이전 주인 캐릭터(persona) 표시 |
| 물품 구매/대여 주문 | `/shop/[id]` → `POST /api/orders` | 등급별 할인/적립 서버 계산 |
| 찜(Wishlist) (EPIC-017) | `/shop`, `/shop/[id]` 카드·상세의 하트 버튼, `/mypage` "찜 목록" | `wishlists` 테이블(likes와 동일 패턴), 로그인 필요, 다시 누르면 해제 |
| 클럽모임 목록/상세 | `/clubs`, `/clubs/[id]` | 요일별 클럽, 세션 예약 |
| 게시판(소통 게시판) | `/boards`(hub), `/boards/[id]`, `/boards/[id]/write`, `/boards/[id]/[postId]` | 자유/클럽주제/모임별/패트론/아티스트홍보/After Adoption/자료게시판/Q&A(그룹 8종) + EPIC-048(Silo Store 20개) + EPIC-049(Community 영역, 기존 DB 재분류 포함) + EPIC-050(Membership/Gallery/Archive 17개) + EPIC-051(Studio 5개, 예약/문의는 `ctas`로 기존 `/rental`·`/space-inquiry/*`·`/shop/projects` 연결). 디자인은 EPIC-046부터 "Editorial Magazine" 시스템, EPIC-047부터 **Board Definition System**(`src/lib/boardLayout.ts`의 `BOARD_DEFINITIONS`/`INDIVIDUAL_BOARD_DEFINITIONS` config + `resolveBoardDefinition()` + `BoardRenderer`)으로 전 게시판이 동일 엔진을 공유 — 새 게시판은 DB 시드 행 + config 정의 추가만으로 생성 가능(코드 변경 없음, 기존 DB 행 재사용도 가능). `BoardRenderer`의 `hub` 레이아웃은 중첩 구조를 지원(EPIC-049)하고 5번째 레이아웃 `timeline`(EPIC-050)이 있다. `BoardDefinition.accessLevel`(EPIC-050)로 커스텀 등급 게이팅, `BoardDefinition.ctas`(EPIC-051)로 기존 예약/문의 페이지 연결 버튼을 config만으로 추가할 수 있다. 상세는 `docs/design-system.md` §10, `docs/content-blueprint.md` §1 |
| 개인 페이지(마이피드) | `/me`, `/me/write`, `/u/[memberId]` | 공개범위(public/private/friends) 있는 개인 글 |
| 온라인 도슨트 콘텐츠 | `/docent`, `/docent/[id]`, `/docent/library` | 사일로상점/살롱 카테고리, 인물(figure_name)별 그룹 보기, 구매 라이브러리 |
| 온라인 도슨트 라이브러리 (EPIC-017, 살롱+사일로상점 공유) | `/docent/collections` | `docent_contents.era`(11개 시대/사조 태그, `기존 category`와 별개 축) 기준 하위 게시판. 최신글 1건, 전체 인기글, era별 인기글(구매 수 집계 뷰 `docent_content_popularity` 기준) 표시. 관리 화면 없음 — 기존 콘텐츠는 era=null이라 수동 태깅 필요 |
| 살롱 출입(체크인) | `/salon/checkin` → `POST /api/salon-checkins` | 등급별 무료/유료 |
| 공간 대관(스튜디오) | `/rental`, `/rental/[rentalTypeId]` | 1층/2층, 사진/영상 촬영 유형 |
| 마이페이지 | `/mypage`(허브) + 12개 하위 라우트(EPIC-045, EPIC-052에서 `bucketlist` 추가) | "Personal Hub"(EPIC-052) — 비공개 개인 데이터는 그대로 두고(`member_collections`/`orders`/`wishlists`/`member_follows`/`member_badges`/`member_visitors`/`comments`), Board Definition 게시판과 시각 언어(`StoryCard`)·Timeline Engine(`groupByYearMonth`+`TimelineView`)만 공유. `/mypage/layout.tsx`가 로그인 게이트+등급/포인트 요약+`MyPageNav`를 공유하고, 각 탭이 독립 라우트: `collections/[category]`(9개)/`wishlist`/`follow`/`salon`(reservations+salon_checkins+daily_checkins+poll_votes 종합)/`docent-certificate`(docent_purchases)/`space`(rental_bookings)/`exhibition`(개인 포토 글 재사용)/`badges`/`comments`(원글 이동 링크)/`timeline`(points_ledger+likes+member_follows)/`bucketlist`(신규, `member_bucket_list`)/`visitors`. |
| 설정 | `/settings` | 이름·이메일 등 개인정보 전용 페이지, 본인 세션 기준으로만 조회(다른 회원 정보 접근 불가) |
| 관리자 결제 확인 | `/admin/payments` | `orders`/`reservations`/`rental_bookings`/`docent_purchases` 통합 확인 화면, `is_admin` 전용 |
| 자료 다운로드 | `/downloads` | 목록 공개, 업로드는 관리자 전용 |
| 출석체크 | `/attendance` | 하루 1회 체크인 + 포인트 적립 + 이번 달 캘린더 |
| 설문조사 | `/polls` | 관리자 설문 생성, 회원당 1표, 결과 비율 표시 |
| 공간 스타일링 포트폴리오 (EPIC-016) | `/shop/projects`(목록, industry 필터), `/shop/projects/[id]`(상세: 컨셉·사진 Grid·영상 Player·사용 물품 Card), `/admin/projects/new`(관리자 등록) | 게시판(boards/posts)이 아닌 전용 테이블(`styling_projects`/`styling_project_media`/`styling_project_items`) 기반 공개 콘텐츠, 비회원도 열람 가능. 사용 물품 카드 클릭 시 `/shop/[itemId]`로 이동 |

### DB 스키마(테이블)는 존재하지만 실제 기능(데이터 연동)이 없는 화면

**(EPIC-054A)** 과거 `src/components/ComingSoon.tsx`("준비 중입니다")만 렌더링하던 19개 페이지는 전부 공용 `src/components/PageHeader.tsx`(Title/Subtitle/Breadcrumb/Description/Page Container) 기반 정적 페이지로 교체되어 더 이상 존재하지 않는다. 아래 페이지들은 여전히 **실제 데이터/게시판 연동은 없는 정적 안내 페이지**다(EPIC-054A는 페이지·URL·레이아웃 생성까지만 수행 — 게시판 연결/기능 추가는 범위 밖):

- `/salon/monthly-events` (월별 모임), `/salon/event-notices` (이벤트 공지)
- `/salon/one-sentence-novel`, `/salon/mind-diary`, `/salon/my-treasure-story`, `/salon/secret-room`(비밀의 방 도슨트), `/salon/artist-intro`
- `/salon/gallery/awards|performances|parties|visitors|patrons` (5개)
- `/shop/heritage/grandma`, `/shop/heritage/grandpa`
- `/space-inquiry/item-rental`, `/space-inquiry/styling`
- `/salon/docent-tour`(투어 도슨트 프로그램), `/salon/drinks`(음료 주문), `/space-inquiry/shoot-rental`(nav 미연결 orphan, `/rental`로 대체됨)

> `docs/database-schema.sql`에는 이 기능들에 대응하는 테이블(`salon_events`, `salon_rooms`, `drink_menu`, `docent_tours` 등)이 정의되어 있으나, 실제 화면/Route Handler 구현은 없음(코드 기준 확인됨) — EPIC-054A 이후에도 동일.

> **참고(2026-07-30 이후 드리프트)**: 원본 목록은 EPIC-054D 시점 기준이다 — 이후 EPIC-068이 이
> 정적 페이지 다수를 순수 위젯 페이지(Page Builder)로 전환했다(CHANGELOG.md EPIC-068 참고).
> 이 문서 재구성 작업은 "정보 이동만" 지시받아 원문을 고치지 않았다.

### 실시간 채팅(회원채팅)

- 코드베이스 어디에도 구현되어 있지 않음(보류 상태로 명시적으로 스킵된 기능).

## 5. API 구조 (구 PROJECT_BLUEPRINT.md §5)

`src/app/api` 기준 각 폴더의 역할:

| 경로 | 역할 |
|---|---|
| `api/orders` | 물품 구매/대여 주문 생성 (등급별 가격/포인트 서버 계산) |
| `api/items/[id]/wishlist` | 찜 토글(있으면 삭제, 없으면 추가), 로그인 필요 |
| `api/items/[id]` | 물품 상세 조회, 등급별 큐레이션 필드 잠금/해제 + persona 포함 |
| `api/boards`, `api/boards/[id]/posts`, `api/boards/[id]/posts/[postId]`, `.../comments`, `.../like` | 게시판 목록/글 목록/글 상세/댓글/좋아요 |
| `api/posts` | 개인 페이지(마이피드) 글 작성 |
| `api/members/[memberId]/posts` | 특정 회원의 마이피드 글 조회(본인/타인) |
| `api/docent-contents/[id]` | 도슨트 콘텐츠 상세(등급별 열람 가능 여부 판단 포함 — 상세 로직은 파일 확인 필요) |
| `api/docent-purchases` | 도슨트 콘텐츠 건별 구매(월 무료 횟수/할인 적용) |
| `api/reservations` | 클럽모임 세션 예약 |
| `api/rental-bookings` | 공간 대관 예약 |
| `api/salon-checkins` | 살롱 출입 체크인 |
| `api/attendance` | 출석체크 (조회/등록 + 포인트 적립) |
| `api/downloads` | 자료 목록 조회(공개) / 업로드(관리자 전용) |
| `api/polls`, `api/polls/[id]/votes` | 설문 목록·생성(관리자)/투표 |
| `api/admin/payments`, `api/admin/payments/confirm` | 관리자용 결제 대기 목록 조회/확정 (4개 결제 테이블 통합) |
| `api/test-supabase` | Supabase 연결 확인용(개발/디버그 목적으로 추정 — 용도 TODO, 아래 "미확인 사항" 참고) |
| `api/styling-projects`, `api/styling-projects/[id]` | 공간 스타일링 포트폴리오 목록/상세 조회(공개, 비회원 가능) + 등록/수정/삭제(관리자 전용, 등록 시 사진·영상·연결 물품까지 한 번에 저장) |

## 6. 인증 구조 (구 PROJECT_BLUEPRINT.md §6)

- **Supabase Auth** 기반 이메일/비밀번호 + Google/Kakao OAuth. 세션은 브라우저 `localStorage`에 저장되는 클라이언트 세션이며, 쿠키 기반 SSR 인증이 아니다.
- **`AuthProvider`** (`src/lib/AuthProvider.tsx`): 앱 전역 React Context. `session`(Supabase 세션), `member`(id/name/membership_rank/tier_name/is_admin), `loading`(세션 로딩), `memberLoading`(회원 row 로딩)을 제공. `src/app/layout.tsx`에서 앱 전체를 감싼다.
- **`serverAuth`** (`src/lib/serverAuth.ts`): Route Handler 쪽 공용 인증 헬퍼.
  - `getRequestMember(request)`: `Authorization` 헤더의 액세스 토큰을 검증하고, 호출자 토큰이 주입된 `scopedClient`와 `member` 정보를 반환.
  - `getTier(rank)`: 등급별 혜택/가격 플래그(`membership_tiers`) 조회 — 등급 체계 상세는 [`MEMBERSHIP_SYSTEM.md`](MEMBERSHIP_SYSTEM.md) 참고.
  - `canReadBoard` / `canWriteToBoard`: 게시판 타입별 열람/쓰기 권한 판정 — 상세는 [`BOARD_SYSTEM.md`](BOARD_SYSTEM.md) 참고.
- **Route 보호 방식**: 미들웨어 기반 보호는 없음. 각 페이지가 클라이언트에서 `useAuth()`의 `session`/`member`/`is_admin` 등을 `useEffect`로 확인한 뒤 `router.replace("/login")` 또는 `router.replace("/")`로 리다이렉트하는 방식(페이지별 개별 가드).
- 가격·열람 권한처럼 위조 방지가 필요한 값은 클라이언트가 아니라 Route Handler가 `getRequestMember`/`getTier`로 서버에서 재계산한다(사용자가 API를 직접 호출해도 신뢰할 수 있는 값만 응답) — 이 원칙 자체는 개발 규칙이기도 하다([`PROJECT_RULES.md`](PROJECT_RULES.md) 참고).

## 7. 공통 컴포넌트 (구 PROJECT_BLUEPRINT.md §7)

`src/components` 기준 실제 존재하는 컴포넌트:

- **`Navbar.tsx`**: 상단에 사일로상점/살롱데상/공간 문의/마이페이지 4개 진입점(화면 중앙 정렬) + 계정 영역(로그인 상태 표시, 마이페이지 링크, 로그아웃) 렌더링. `NAV_TABS`(`navConfig.ts`)를 그대로 순회하며 각 탭의 `type`(`sidebar-left`/`sidebar-right`/`dropdown`/`link`)에 따라 상호작용 방식만 분기하고, 라벨/링크/그룹은 하드코딩하지 않는다(EPIC-018). 사일로상점·살롱데상은 탭 클릭 또는 화면 좌/우 가장자리 아이콘(🔑/🚪) 클릭·hover 시 각각 좌/우 사이드바가 열리는 구조(초록 배경/흰 글씨). 공간 문의는 플로팅 드롭다운, 마이페이지는 단순 링크. `getActiveNavTabKey()`로 현재 경로에 맞는 탭을 하이라이트. 상세는 [docs/navigation-blueprint.md](docs/navigation-blueprint.md)와 [`NAVIGATION_SYSTEM.md`](NAVIGATION_SYSTEM.md) 참고.
- **`PageHeader.tsx`** (EPIC-054A, `ComingSoon.tsx` 대체): `title`/`subtitle`/`breadcrumb`/`description`을 받아 정적 안내 페이지(Title/Subtitle/Breadcrumb/Description/Page Container)를 렌더링하는 공용 컴포넌트. 4번 섹션의 실 데이터 미연동 정적 페이지 19개에서 사용.
- **`BlockEditor`** (`src/components/editor/BlockEditor.tsx`): EPIC-053에서 `RichTextEditor.tsx`를 대체한 Tiptap 기반 Block Editor. EPIC-053.1부터 정본은 Tiptap ProseMirror JSON(`onChange(json, html)`) — HTML은 서버가 항상 JSON으로부터 재계산하는 파생 캐시일 뿐이다. `src/lib/blockEditorCore.ts`에 서버/클라이언트 공용 스키마(FigureImage/Gallery/Embed/LinkCard 커스텀 Node)를 두고, BlockEditor.tsx는 여기에 React NodeView(캡션/ALT/삭제/순서변경/대표이미지 지정/Lightbox)만 얹는다. Toolbar: 굵게/기울임/밑줄/취소선/H1-H3/목록/체크리스트/인용/구분선/정렬/링크/이미지(여러장)/갤러리/임베드(Youtube·Vimeo·Instagram·Spotify·Google Maps)/링크카드/미리보기. `RichTextEditor.tsx`(EPIC-052, EPIC-053부터 미사용)는 EPIC-053.1에서 삭제.
- **`PostForm`** (`src/components/boards/PostForm.tsx`): 글쓰기(`/boards/[id]/write`)와 수정(`/boards/[id]/[postId]/edit`, EPIC-053.1 신설) 화면이 공유하는 폼 — BlockEditor/대표 이미지 선택/태그/도슨트 체크박스/구매확정 선택/자동저장을 한 곳에서만 구현.
- **Storage Garbage Collection** (`src/lib/imageGc.ts` + `image_cleanup_queue` 테이블): 게시글 수정/삭제로 더 이상 참조되지 않는 이미지를 즉시 삭제하지 않고 큐에 적재만 한다. 실제 삭제는 관리자 전용 `POST /api/admin/storage-cleanup`(service-role 키를 쓰지 않는 이 앱 특성상 admin 세션으로만 Storage 삭제 가능)이 처리 — 자동 스케줄러는 아직 없음(NEXT_TASK.md 참고).

그 외 공용 UI 라이브러리(버튼/모달/폼 등 디자인 시스템)는 없음 — 각 페이지가 Tailwind 클래스를 인라인으로 직접 사용.

## 8. SEO / Sitemap / robots.txt (구 PROJECT_BLUEPRINT.md §9.5, EPIC-054D)

**감사 배경**: EPIC-054D 전수 조사 결과, 70개 페이지 중 root `layout.tsx` 외에 metadata를 정의하는 곳이 하나도 없었고(전수 grep 확인), sitemap/robots 파일 자체가 존재하지 않았다.

- **`src/app/layout.tsx`**: root `metadata` — title(`"사일로 스토어"`, 하위 페이지는 `%s | 사일로 스토어` 템플릿 사용 가능)/description/openGraph/twitter(summary)/`metadataBase`(`NEXT_PUBLIC_SITE_URL` env, 미설정 시 `http://localhost:3000`). **개별 page.tsx의 `metadata`/`generateMetadata` override는 아직 하나도 없다** — 70개 페이지 전부 이 root 값을 그대로 상속한다(다음 확장 지점: 페이지별 콘텐츠에 맞는 title/description을 붙이는 작업, NEXT_TASK.md 기록).
- **`src/app/sitemap.ts`**: `src/app` 디렉토리를 Node `fs`로 직접 스캔해 정적 라우트를 자동 수집(관리자/API/마이페이지/인증 라우트 제외) + `navConfig.ts`의 하드코딩 이름 배열(heritage 할머니/할아버지, community 클럽 이름)로 동적 이름 라우트 생성 + Supabase에서 `boards`/`items`/`docent_contents`/`clubs` id를 조회해 동적 콘텐츠 라우트 추가(테이블 하나가 실패해도 나머지는 그대로 포함되도록 개별 try/catch). **새 `page.tsx`를 추가하면 이 파일을 고치지 않아도 자동으로 sitemap에 포함된다** — 파일시스템 스캔 방식이라 유지보수가 필요 없음.
- **`src/app/robots.ts`**: `sitemap.ts`와 동일한 제외 기준(admin/api/mypage/me/settings/login/signup)으로 `Disallow`, `Sitemap:` 지시어로 위 sitemap을 가리킴.
- **Canonical URL**: `metadataBase`만 있고 페이지별 명시적 `alternates.canonical`은 없음(70개 페이지 전체에 metadata를 붙이는 더 큰 작업이 선행돼야 함, P2).

## 미확인 사항 (구 PROJECT_BLUEPRINT.md "TODO / 확인 필요" 중 아키텍처 관련 항목)

추측하지 않고 남겨둔 항목. 코드/DB 조회만으로는 확정할 수 없거나, 이 문서에 상세를 옮기지 않기로 한 내용.

- **RLS 정책**: 31개 테이블 전부 RLS가 걸려 있다는 사실은 확인했으나, 테이블별 정확한 정책 조건(select/insert/update 각각 누구에게 허용되는지)은 이 문서에 옮기지 않음 — Supabase `pg_policies` 직접 조회 확인 필요.
- **`api/test-supabase` API 용도**: 코드상 존재는 확인했으나, 실제 용도(연결 테스트/디버그 전용/제거 대상 여부)는 확인 필요.

---

## 문서 재구성 메모(2026-07-30, EPIC-073) — 다른 문서와 겹치는 내용

이 문서(§4 게시판 행, §6 인증 구조 일부, §7 Navbar/BlockEditor)는 [`BOARD_SYSTEM.md`](BOARD_SYSTEM.md)/
[`MEMBERSHIP_SYSTEM.md`](MEMBERSHIP_SYSTEM.md)/[`NAVIGATION_SYSTEM.md`](NAVIGATION_SYSTEM.md)와
내용이 일부 겹친다 — `PROJECT_BLUEPRINT.md` 원문 자체가 이 정보를 여러 절에 걸쳐 반복 언급하고
있었기 때문에, "정보를 잃지 않는다"는 이번 재구성 원칙상 겹치는 원문을 양쪽 모두에 보존했다.
실제 중복 정리(어느 한쪽으로 통합)는 이번 작업 범위(재구성만, 단순화 금지) 밖이라 그대로 두었다 —
자세한 목록은 이번 재구성의 최종 보고("중복 발견 사항") 참고.
