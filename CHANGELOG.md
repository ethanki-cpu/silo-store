# CHANGELOG

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
