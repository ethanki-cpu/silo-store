# CHANGELOG

## 2026-07-26 (EPIC-027)
- **EPIC-027: BugFix — Navigation Editor에 저장(Save) 기능 추가**
  - 원인: `NavNodeEditor`/카테고리 행 입력이 `onBlur`/`onChange` 시점에 즉시 `update`를 호출하는 암묵적 autosave 방식이라, 사용자에게 "저장됐다"는 아무 신호도 없어 변경이 반영 안 되는 버그처럼 보였음(실제로는 포커스를 벗어나야만 저장되고, 클릭 순서에 따라 저장 타이밍이 눈에 안 보이는 문제도 있었음).
  - 조치: `shared.tsx`의 `NavNodeEditor`를 로컬 draft 상태 기반으로 변경 — 입력은 화면에만 즉시 반영되고, 필드가 원본과 달라지면(`dirty`) 활성화되는 명시적 **"저장"** 버튼을 눌러야 실제로 `site_navigations`에 `update`가 나간다. 저장 성공 시 "저장됐어요." 인라인 피드백을 2초간 표시. 카테고리(`site_categories`) 행도 동일한 패턴의 신규 `CategoryRowEditor`로 통일(`top-tabs/page.tsx`에서 인라인 코드 교체).
  - `updateNavRow`/`updateCategory`(top-tabs/sidebar-left/sidebar-right 3개 페이지)를 성공 여부(`Promise<boolean>`)를 반환하도록 변경해, 저장 버튼이 실패 시 "저장됐어요" 피드백을 보여주지 않도록 함(에러 배너는 기존처럼 페이지 상단에 별도 표시).
  - 검증: `sidebar-left` 페이지에서 "사일로상점" 탭 이름을 실제로 수정 → 저장 → 페이지 새로고침 후에도 값이 유지됨을 확인(DB 반영 확인), Navbar 실제 탭 이름도 즉시 바뀜을 확인. 테스트 후 원래 값으로 복원.

## 2026-07-26 (EPIC-026)
- **EPIC-026: Admin Homepage Settings Implementation**
  - 신규 테이블 `site_settings`(`docs/database-schema.sql` §13): `setting_key`(unique)/`setting_value`(jsonb)/`updated_at` — 설정 종류가 늘어나도 스키마 변경 없이 key만 추가하면 되는 key-value 저장소. `main_logo`/`hero_slideshow`/`home_curation` 3개 키 시드 포함(라이브 DB 미적용, Supabase SQL Editor 실행 필요).
  - RLS: 조회는 전체 공개, 추가/수정/삭제는 `members.is_admin` bypass 전용(EPIC-023/024와 동일 패턴).
  - `admin/navigation/settings/page.tsx`를 Placeholder에서 실 구현으로 교체: 메인 로고(텍스트/이미지 URL), 슬라이드쇼(이미지 URL·타이틀·설명 배열, 추가/삭제), 노출 필터(도메인+카테고리 slug 목록+정렬 기준) 3개 섹션을 각각 조회 후 "저장하기" 클릭 시 `upsert(onConflict: setting_key)`로 갱신. 별도 API Route 없이 브라우저에서 anon key + RLS로 직접 CUD(EPIC-023 관례 유지).
  - 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260726-1214.sql`로 백업.
  - 검증: 라이브 DB에 테이블이 아직 없어 조회 시 에러 배너가 표시되지만 폼은 기본값으로 정상 렌더링되고, 슬라이드 추가/삭제 등 UI 상호작용은 정상 동작함을 확인.

## 2026-07-26 (EPIC-025)
- **EPIC-025: Admin Dashboard Restructure & Nested Routing**
  - `admin/layout.tsx` 메인 탭 변경: 결제 관리 / 메뉴·카테고리 관리 / **전체 글 관리(신규)** / 스튜디오 포트폴리오 등록(문구 "스타일링"→"스튜디오"). 활성 탭 판정을 정확 일치에서 `startsWith`로 변경해 하위 라우트에서도 상위 탭이 하이라이트되도록 함.
  - `/admin/navigation`을 2-Depth로 분리: `layout.tsx`(서브 탭: 홈페이지 설정 관리/상단 탭·카테고리 관리/왼쪽 사이드바 메뉴 관리/오른쪽 사이드바 메뉴 관리) + `page.tsx`는 `top-tabs`로 리다이렉트. 기존 한 페이지에 있던 코드를 `target_type`별로 분리: `top-tabs/page.tsx`(tab·dropdown 최상위 + site_categories), `sidebar-left/page.tsx`(sidebar_left), `sidebar-right/page.tsx`(sidebar_right). 공통 타입/상수/트리 편집 UI(`NavNodeEditor`)는 `navigation/shared.tsx`로 추출해 3개 페이지가 공유.
  - `navigation/settings/page.tsx` 신규: "홈페이지 설정 관리" Placeholder(메인 로고/슬라이드쇼/노출 필터 카드 3개, 데이터 연동 없음).
  - `/admin/posts` 신규(2-Depth): `layout.tsx`(서브 탭: [사일로 상점]/[살롱데상] 카테고리별 글 관리) + `page.tsx`(→`shop`으로 리다이렉트) + `shop/page.tsx`(사일로 보물들/온라인 도슨트/사일로 Heritage 섹션 Placeholder) + `salon/page.tsx`(Community/Membership/Gallery/Library 섹션 Placeholder). 실제 글 목록 조회/관리 기능은 이번 EPIC 범위 밖(Placeholder만).
  - 검증: 하드 리로드로 `/admin/navigation`, `/admin/posts` 진입 시 각각 `top-tabs`, `shop`으로 정상 리다이렉트되고 서브 탭·본문이 정상 렌더링됨을 확인. `top-tabs`/`sidebar-left`/`sidebar-right` 페이지가 `target_type` 기준으로 정확히 필터링되어 겹치지 않음을 확인.

## 2026-07-26 (EPIC-024)
- **EPIC-024: Admin Dashboard Layout & Auth Guard Fix**
  - 원인: `/admin/*` 페이지들의 인증 가드는 이미 `loading`/`memberLoading`이 true인 동안 리다이렉트를 보류하는 형태였지만, `session`이 `null`→실제 세션으로 막 바뀌는 바로 그 렌더에서 AuthProvider(부모)의 member 재조회 effect가 `memberLoading`을 `true`로 재무장하기 전에, 페이지(자식)의 가드 effect가 먼저 실행되는 React의 effect 실행 순서(자식이 부모보다 먼저) 때문에 `memberLoading=false`(직전 값)를 잘못 신뢰해 `member`가 아직 `null`인 상태로 "관리자 아님" 판정 후 `/`로 리다이렉트되던 버그. 하드 리로드로 관리자 페이지에 직접 진입할 때만 재현됨.
  - 조치: `src/app/admin/layout.tsx` 신규 작성 — 이전 렌더의 `session` 참조를 `useRef`로 기억해두고, `session`이 방금 바뀐 바로 그 렌더는 판정을 한 번 건너뛰어 AuthProvider가 `memberLoading`을 재무장할 시간을 준 뒤 다음 렌더에서 최종 판정한다. 로딩 중에는 "확인 중..." 문구만 표시.
  - `/admin/payments`, `/admin/navigation`, `/admin/projects/new` 3개 페이지의 개별 인증 가드(useEffect 리다이렉트 + `if (...) return null`)를 제거하고 레이아웃으로 통합 — 각 페이지는 `session`(API 호출용 access_token)만 계속 사용.
  - `admin/layout.tsx`에 상단 서브 네비게이션 추가: "결제 관리"/"메뉴·카테고리 관리"/"스타일링 포트폴리오 등록" — Navbar 상단 탭과 동일한 시각 패턴(`border-b-2` 활성 탭 스타일) 재사용.
  - 검증: 하드 리로드로 `/admin/navigation` 직접 진입 시 더 이상 `/`로 튕기지 않고 정상 접근됨을 확인(이전에는 `/admin/projects/new`에서도 동일 버그 재현됨). 서브 네비게이션을 통한 관리자 페이지 간 클라이언트 사이드 이동도 정상 확인.

## 2026-07-26 (EPIC-023)
- **EPIC-023: Dynamic Navigation & Category Admin CMS**
  - `src/lib/navConfig.ts`를 하드코딩 배열(`NAV_TABS`)에서 DB 조회 함수(`fetchNavTabs()`)로 전환. `site_navigations`(신규 테이블, 자기참조 트리)를 조회해 기존과 동일한 `NavTab[]` 형태로 조립 — 조회 실패/시드 미적용 시 기존 하드코딩 값과 동일한 `FALLBACK_NAV_TABS`로 자동 대체되어 화면이 비지 않음. `getActiveNavTabKey()`는 순수 pathname 로직이라 변경 없음.
  - `Navbar.tsx`는 `useEffect`에서 `fetchNavTabs()`를 호출해 상태로 보관하고, 그 상태를 순회해 렌더링 — 기존 UX/스타일(좌/우 사이드바, 드롭다운, 중앙 정렬 탭 등)은 완전히 동일하게 유지.
  - 신규 테이블 2개 설계(`docs/database-schema.sql` §12): `site_navigations`(상단 탭/사이드바 그룹/드롭다운 항목을 하나의 트리로 표현), `site_categories`(상점/살롱/컬렉션/도슨트 카테고리, domain별). 기존 navConfig.ts 데이터 + 4개 도메인 카테고리(Time Slip 8종/도슨트 era 11종/EPIC-022 컬렉션 8종/살롱 게시판 13종)를 그대로 옮기는 Seed SQL 포함 — 아직 라이브 DB 미적용, Supabase SQL Editor에서 직접 실행 필요.
  - `/admin/navigation` 신규 관리자 페이지: 네비게이션 트리(추가/수정/삭제/순서/활성 토글)와 카테고리(도메인별 추가/수정/삭제/상위-하위 지정) CRUD UI. 이번 EPIC의 수정 대상 파일 범위에 API Route가 포함되지 않아, 별도 Route Handler 없이 브라우저에서 anon key로 직접 CUD하고 **RLS(관리자 bypass)를 실제 권한 강제 계층**으로 사용 — 다른 admin 화면들의 "Route Handler에서 is_admin 체크" 관례와는 다른 방식임을 명시.
  - RLS: 두 테이블 모두 조회는 전체 공개, 생성/수정/삭제는 `members.is_admin` bypass 전용.
  - 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260726-0824.sql`로 백업.

## 2026-07-26 (EPIC-022)
- **EPIC-022: MyPage Restructure & Schema Definition**
  - `/mypage`를 11개 탭(나의 컬렉션[9개 서브메뉴]/나의 위시리스트/팔로우/나의 살롱/나의 도슨트 수료증/나의 공간/나의 전시회/받은 배지/내가 쓴 댓글/타임라인/방문자 기록) 구조로 재구성.
  - 신규 DB 테이블 4개 설계(`docs/database-schema.sql` §11에 DDL 반영, 라이브 DB에는 미적용 — 사용자가 Supabase SQL Editor에서 직접 실행 필요): `member_collections`, `member_follows`, `member_badges`, `member_visitors`.
  - "나의 보물"(orders), "나의 위시리스트"(wishlists), "내가 쓴 댓글"(comments)은 기존 데이터를 그대로 재연결. 나머지 8개 컬렉션 서브메뉴는 `member_collections.category`로 분기.
  - "나의 살롱"/"나의 도슨트 수료증"/"나의 공간"/"나의 전시회"/"타임라인" 5개 탭은 이번 EPIC에서 데이터 소스가 지정되지 않아 **추측성 테이블/연동 없이 Empty State만** 구현(`PlaceholderPanel`).
  - `member_follows`/`member_visitors`는 조회 전용으로 구현 — 실제로 행을 적재하는 쓰기 경로(팔로우 버튼, 방문 기록 insert)는 `/u/[memberId]` 등 이번 작업 범위 밖 파일에 속하므로 미구현. 현재는 항상 빈 목록으로 보임(정상 동작).
  - 기존 마이페이지의 "갤러리"/"오늘의 영감"/"일반 글" 섹션(개인 마이피드 글 표시)은 새 11탭 구조에 포함되지 않아 제거함 — 동일한 개인 글은 `/me`에서 계속 조회 가능(`docs/content-blueprint.md` §7 참고). "멤버십"(등급/포인트) 정보는 11탭 밖의 계정 요약으로 상단에 유지.
  - 신규 파일: `src/components/mypage/{EmptyState,MyPageNav,mypageConfig}.tsx(.ts)`, `src/components/mypage/panels/{CollectionsPanel,WishlistPanel,FollowPanel,BadgesPanel,CommentsPanel,VisitorsPanel,PlaceholderPanel}.tsx`.
  - 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260726-0808.sql`로 백업.

## 2026-07-26 (EPIC-021)
- **EPIC-021: Google 로그인 "No API key found in request" 재확인 및 해결**
  - EPIC-020에서 수정한 `.env.local`의 `/rest/v1/` 접미사 제거가 실제로는 **해당 파일을 고친 PC에만 적용**되어 있었음. `.env.local`은 `.gitignore` 대상이라 git으로 공유되지 않고, Next.js는 `NEXT_PUBLIC_*` 환경변수를 빌드/컴파일 시점에 번들에 박아 넣으므로, 값을 고친 뒤 개발 서버를 재시작하지 않으면 브라우저에 여전히 예전 URL이 남아있는 번들이 서비스됨.
  - 재현 시도: 서버를 완전히 재시작한 뒤 Network 탭으로 실제 요청을 확인한 결과, `redirect_uri`가 `.../auth/v1/callback`로 정상 생성되고 있었고 컴파일된 번들의 `NEXT_PUBLIC_SUPABASE_URL` 값도 정상이었음 — 코드/설정 자체는 이미 올바른 상태였음을 증거로 확인.
  - 사용자가 실제 오류를 겪은 PC에서 ① `.env.local`의 `/rest/v1/` 제거 ② 개발 서버 완전 재시작 ③ 브라우저 새로고침을 수행한 뒤 Google 로그인 버튼이 정상적으로 Google 로그인 페이지로 이동함을 확인 — **해결 완료**.
  - 근본 교훈: `.env.local`은 PC별로 각자 만들어야 하는 로컬 전용 파일이며, 값을 바꾼 뒤에는 반드시 개발 서버를 재시작해야 한다는 점을 README.md에 명시(아래 항목).

## 2026-07-26 (문서)
- `README.md`에 "개발 환경 설정(.env.local)" 섹션 신규 추가 — 신규 개발자가 5분 안에 로컬 환경을 구성할 수 있도록 `.env.local` 작성법, Supabase Dashboard(Project Settings → Data API)에서 값 찾는 법, 필수 규칙(`NEXT_PUBLIC_SUPABASE_URL`은 Project URL만 사용하고 `/rest/v1/` 등 경로를 절대 붙이지 않음, `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 `anon`/`public` 키만 사용, `service_role` 키 금지)을 명시. EPIC-020에서 실제로 겪은 장애를 근거로 작성.
- `PROJECT_BLUEPRINT.md` §2(기술 스택)에 위 README 섹션을 가리키는 요약 인용구 추가.

## 2026-07-26 (EPIC-020)
- **EPIC-020: Google OAuth "No API key found in request" 버그 수정**
  - 원인: `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`에 남아있던 `/rest/v1/` 접미사. `@supabase/auth-js`는 `new URL("auth/v1", baseUrl)`로 인증 엔드포인트를 만드는데, base URL이 `/rest/v1/`로 끝나 있으면 결과가 `.../rest/v1/auth/v1/...`로 잘못 합성됨. Supabase 엣지가 이 경로를 PostgREST(`/rest/v1/*`)로 라우팅하면서 `apikey` 파라미터를 요구해 "No API key found in request" 오류가 발생(로그인뿐 아니라 이전에 보고된 `/shop` 등 데이터 조회 실패의 근본 원인과 동일).
  - 조치: `NEXT_PUBLIC_SUPABASE_URL`에서 `/rest/v1/` 접미사 제거, 순수 프로젝트 URL만 남김. `src/lib/supabaseClient.ts`/OAuth 구현 자체는 정상이었으므로 코드 변경 없음.
  - 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260726-0727.sql`로 백업(스키마 변경 없음, 절차 준수 목적).

## 2026-07-26 (EPIC-019)
- **EPIC-019: Studio Navigation Rename**
  - 상단 메인 탭 라벨 "공간 문의" → "스튜디오"로 변경(`src/lib/navConfig.ts`의 `label` 문자열 한 줄만 수정).
  - 기능/URL/Route 변경 없음: `space_inquiry` key, `/space-inquiry/*`·`/rental?floor=*` 경로, 드롭다운 상호작용 방식(`type: "dropdown"`) 모두 그대로.
  - 드롭다운 메뉴 구성(공간 촬영 대관/물품 대여/공간 스타일링) 변경 없음.
  - 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260726-0722.sql`로 백업(스키마 변경 없음, 절차 준수 목적).

## 2026-07-26
- **EPIC-018: 상단 탭 재구성**
  - 상단 메인 탭에서 "스튜디오 대관" 탭 제거. 최종 4개 탭으로 재구성: 사일로상점 / 살롱데상 / 공간 문의 / 마이페이지.
  - 상단 탭 행을 화면 중앙 정렬로 변경(`justify-center`). 로고/우측 계정 영역 위치는 그대로 유지.
  - 기존 "스튜디오 대관" 기능(1층/2층 공간 대관 예약, `/rental?floor=1f_silostore`·`/rental?floor=2f_salon`)을 URL 변경 없이 "공간 문의" 드롭다운으로 통합. "공간 촬영 대관" 항목이 기존 placeholder(`/space-inquiry/shoot-rental`) 대신 실제 예약 페이지로 연결되도록 교체, 2층 항목 신규 추가.
  - "마이페이지"를 계정 영역과 별개로 정식 4번째 상단 탭(단순 링크)으로 추가 — 계정 영역의 기존 마이페이지 링크는 유지되어 두 진입점이 공존.
  - `src/lib/navConfig.ts`에 `NavTabType`(`sidebar-left`/`sidebar-right`/`dropdown`/`link`) 도입, `getActiveNavTabKey()`에 `/rental`→`space_inquiry`, `/mypage`→`mypage` 분기 추가.
  - `src/components/Navbar.tsx`를 `NAV_TABS`를 순회하며 `type`에 따라 렌더링 방식만 분기하는 범용 구조로 리팩터링(탭별 하드코딩 제거) — 좌/우 사이드바, 드롭다운 로직 모두 tab-agnostic화.
  - 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260726-0658.sql`로 백업(스키마 변경 없음, 절차 준수 목적).

## 2026-07-23
- 작업 규칙 정비: `NEXT_TASK.md`, `CHANGELOG.md` 신설, `package.json`에 `type-check` 스크립트 추가.
- swing2app 구버전 앱 기능/데이터 이식 (9개 항목):
  - `item_personas` 캐릭터 은행(68명) + `items.persona_id`, `/shop/[id]` 이전 주인 사연 캐릭터 표시
  - `items.category` 8개 시대(Time Slip) CHECK 제약 + `/shop` 필터 탭
  - `docent_contents.figure_name` + `/docent` 인물별 그룹 보기
  - `boards.board_type`에 `adoption_story`/`archive`/`qna` 추가, `posts.order_id` 컬럼
  - `downloads` 테이블 + `/downloads` 페이지 (관리자 전용 업로드)
  - `daily_checkins` + `/attendance` 출석체크 (2P 적립)
  - `polls`/`poll_options`/`poll_votes` + 집계 뷰 + `/polls`
  - `/mypage`에 "Your Treasures" 구매 물품 섹션
- `silo-store`를 독립 git 저장소로 분리 (`git init` + Initial commit, 기존 `.gitignore` 그대로 사용).
- `PROJECT_BLUEPRINT.md` 신규 생성 (프로젝트 개요/아키텍처 문서, 코드 기준 작성 + TODO 섹션 분리).
- `docs/database-schema.sql`을 실제 운영 DB(Supabase Management API)와 전면 동기화하고, 이 프로젝트의 **유일한 공식 DB 스키마 문서(Single Source of Truth)**로 명시. 프로젝트 밖 `silostore_schema.sql` 사본은 더 이상 관리하지 않음.
