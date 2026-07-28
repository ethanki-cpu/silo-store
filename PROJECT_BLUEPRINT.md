# PROJECT BLUEPRINT

> 이 문서는 사람과 AI(ChatGPT, Claude)가 함께 참고하는 프로젝트 개요/아키텍처 문서입니다.
> 구현 상세가 아니라 "이 프로젝트가 무엇으로 이루어져 있는가"를 설명합니다.
> 실제 코드와 폴더 구조를 기준으로 작성했으며, 코드만으로 단정할 수 없는 내용은 마지막 "TODO / 확인 필요" 섹션에 모아뒀습니다.

## 1. 프로젝트 개요

- **프로젝트 목적**: "사일로 스토어" — 멤버십 기반 커뮤니티 플랫폼. 물품 소매/대여(사일로상점), 클럽 모임·게시판·살롱 공간(살롱데상), 공간 대관(스튜디오 대관) 세 축으로 구성되며, 멤버십 등급(`membership_tiers`)에 따라 콘텐츠 열람 범위와 가격이 달라진다.
- **사용 기술 스택**: Next.js(App Router) + React + TypeScript + Tailwind CSS, 백엔드는 별도 서버 없이 Next.js Route Handler + Supabase(Postgres + Auth)로 구성.
- **전체 아키텍처**: 단일 Next.js 앱. 브라우저(Client Component)와 Route Handler 양쪽 모두 동일한 `@supabase/supabase-js` 클라이언트(anon key)로 Supabase에 직접 접근한다. 별도의 Express/Node 백엔드나 서비스 롤 키는 존재하지 않는다. 인증된 요청은 클라이언트가 `Authorization: Bearer <access_token>`을 Route Handler에 직접 전달하는 방식으로 신원을 넘긴다.
- **상단 네비게이션(EPIC-018 이후)**: 사일로상점/살롱데상/공간 문의/마이페이지 4개 탭, 화면 중앙 정렬. 상세는 [docs/navigation-blueprint.md](docs/navigation-blueprint.md) 참고.

```
[Browser: React Client Components] --Authorization: Bearer--> [Next.js Route Handlers] --anon key--> [Supabase Postgres/Auth]
[Server Components (읽기 전용 목록)] ------------------------------------------------> [Supabase Postgres]
```

## 2. 기술 스택

`package.json` 기준 실제 의존성:

- **Next.js** `16.2.11` (App Router, Turbopack dev)
- **React** `19.2.4` / **react-dom** `19.2.4`
- **TypeScript** `^5`
- **Supabase**: `@supabase/supabase-js` `^2.110.8`
- **Tailwind CSS** `^4` (`@tailwindcss/postcss`)
- **Tiptap**(ProseMirror) `^3` — `@tiptap/react`/`@tiptap/starter-kit`/`@tiptap/extension-link`/`@tiptap/extension-placeholder`/`@tiptap/pm` (EPIC-052, Block Editor). `isomorphic-dompurify`(EPIC-052, 게시글 HTML 저장/렌더링 정제)
- **@dnd-kit** `core`/`sortable`/`utilities` (EPIC-035, 관리자 카테고리 드래그앤드롭)
- **ESLint** `^9` + `eslint-config-next`
- 그 외 별도 상태관리 라이브러리(Redux/Zustand 등), UI 컴포넌트 라이브러리, 테스트 러너는 사용하지 않음 (`package.json`에 존재하지 않음).

> **개발 환경 설정(`.env.local`)**: 신규 개발자용 5분 설정 가이드는 [README.md](README.md#개발-환경-설정-envlocal) 참고. 핵심 규칙만 요약하면: `NEXT_PUBLIC_SUPABASE_URL`은 Project URL만(뒤에 `/rest/v1/` 등 경로를 절대 붙이지 않음), `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 `anon`/`public` 키만 사용하고 `service_role` 키는 이 프로젝트 어디에서도 사용하지 않는다(EPIC-020에서 URL 오염으로 인한 로그인/데이터 조회 장애가 실제로 발생한 바 있음).

## 3. 프로젝트 구조

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
├── NEXT_TASK.md / CHANGELOG.md  # 작업 추적 문서 (9번 참고)
└── package.json
```

> **DB 문서 동기화 기준**: `docs/database-schema.sql`은 **2026-07-23**에 Supabase Management API로
> `information_schema.columns` / `pg_constraint`를 직접 조회하여 실제 운영 DB 기준으로 재작성됨
> (테이블 31개 전수 확인). 그 이후 스키마가 바뀌었는데 이 파일이 갱신되지 않았다면 다시 드리프트된 상태이니,
> 스키마 변경 작업을 할 때마다 이 파일도 함께 갱신할 것 (기존 규칙: "구조 변경 시 PROJECT_BLUEPRINT.md도 갱신").
>
> **Database schema documentation is maintained only in `docs/database-schema.sql`.**
> 프로젝트 밖에 있던 `silostore_schema.sql`은 2026-07-23부로 더 이상 관리하지 않는
> 참고용 사본이며, 이 프로젝트의 공식 DB 스키마 문서(Single Source of Truth)가 아님.

## 4. 주요 기능

`src/app` 아래 실제 존재하는 페이지/라우트를 기준으로 구현 여부를 확인함.

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

### 실시간 채팅(회원채팅)

- 코드베이스 어디에도 구현되어 있지 않음(보류 상태로 명시적으로 스킵된 기능).

## 5. API 구조

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
| `api/test-supabase` | Supabase 연결 확인용(개발/디버그 목적으로 추정 — 용도 TODO) |
| `api/styling-projects`, `api/styling-projects/[id]` | 공간 스타일링 포트폴리오 목록/상세 조회(공개, 비회원 가능) + 등록/수정/삭제(관리자 전용, 등록 시 사진·영상·연결 물품까지 한 번에 저장) |

## 6. 인증 구조

- **Supabase Auth** 기반 이메일/비밀번호 + Google/Kakao OAuth. 세션은 브라우저 `localStorage`에 저장되는 클라이언트 세션이며, 쿠키 기반 SSR 인증이 아니다.
- **`AuthProvider`** (`src/lib/AuthProvider.tsx`): 앱 전역 React Context. `session`(Supabase 세션), `member`(id/name/membership_rank/tier_name/is_admin), `loading`(세션 로딩), `memberLoading`(회원 row 로딩)을 제공. `src/app/layout.tsx`에서 앱 전체를 감싼다.
- **`serverAuth`** (`src/lib/serverAuth.ts`): Route Handler 쪽 공용 인증 헬퍼.
  - `getRequestMember(request)`: `Authorization` 헤더의 액세스 토큰을 검증하고, 호출자 토큰이 주입된 `scopedClient`와 `member` 정보를 반환.
  - `getTier(rank)`: 등급별 혜택/가격 플래그(`membership_tiers`) 조회.
  - `canReadBoard` / `canWriteToBoard`: 게시판 타입별 열람/쓰기 권한 판정.
- **Route 보호 방식**: 미들웨어 기반 보호는 없음. 각 페이지가 클라이언트에서 `useAuth()`의 `session`/`member`/`is_admin` 등을 `useEffect`로 확인한 뒤 `router.replace("/login")` 또는 `router.replace("/")`로 리다이렉트하는 방식(페이지별 개별 가드).
- 가격·열람 권한처럼 위조 방지가 필요한 값은 클라이언트가 아니라 Route Handler가 `getRequestMember`/`getTier`로 서버에서 재계산한다(사용자가 API를 직접 호출해도 신뢰할 수 있는 값만 응답).

## 7. 공통 컴포넌트

`src/components` 기준 실제 존재하는 컴포넌트:

- **`Navbar.tsx`**: 상단에 사일로상점/살롱데상/공간 문의/마이페이지 4개 진입점(화면 중앙 정렬) + 계정 영역(로그인 상태 표시, 마이페이지 링크, 로그아웃) 렌더링. `NAV_TABS`(`navConfig.ts`)를 그대로 순회하며 각 탭의 `type`(`sidebar-left`/`sidebar-right`/`dropdown`/`link`)에 따라 상호작용 방식만 분기하고, 라벨/링크/그룹은 하드코딩하지 않는다(EPIC-018). 사일로상점·살롱데상은 탭 클릭 또는 화면 좌/우 가장자리 아이콘(🔑/🚪) 클릭·hover 시 각각 좌/우 사이드바가 열리는 구조(초록 배경/흰 글씨). 공간 문의는 플로팅 드롭다운, 마이페이지는 단순 링크. `getActiveNavTabKey()`로 현재 경로에 맞는 탭을 하이라이트. 상세는 [docs/navigation-blueprint.md](docs/navigation-blueprint.md) 참고.
- **`PageHeader.tsx`** (EPIC-054A, `ComingSoon.tsx` 대체): `title`/`subtitle`/`breadcrumb`/`description`을 받아 정적 안내 페이지(Title/Subtitle/Breadcrumb/Description/Page Container)를 렌더링하는 공용 컴포넌트. 4번 섹션의 실 데이터 미연동 정적 페이지 19개에서 사용.

그 외 공용 UI 라이브러리(버튼/모달/폼 등 디자인 시스템)는 없음 — 각 페이지가 Tailwind 클래스를 인라인으로 직접 사용.

## 7.5 Page Module 시스템 (EPIC-054B/054C)

**목적**: "Page(화면)"와 "Board(게시판)"를 개념적으로 분리한다. `Board`는 여전히 `src/lib/boardLayout.ts`의 `BoardDefinition`/`BOARD_DEFINITIONS`가 담당하고, `Page`는 그 위에서 여러 "Page Module"을 순서대로 조합한 것으로 재정의한다. EPIC-054B가 타입 시스템 + 렌더러 스캐폴드만 만들었고(어떤 실제 페이지도 연결 안 됨), **EPIC-054C에서 Board 계열 모듈을 실제 Board와 연결**해 `/boards/[id]`(개별 게시판)와 `/boards`(디렉토리, 여러 Board를 한 Page에 배치)가 이 시스템으로 동작한다.

- **`src/lib/pageModules.ts`**: `PageModuleKind`(16종: `hero`/`story_board`/`gallery_board`/`list_board`/`slide_board`/`timeline`/`comment`/`search`/`pagination`/`notice`/`cta`/`form`/`calendar`/`survey`/`ranking`/`profile_card`) + 모듈별 props 타입 + 판별 유니온 `PageModuleConfig`(`{id, kind, props}`) + `PageDefinition`(`{key, title, modules: PageModuleConfig[]}`). `modules`가 평면 배열이므로 모듈 추가/삭제/순서 변경은 표준 배열 연산(push/filter/재정렬)만으로 표현된다 — 별도 트리 구조 불필요. **(EPIC-054C)** `story_board`/`gallery_board`/`list_board`/`slide_board` 4종의 props는 `BoardModuleProps = { boardId: string; includeChildBoards?: boolean }` 하나로 통일 — `BoardModule`이 boardId만으로 나머지를 전부 자체 조회하기 때문에, Page를 조립하는 쪽은 "이 자리에 어떤 게시판을 놓을지"만 결정하면 된다.
- **`src/components/modules/BoardModule.tsx` (EPIC-054C 신규)**: 게시판 하나(`boardId`)를 Page 어디에든 꽂을 수 있는 자기완결형 모듈 — 정의 조회, `posts` 조회, Search/Sort/Pagination 상태 관리(디바운스 포함)를 전부 스스로 처리한다. 기존 `src/app/boards/[id]/page.tsx`에만 있던 로직을 그대로 옮긴 것(동작 변경 없음). `definition.boardType`이 무엇이든(story/gallery/community/hub/timeline) `BoardRenderer`가 알아서 맞는 레이아웃을 그리므로, story/gallery/list/slide board 4종 모두 이 컴포넌트 하나로 커버된다. **핵심 설계**: boardId만 있으면 어디서든 재사용 가능해, 여러 개를 한 Page에 나란히 배치해도 상태가 섞이지 않고("Page 하나 = Board 하나" 구조를 강제하지 않음), 추후 Block Editor의 "게시판 임베드" 블록이 boardId 하나만 넘기면 그대로 연동될 수 있다.
- **`src/components/modules/PageModuleRenderer.tsx`**: `modules: PageModuleConfig[]`를 받아 배열 순서대로 렌더링하는 조합기. `kind`별로 기존 컴포넌트에 props를 그대로 전달한다:
  - `hero` → 기존 `HeroSlideshow` 그대로 재사용
  - `story_board`/`gallery_board`/`list_board`/`slide_board` → **(EPIC-054C)** `BoardModule`에 `boardId`만 전달 — 실제 Board와 연결됨
  - `timeline` → 기존 `TimelineView`/`groupByYearMonth`(Timeline Engine, EPIC-050/052) 그대로 재사용
  - `comment` → 기존 `CommentSection` 그대로 재사용
  - `pagination` → 기존 `Pagination` 그대로 재사용
  - `search`/`cta` → `BoardHeader.tsx`에 인라인으로 있던 검색 입력창/CTA 버튼 마크업을 `src/components/modules/SearchInput.tsx`/`CtaButtons.tsx`로 추출해 `BoardHeader`와 Page Module이 동일 컴포넌트를 공유하도록 리팩터(중복 컴포넌트 생성 금지 원칙 반영, 렌더링 결과는 기존과 동일)
  - `notice`/`form`/`calendar`/`survey`/`ranking`/`profile_card` → 재사용할 기존 컴포넌트가 없어 최소 프레젠테이션 셸로 신규 작성(데이터 조회·저장 로직 없음)
  - **(EPIC-054C)** `modules` 배열이 비어 있으면(Board/모듈이 없는 Page) `src/components/modules/EmptyState.tsx`를 렌더링 — Placeholder Module이 아니라 "콘텐츠가 0건"이라는 상태를 그대로 보여준다. `BoardRenderer`의 "게시글 0건" 분기도 동일한 `EmptyState`를 공유(중복 없음).
- **(EPIC-054C) 실제 연결 지점**:
  - `src/app/boards/[id]/page.tsx` — `<BoardModule boardId={id} />` 하나만 렌더링(개별 게시판 페이지, Board 1개).
  - `src/app/boards/page.tsx` — parent가 없는 최상위 hub(Silo Store/Online Docent/Heritage/Community/Membership/Gallery/Archive/Studio)마다 `slide_board` 모듈을 하나씩 만들어 `PageModuleRenderer`로 **한 Page에 여러 Board를 나란히 배치**(Page 하나 = Board 하나 구조가 아님을 실제로 증명하는 자리). 그 아래 "게시판 허브" 바로가기 카드/레거시 그룹 링크 목록은 순수 내비게이션이라 Board Module로 바꾸지 않고 그대로 유지.
- **재사용을 위해 `export` 처리한 기존 코드**(동작 변경 없음): `src/lib/boardLayout.ts`의 `story()`/`community()`/`hub()`/`timeline()` 빌더 함수, `src/components/boards/CommentSection.tsx`의 `Comment` 타입.
- **범위 밖(의도적)**: `notice`/`hero`/`form`/`calendar`/`survey`/`ranking`/`profile_card` 등 Board가 아닌 모듈은 여전히 실제 Page에 연결되지 않았다(이번 EPIC은 "모든 Page를 Board와 연결"이 목표). 모듈을 추가/삭제/순서 변경하는 관리자 UI도 범위 밖.

## 8. 프로젝트 규칙

코드에서 실제로 확인되는 규칙:

- **App Router** 사용 (`src/app`, `page.tsx`/`route.ts` 파일 컨벤션).
- **TypeScript** 전면 사용, `strict` 여부 등 세부 설정은 `tsconfig.json` 참고.
- **Supabase**: 서비스 롤 키 없이 anon key만 사용. 모든 테이블에 RLS(Row Level Security) 적용(정책 상세는 "TODO / 확인 필요" 참고).
- **Server Component / Client Component 사용 방식**:
  - 인증이 필요 없는 단순 목록/조회 페이지(`/shop`, `/clubs`, `/rental` 등)는 `async` Server Component + `export const dynamic = "force-dynamic"`로 매 요청 최신 데이터를 가져옴.
  - 현재 로그인 사용자 정보가 필요한 페이지(`/mypage`, `/me`, `/shop/[id]`, `/boards/**`, `/attendance`, `/downloads`, `/polls` 등)는 `"use client"` + `useAuth()`/`useParams()`를 쓰는 Client Component.
  - `useSearchParams()`를 쓰는 페이지(`/docent`, 루트 레이아웃의 `Navbar`)는 자체 `<Suspense>` 경계로 감싼다.
- **가격/권한 계산은 서버(Route Handler)에서만** 수행하고 클라이언트 값은 신뢰하지 않는다(6번 참고).
- 별도 테스트 러너, CI 설정 없음 (`package.json`/`CLAUDE.md` 기준).

## 9. 개발 워크플로우

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

## 9.5 SEO / Sitemap / robots.txt (EPIC-054D)

**감사 배경**: EPIC-054D 전수 조사 결과, 70개 페이지 중 root `layout.tsx` 외에 metadata를 정의하는 곳이 하나도 없었고(전수 grep 확인), sitemap/robots 파일 자체가 존재하지 않았다.

- **`src/app/layout.tsx`**: root `metadata` — title(`"사일로 스토어"`, 하위 페이지는 `%s | 사일로 스토어` 템플릿 사용 가능)/description/openGraph/twitter(summary)/`metadataBase`(`NEXT_PUBLIC_SITE_URL` env, 미설정 시 `http://localhost:3000`). **개별 page.tsx의 `metadata`/`generateMetadata` override는 아직 하나도 없다** — 70개 페이지 전부 이 root 값을 그대로 상속한다(다음 확장 지점: 페이지별 콘텐츠에 맞는 title/description을 붙이는 작업, NEXT_TASK.md 기록).
- **`src/app/sitemap.ts`**: `src/app` 디렉토리를 Node `fs`로 직접 스캔해 정적 라우트를 자동 수집(관리자/API/마이페이지/인증 라우트 제외) + `navConfig.ts`의 하드코딩 이름 배열(heritage 할머니/할아버지, community 클럽 이름)로 동적 이름 라우트 생성 + Supabase에서 `boards`/`items`/`docent_contents`/`clubs` id를 조회해 동적 콘텐츠 라우트 추가(테이블 하나가 실패해도 나머지는 그대로 포함되도록 개별 try/catch). **새 `page.tsx`를 추가하면 이 파일을 고치지 않아도 자동으로 sitemap에 포함된다** — 파일시스템 스캔 방식이라 유지보수가 필요 없음.
- **`src/app/robots.ts`**: `sitemap.ts`와 동일한 제외 기준(admin/api/mypage/me/settings/login/signup)으로 `Disallow`, `Sitemap:` 지시어로 위 sitemap을 가리킴.
- **Canonical URL**: `metadataBase`만 있고 페이지별 명시적 `alternates.canonical`은 없음(70개 페이지 전체에 metadata를 붙이는 더 큰 작업이 선행돼야 함, P2).

## 10. 공식 설계 문서 (Single Source of Truth)

프로젝트 운영/설계 문서는 `docs/`에 분야별로 나뉘어 있으며, 각 문서가 해당 분야의 **공식 SSoT**입니다.
새로운 기능을 구현하기 전에는 관련 Blueprint를 먼저 확인하고, 구현이 문서와 어긋나면 문서를 함께 갱신합니다
(`CLAUDE.md`의 "Blueprint 우선 확인" 규칙 참고).

| 문서 | 다루는 범위 |
|---|---|
| [docs/git-sync.md](docs/git-sync.md) | Git 작업 절차(시작/종료/커밋/푸시/스키마 변경/금지 사항) |
| [docs/EPIC.md](docs/EPIC.md) | 전체 기능(Epic) 목록 — 완료/진행중/예정 |
| [docs/navigation-blueprint.md](docs/navigation-blueprint.md) | 전체 Navigation 구조(Top nav, 좌/우 Sidebar, URL, placeholder 여부, 활성 탭 판정 로직) |
| [docs/membership-blueprint.md](docs/membership-blueprint.md) | `membership_rank`/`membership_tiers`, 등급별 권한·혜택, 게시판 접근, 가격 계산 로직 |
| [docs/content-blueprint.md](docs/content-blueprint.md) | 게시판/갤러리/자료실/도슨트/상점/마이페이지 콘텐츠 모델과 콘텐츠 간 연결 구조 |
| [docs/design-system.md](docs/design-system.md) | 실제 사용 중인 색상/타이포그래피/사이드바/버튼/카드/인풋 등 de facto 디자인 관례 |
| `docs/database-schema.sql` | DB 스키마 (§3 참고) |

## 11. Project Stages / Project Dashboard (EPIC-054E)

이 프로젝트는 수백 개의 EPIC이 누적될 수 있는 장기 프로젝트라, **EPIC 번호(작업 단위)**와
**Stage(프로젝트 전체 진행 단계)**를 분리해 관리한다. 절대 혼용하지 않는다 — Stage는
"프로젝트가 지금 어느 국면인가"이고, EPIC은 "무엇을 했는가"의 기록이다.

- **Project Stages**: [docs/STAGES.md](docs/STAGES.md) — 6단계(Foundation → Content Platform →
  Community → Business → Experience → Scale) 정의, 각 Stage의 포함 내용과 현재 진행률/남은 항목.
- **Project Dashboard**: [docs/PROJECT_DASHBOARD.md](docs/PROJECT_DASHBOARD.md) — 매 세션
  가장 먼저 읽는 현황 요약(현재 Stage/진행률/진행 중인 EPIC/다음 EPIC/최근 완료 10개/
  최우선 순위/이슈 P0-P3/기술 부채/다음 마일스톤). 상세 근거는 복제하지 않고 STAGES.md/
  EPIC.md/NEXT_TASK.md로 링크한다.
- **Current Stage**: Stage 1 — Foundation (docs/STAGES.md 참고, 진행률 실시간 갱신).
- **Current Milestone**: Stage 1(Foundation) 완료 — 남은 항목은
  `docs/PROJECT_DASHBOARD.md`의 "Next Milestone" 섹션 참고.
- **문서 갱신 규칙**: 새 EPIC이 완료되면 `PROJECT_DASHBOARD.md`/`docs/STAGES.md`/
  `docs/EPIC.md`/`CHANGELOG.md`를 함께 갱신한다(`CLAUDE.md` "세션 시작 시 읽기 순서" 참고).

## TODO / 확인 필요

추측하지 않고 남겨둔 항목. 코드/DB 조회만으로는 확정할 수 없거나, 이 문서(개요 문서)에 상세를 옮기지 않기로 한 내용.

- **membership_tiers 정책**: `docs/database-schema.sql`에 컬럼 구조와 rank/name/price(6개 행)는 라이브 DB로 재확인했지만, 등급별 20여 개 혜택 플래그(할인율/적립률/큐레이션 레벨/살롱 출입료 등)의 **현재 값**은 이번 동기화에서 재검증하지 않음 — 확인 필요 (컬럼별 사용처는 [docs/membership-blueprint.md](docs/membership-blueprint.md)에 정리됨).
- **RLS 정책**: 31개 테이블 전부 RLS가 걸려 있다는 사실은 확인했으나, 테이블별 정확한 정책 조건(select/insert/update 각각 누구에게 허용되는지)은 이 문서에 옮기지 않음 — Supabase `pg_policies` 직접 조회 확인 필요.
- **`api/test-supabase` API 용도**: 코드상 존재는 확인했으나, 실제 용도(연결 테스트/디버그 전용/제거 대상 여부)는 확인 필요.
- **향후 로드맵**: 보류 중인 "Live Chat(회원채팅)" 외에 추가로 계획된 기능이 있는지는 이 저장소 코드만으로 알 수 없음 — 확인 필요 (`NEXT_TASK.md` 참고).
- **테스트 전략**: 현재 자동화 테스트가 전혀 없음(`package.json`에 테스트 러너 없음). 도입 여부/범위는 확인 필요.
- **디자인 시스템 갭**: "골동품/1920년대 Time Slip" 브랜드 감성이 실제 UI 비주얼에는 반영되어 있지 않음(콘텐츠 taxonomy로만 존재) — 리브랜딩 여부는 사용자 결정 필요, 상세는 [docs/design-system.md](docs/design-system.md) §0 참고.
