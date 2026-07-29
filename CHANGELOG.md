# CHANGELOG

## 2026-07-29 (EPIC-066)
- **EPIC-066: Board Widget을 실데이터 렌더링으로 완성 — Renderer Registry + Pagination/Search/Sort/Filter/Empty/Skeleton**
  - **사전 감사(사용자 확인)**: "Board Type 10종" 중 실제 존재하는 건 5종(story/community/gallery/hub/timeline)뿐 — Survey/Calendar/Application은 위젯 타입이지 게시판 타입이 아니고, Collection/Forum은 존재한 적 없음. 실제 5종 기준으로 진행하기로 확정. "빈 화면"의 대부분은 렌더링 버그가 아니라 실제 게시글 0건(EmptyState 정상)임도 함께 확인.
  - **Renderer Registry**: `src/components/boards/renderers/`(Story/Community/Gallery/Timeline/Hub Renderer + `BoardRendererRegistry: Record<BoardLayoutType, Component>`)로 `BoardRenderer.tsx`의 switch/case 제거 — 새 레이아웃은 파일 하나 + registry 한 줄로 확장.
  - **필드 보강**: 좋아요/댓글/작성자/조회수/태그/카테고리/썸네일을 5개 레이아웃 전부에서 실제로 출력(카테고리는 게시판 속성이라 태그 칩으로 병합), `/api/boards/feed`에도 comment_count/view_count/tags 배치 조회 추가.
  - **Pagination**: 페이지당 개수(12/24/48/100) 선택 드롭다운 추가(하위 호환 optional prop).
  - **Search/Sort**: 이미 완비돼 있었음을 코드로 확인, 변경 없음.
  - **Filter**: Tag/Year를 `/api/boards/[id]/posts`에 실제 파라미터로 추가 + `FilterModule` 연결. Category/Board Type 필터는 시간 제약으로 미구현(NEXT_TASK.md 기록).
  - **Empty/Skeleton**: `BoardEmptyState`("아직 게시글이 없습니다."/"첫 글을 작성해보세요.") + `BoardSkeleton`(펄스 애니메이션)으로 교체.
  - **캐시**: 별도 캐싱 없이 항상 새로 fetch하는 기존 구조 유지 — "즉시 반영"이 구조적으로 보장됨(React Query/SWR 미도입, 기존 구조 유지 원칙 준수).
  - **Page Builder 연동 결함 발견 및 수정**: 79개 페이지가 `PageEditButton`만 달려 있고 `PageBuilderRenderer`를 전혀 호출하지 않아 위젯을 구성해도 화면에 반영될 수 없는 구조였음을 발견(EPIC-064A가 컴포넌트만 기계적으로 부착한 결과) — 이번 EPIC 필수 테스트 대상 중 여기 해당하는 `/salon/event-notices`(정적 "준비 중" 텍스트)만 형제 페이지와 동일한 패턴으로 수정, 나머지 78개는 별도 규모의 작업이라 NEXT_TASK.md에 목록 기록.
  - **리팩토링**: `useBoardData`(BoardService)로 조회 로직 분리, `BoardModule.tsx`는 프레젠테이션 전용으로 축소(전 파일 500줄 이내 확인).
  - **성능**: API 라우트 2곳 모두 작성자/댓글 수 배치(IN절) 조회로 N+1 없음 재확인.
  - **DB(Management API 토큰으로 직접 실행)**: `treasures` 페이지의 미연결 Gallery 위젯을 실제 관련 게시판("After Adoption 분양 후 이야기")에 연결, `gallery` 페이지의 죽은 빈 Gallery 위젯(5개 버튼과 중복) 삭제.
  - **검증**: `npx tsc --noEmit`/`npm run build`/`npm run lint`(기존 30개 baseline 동일, 신규 0건) 통과. **관리자 세션이 실제로 열려 있어** Visual Widget Builder를 직접 클릭해 확인 — Board Widget Inspector의 6개 토글(검색/정렬/페이지 넘김/페이지당 개수/썸네일/글쓰기 버튼) 전부 렌더링, Live Preview가 실제 게시글 데이터(작성자/좋아요/댓글/조회수)로 즉시 반영됨을 확인, BoardEmptyState 문구가 지시문 예시와 정확히 일치하는 것도 실제 화면에서 확인.
  - 문서 동기화: `docs/EPIC.md`, `NEXT_TASK.md`.

- **EPIC-066 추가: Board Management System 완성 — 관리자 게시판 CRUD/복제/공개-비공개/Board Type/Category/카드 타입/검색·좋아요·댓글·조회수 토글/페이지네이션/정렬/검색·필터/미리보기/삭제 확인**
  - **DB(`docs/database-schema.sql`에 EPIC-066 ALTER TABLE 블록 기록, 라이브 미적용 — Supabase SQL Editor 실행 필요)**: `boards`에 `is_public`/`group_key`/`render_type`/`default_card_type`/`use_search`/`use_like`/`use_comment`/`use_view_count`/`default_page_size`/`default_sort`/`description`/`widget_settings` 추가 + admin 쓰기 RLS 정책(`boards_admin_write`). 기존 `category`(slug)/`board_type`(권한 축)은 그대로 유지, 새 컬럼은 전부 오버라이드 방식이라 값이 없는 기존 게시판은 회귀 없이 그대로 렌더링됨.
  - **오버레이 아키텍처**: `resolveBoardDefinition()`(`src/lib/boardLayout.ts`)이 기존 하드코딩 `BoardDefinition` 위에 새 admin 컬럼을 `applyAdminOverrides()`로 얹는 방식 채택 — 하드코딩 시스템을 걷어내지 않고, admin UI로 만진 게시판만 즉시 반영. `boards` select는 posts.tags/view_count와 동일한 rich/legacy 폴백 패턴(`BOARD_RICH_FIELDS`/`BOARD_LEGACY_FIELDS`)이라 마이그레이션 전에도 게시판 읽기가 멈추지 않음.
  - **Board Type 10종**: Story/Community/Gallery/Timeline은 기존 레이아웃 재사용, Forum→Community/Collection→Gallery는 별칭 처리, Slide는 기존 `SlideModule`을 게시판 자기 글로 재사용하는 신규 실렌더러. Survey/Calendar/Application은 이 코드베이스에 데이터 모델이 전혀 없어(Page Builder의 survey/calendar 위젯도 무관한 정적 데모) 안내 배너 + 기존 글 목록으로 스텁 처리(사용자 확인 후 확정) — 실제 투표/날짜별 보기/신청 흐름은 후속 EPIC.
  - **좋아요/댓글/조회수 토글 실동작화**: `formatPostMeta()`(`src/lib/postMeta.ts`) 공용 헬퍼로 Story/Community/Gallery 목록 카드 + 게시글 상세 헤더(`PostDetailHeader`) 전부에서 토글이 실제로 메타 라인을 감춘다(이전에는 이 3개 토글이 정의에는 있어도 화면에 전혀 반영되지 않았음).
  - **공개/비공개**: `canReadBoard()`에 `is_public`+admin 우회 게이팅 추가, `/api/boards`·`/api/boards/[id]/posts`가 비공개 게시판을 등급과 무관하게 막는다(관리자 제외).
  - **Admin API**: `/api/admin/boards`(GET 목록/POST 생성), `/api/admin/boards/[id]`(GET/PATCH/DELETE — FK 위반 시 "게시글이 있어 삭제할 수 없어요" 안내), `/api/admin/boards/[id]/duplicate`(POST — slug만 자동 유니크 생성, 나머지 전 필드 복사) — `payments` 라우트와 동일한 `getRequestMember`+`is_admin`+`scopedClient` 패턴.
  - **Admin UI**: `/admin/boards`(검색+Category/Board Type 필터 목록), `/admin/boards/new`·`/admin/boards/[id]`(공용 `BoardForm` — Board Type 변경 시 샘플 글 2건으로 즉시 미리보기), 새 `ConfirmModal`(요구사항이 명시한 "정말 삭제하시겠습니까?" 확인 모달, 기존 다른 페이지의 `window.confirm()`은 범위 밖이라 유지).
  - **Page Builder**: 위젯의 게시판 드롭다운(요구사항 ⑫가 요구한 "board_id 직접 입력 UI 제거"는 이미 이전 EPIC에서 select 드롭다운으로 구현되어 있었음, 이번엔 확인만) + `is_public===false` 게시판 제외 필터만 추가.
  - **검증**: `npx tsc --noEmit`/`npm run lint`(기존 29개 baseline과 동일, 신규 0건) 통과. 로그인 불필요한 부분(공개 게시판 목록/상세의 `is_public` 게이팅, Page Builder 드롭다운 필터)은 dev 서버로 직접 확인. Admin 로그인이 필요한 게시판 생성/수정/복제/삭제/미리보기/검색 UI는 자격 증명을 직접 입력하지 않는 정책상 사용자 확인 필요(`NEXT_TASK.md` 기록).
  - 문서 동기화: `docs/database-schema.sql`, `NEXT_TASK.md`.

## 2026-07-29 (EPIC-065)
- **EPIC-065: 기존 JSON 기반 Page Builder → No-Code Visual Widget Builder 전환**
  - **DB(Management API 토큰으로 직접 실행)**: `page_modules.module_type` CHECK 제약 제거, `is_hidden boolean default false` 컬럼 추가. `docs/sql/EPIC-065-widget-builder-schema.sql`에 기록(재실행 안전).
  - **위젯 23종**: `src/lib/widgetSchema.ts` 신설(타입/라벨/아이콘/6개 카테고리 그룹/필드 스키마/기본값). Hero/Breadcrumb/Board/Latest Posts Slider/Gallery/Timeline/Calendar/Reservation/Survey/Button/CTA/Quote/Image/Video/Audio/FAQ/Search/Filter/Statistics/Badge/Divider/Spacer/HTML. 신규 leaf 컴포넌트 9개만 작성(`BreadcrumbWidget`/`ButtonWidget`/`QuoteWidget`/`ImageWidget`/`VideoWidget`/`AudioWidget`/`FaqWidget`/`StatisticsWidget`/`BadgeWidget`), 나머지는 기존 컴포넌트 재사용(`SurveyCard`/`CtaButtons` 등 EPIC-054B 자산 포함).
  - **Inspector(JSON 없음)**: `WidgetInspectorForm`(체크박스/드롭다운/텍스트/숫자/목록 5종) 하나가 23종 전부를 설정 — 목록형 필드(FAQ/Statistics/CTA/Reservation 등)는 행 추가·삭제·위아래 이동 UI.
  - **Board Widget 6개 토글 실동작화**: `BoardModule`에 `searchEnabled`/`sortEnabled`/`paginationEnabled`/`pageSizeOverride`/`showThumbnail`/`showWriteButton` optional prop 추가(전부 기본 undefined → 기존 호출부 무영향). `/api/boards/[id]/posts`에 `pageSize` 쿼리 파라미터 추가. 썸네일 토글은 `StoryThumbnailModule`(story 레이아웃)에만 적용(gallery/hub는 이미지가 레이아웃 자체라 대상 아님, 알려진 제한).
  - **Live Preview**: 편집 중 위젯 하나만 draft로 관리, `PageBuilderRenderer`가 해당 자리를 draft로 치환해 렌더링 — 저장 전에도 새로고침 없이 즉시 반영.
  - **Drag & Drop / Duplicate / Hide**: 기존 `dnd-kit` 패턴 재사용, 복제는 원본 바로 다음에 삽입(뒤 항목 sort_order 밀기), 숨기기는 `is_hidden` 즉시 토글(공개 페이지는 건너뜀, 관리자 미리보기는 흐리게 계속 표시).
  - **개발자 모드**: 세션 로컬 체크박스를 켜야만 위젯별 원시 JSON 보기/수정이 나타남(기본 숨김) — `src/app/admin/pages/[id]/page.tsx` 전면 재작성.
  - **검증**: `npx tsc --noEmit`/`npm run build`/`npm run lint`(신규 에러 0건) 통과. 관리자 로그인 자격 증명이 없어 Visual Builder UI를 직접 클릭 테스트하지는 못했음 — Management API로 새 위젯 5종+숨김 위젯+Board 토글 6종을 라이브 `/gallery` 페이지에 임시로 심어 렌더링/필터링을 실제 확인한 뒤 전부 원상복구(테스트 데이터 잔존 없음 확인).
  - 문서 동기화: `docs/EPIC.md`, `NEXT_TASK.md`.

## 2026-07-29 (EPIC-064A)
- **EPIC-064A: 모든 Route에 관리자 전용 "페이지 수정" 버튼 부착 — Page Builder/Widget/DB 수정 없이 기존 `PageEditButton` 컴포넌트만 재사용**
  - `src/app` 하위 135개 `page.tsx`를 전수 조사 — 51개는 이미 EPIC-060~062에서 버튼이 붙어 있었고, 나머지 84개 중 75개(placeholder 페이지 35개는 스크립트로, 나머지 49개는 개별 검토)에 새로 부착. `/admin/**` 9개는 관리자 CMS 도구 자체(가드는 이미 `admin/layout.tsx`가 처리, `/admin/pages/[id]`는 Page Builder 편집기 그 자체)라 의도적으로 제외 — 결과적으로 126/135 Route에 적용.
  - Static Route(`/treasures`, `/shop` 등)와 Dynamic Route(`/boards/[id]`, `/docent/[id]`, `/heritage/grandma/[name]`, `/u/[memberId]`, `/mypage/collections/[category]` 등) 모두 포함.
  - 버튼 위치는 `PageEditButton` 자체가 `fixed top-20 right-4`이므로 어느 페이지에 넣어도 화면상 동일한 위치에 뜬다 — 페이지별 레이아웃 조정 없이 일관성이 자동으로 보장됨.
  - slug 네이밍: URL 경로를 대시로 이은 문자열로 통일(예: `/shop/projects/[id]` → `shop-projects-id`). 로딩/에러 중간 상태의 early return에는 버튼을 붙이지 않고, 실제 콘텐츠가 렌더링되는 지점에만 부착(리다이렉트 전용 페이지 `/mypage/collections`는 예외적으로 `return null` 자체를 버튼으로 교체).
  - 클릭 시 동작은 기존 `PageEditButton`(`/admin/pages/[pageId]`로 이동, `page_builder`에 해당 slug 행이 있을 때만 관리자에게 노출) 그대로 — 새 기능 추가 없음.
  - **검증**: `npx tsc --noEmit`/`npm run build`(135개 라우트 전부 컴파일)/`npm run lint`(신규 lint 에러 0건 — 발견된 30건은 전부 이번 변경과 무관한 기존 `react-hooks/set-state-in-effect` 패턴) 통과. 브라우저로 static/dynamic/placeholder/board/폼/redirect 26개 페이지를 직접 열어 콘솔 에러 없이 로딩 확인, 관리자가 아닌 세션에서 버튼이 어디에도 노출되지 않음을 확인.
  - 문서 동기화: `docs/EPIC.md`, `NEXT_TASK.md`.

## 2026-07-29 (EPIC-063)
- **EPIC-063: Navigation System Completion (Page-first Architecture) — Board가 아니라 Navigation/Hub Page/Sidebar UX만 수정**
  - **사전 감사 결과**: 라이브 `site_navigations`(DB)와 EPIC-062까지의 Hub Page(`/treasures`·`/docent`·`/heritage`·`/community`(+`/topics`·`/weekday`)·`/membership`·`/gallery`·`/archive`, 각 페이지의 관리자 전용 `PageEditButton`)는 이미 지시 사항대로 전부 갖춰져 있었다 — 신규 Route/버튼 생성 없이 실제로 남아 있던 프론트엔드 버그 3건 + DB 1건만 수정.
  - **버그①(상단 Navbar 드롭다운)**: `Navbar.tsx`의 top-nav hover 플라이아웃에서 그룹 헤더(사일로 보물들/온라인 도슨트/사일로 유산/커뮤니티/멤버십/갤러리/아카이브)가 DB에 이미 올바른 `href`가 있음에도 항상 클릭 불가한 `<button>`으로 렌더링되고 있었다(`group.href`를 아예 참조하지 않음) — `group.href`가 있으면 `<Link>`로 렌더링하도록 수정, 없으면 기존처럼 클릭 불가 버튼 유지(LeftSidebar/RightSidebar 본 패널은 EPIC-058부터 이미 이 분기를 갖고 있었음). 브라우저에서 `사일로 상점`→`/treasures`, `살롱데상`→`/community`/`/membership`/`/gallery`/`/archive` 클릭 이동 확인.
  - **버그②(LeftSidebar 기본 펼침)**: `defaultExpanded()`가 그룹 라벨에 "도슨트"/"헤리티지"가 없으면(예: "사일로 보물들") 기본 펼침으로 뒀던 특례를 제거 — 모든 그룹이 예외 없이 기본 접힘으로 시작하도록 `RightSidebar.tsx`와 동일하게 단순화. 브라우저에서 Left/Right 모두 그룹 3~4개 전부 `aria-expanded=false` 확인.
  - **버그③(Sidebar 여닫이 UX)**: `LeftSidebar.tsx`/`RightSidebar.tsx`의 여닫이 아이콘이 "클릭으로만 열림"(EPIC-043)이었던 것에 `onMouseEnter`를 추가해 hover로도 열리도록 하고, 패널의 `onMouseLeave`(hover-out 시 즉시 닫힘, `onAmbientLeave` prop)를 완전히 제거 — 이제 패널을 닫는 방법은 Navbar.tsx의 기존 backdrop 클릭(Outside Click) · ✕ 버튼 · Escape 세 가지뿐이다. 브라우저에서 (a) hover만으로 열림, (b) 패널에 `mouseleave`/`mouseout`을 강제로 발생시켜도 안 닫힘, (c) backdrop 클릭 시 닫힘을 각각 실제 DOM 상태(`aria-hidden`/클래스)로 확인. 상단 Navbar의 작은 hover 플라이아웃(hover-open/hover-out-close)은 요구사항대로 무변경.
  - **DB①(Navigation Audit)**: `site_navigations` 전체(52행)를 anon key로 조회해 트리로 재구성, 감사 — 유일하게 깨진 행은 "입양신청서 라이브러리"(href=null, 사일로 보물들 하위) 1건뿐이었다(그 외 지시된 항목은 전부 올바른 Hub URL 연결 확인). Management API 토큰이 이번 세션에 없어 `docs/sql/EPIC-063-nav-audit-fix.sql`(관리자가 Supabase SQL Editor에서 실행)로 작성 — `/shop`으로 임시 연결(전용 페이지가 없어 형제 항목과 동일 목적지로 지정, 실제 의도가 다르면 href만 바꿔 재실행).
  - **문서 동기화**: `docs/navigation-blueprint.md`(EPIC-023 이후 실제 DB 기준과 어긋난다는 경고 추가 + 이번 EPIC의 sidebar 동작 변경 반영), `docs/EPIC.md`, `NEXT_TASK.md`. EPIC-057~062의 상세 요약이 `docs/EPIC.md`/`CHANGELOG.md`에 아직 없었다는 기존 문서 부채를 발견해 `NEXT_TASK.md`에 별도 기록.
  - **검증**: `npx tsc --noEmit`/`npm run build`/`npm run lint` 통과(수정 파일 관련 신규 에러 0건 — LeftSidebar/RightSidebar 신규 lint 에러 없음, Navbar.tsx의 유일한 lint 경고는 이번 EPIC과 무관한 기존 코드). 브라우저로 `/treasures`·`/docent`·`/heritage`·`/community`·`/community/topics`·`/community/weekday`·`/membership`·`/gallery`·`/archive` 9개 라우트 전부 콘솔 에러 없이 로드 확인. 로그인 세션이 없어 `PageEditButton`(관리자 전용)이 익명 사용자에게 보이지 않음(정상)만 확인 — 관리자 계정으로의 실제 노출은 사용자가 로그인 후 직접 확인 필요.

## 2026-07-28 (EPIC-056)
- **EPIC-056: 모든 페이지를 Board Module 조합으로 구성 — 14개 Board Module 정립 + 브라우저에서 실제로 보이는 화면 변경**
  - **모듈 정립(14종)**: 기존에 `BoardRenderer.tsx`/`BoardHeader.tsx` 안에 갇혀 있던 사설(private) 컴포넌트들을 `src/components/modules/`에 독립적으로 재사용 가능한 이름 있는 모듈로 뽑아냈다(마크업/동작 변경 없음, 순수 추출) — `CommunityListModule`(⑥), `StoryThumbnailModule`(⑤, 기존 공용 `StoryCard` 재사용), `GalleryModule`(⑦), `SlideModule`(⑧), `SortSelect`(④), `BoardHeaderModule`(②, 제목+글쓰기 버튼만 — Search/Sort 분리). `HeroModule`(①)은 `PageHeaderContent`(EPIC-054A)의 이름 있는 alias, `ApplicationModule`(⑫)은 `CtaButtons`(EPIC-054B)의 이름 있는 alias — 전부 재사용, 중복 없음. 신규 마크업이 필요했던 건 `FilterModule`(⑩) 하나뿐이며, 그마저도 `docs/design-system.md` §4의 기존 pill 필터 관례를 그대로 따랐다(새 디자인 없음). Search(③)/Pagination(⑬)/Empty State(⑭)/Timeline(⑨)/Calendar(⑪)는 이미 독립 모듈로 존재하던 `SearchInput`/`Pagination`/`EmptyState`/`TimelineView`/`CalendarGrid`를 그대로 재사용.
  - **`BoardHeader.tsx`/`BoardRenderer.tsx` 리팩터**: 각각 위 모듈들을 조합하는 얇은 레이아웃 래퍼로 재구성 — 렌더링 결과(HTML/클래스)는 리팩터 전과 동일함을 브라우저로 확인.
  - **브라우저에서 실제로 보이는 변경 ①**: `src/components/modules/BoardModule.tsx`에 Hero Module을 내장(`showHero` prop, 기본 `true`) — 이제 `/boards/[id]`(자유게시판/클럽/각 시대 게시판 등 약 72개 게시판 전부)가 이전에는 없던 **Breadcrumb + 제목 + 설명**을 화면 최상단에 보여준다(예: `/boards/b0f009f3-...` → "홈 › Community › 자유게시판" + "자유게시판" + "누구나 자유롭게 글을 쓰는 자유게시판"). Breadcrumb 중간 항목은 `resolveBoardDefinition(board).parent`를 통해 부모 hub 이름을 자동으로 붙인다.
  - **브라우저에서 실제로 보이는 변경 ②**: `PageTemplate`이 이미 자체 Hero를 그리는 6개 카테고리 허브 페이지(Community/Heritage/Studio/Membership/Gallery/Archive)는 `BoardModule`에 `showHero={false}`를 넘겨 Hero 중복 렌더링을 방지 — 브라우저로 Hero가 정확히 1번만 보임을 확인.
  - **브라우저에서 실제로 보이는 변경 ③**: `/boards`(게시판 디렉토리) 상단의 일반 `<h1>`을 `HeroModule`로 교체해 Breadcrumb("홈 › 게시판")과 설명 문구가 새로 보이게 됨.
  - **브라우저에서 실제로 보이는 변경 ④(가장 큰 구성 변화)**: `/studio` 페이지를 `PageTemplate`(범용) 대신 지시받은 조합(Hero + Application Module + Calendar Module + Board Container)으로 직접 재조립 — `ApplicationModule`이 "공간 촬영 대관 신청"/"물품 대여 신청"/"공간 스타일링 문의" 3개 버튼(기존 `/rental`·`/space-inquiry/*` 실제 페이지로 연결)을, `CalendarGrid`가 이번 달 달력을 새로 보여준다(실 예약 데이터 연동은 새 기능이라 범위 밖, 달력 자체만 표시).
  - **검증**: 로컬 dev 서버로 `/boards/b0f009f3-...`(Hero+Breadcrumb 신규 노출), `/studio`(Application+Calendar 신규 노출, 스크린샷 확인), `/community`(Hero 중복 없음 확인), `/boards`(Breadcrumb 신규 노출), `/gallery` 전부 콘솔 에러 없이 확인.
  - **아직 모듈이 적용되지 않은 페이지**: `/shop`(사일로상점 아이템 카탈로그), `/docent`(온라인 도슨트), 마이페이지 전체 — 전부 게시판(`posts`/`boards`)이 아닌 별도 데이터 도메인(items/docent_contents/개인 데이터)의 성숙한 기존 화면이라, 이번 EPIC에서 강제로 Board Module 조합으로 재구성하지 않았다(새 기능 없이는 데이터 모델이 맞지 않음) — 별도 EPIC에서 사용자와 방향을 논의할 것.
  - 문서 동기화: `docs/STAGES.md`, `docs/PROJECT_DASHBOARD.md`, `docs/EPIC.md`, `NEXT_TASK.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint` 통과(신규/수정 파일 관련 에러 0건).

## 2026-07-28 (EPIC-055)
- **EPIC-055: Universal Board System 완성 — 모든 페이지를 실제 게시판(Board)에 연결(새 페이지/기능/DB/Board 컴포넌트 없이 연결과 중복 제거만)**
  - **발견: `src/components/shared/UniversalBoard.tsx`(EPIC-044) — 실데이터 없는 뼈대 stub이 3개 페이지 그룹에서 여전히 쓰이고 있었다.** `/heritage/grandma/[name]`·`/heritage/grandpa/[name]`·`/community/club/[name]`(최대 69개 이름별 URL: 할머니 50 + 할아버지 17 + 클럽/주제 20)이 전부 `posts=[]` 고정값의 독자적인 검색/정렬 로직(Universal Board System과 완전히 무관, `BoardRenderer`/`BoardModule`을 전혀 쓰지 않는 별개 구현)만 렌더링하고 있어 실제 게시판과 연결돼 있지 않았다.
  - **연결**: 3개 페이지 그룹 전부 `UniversalBoard` → `PageTemplate`+`BoardModule`(EPIC-054C/054F)로 교체. 할머니/할아버지는 개인별 게시판이 없어(새 DB 금지) 전체가 공유하는 `grandmas`/`grandpas` 스토리 게시판(`src/lib/boardLayout.ts`, 기존 정의)에 연결하고 이름은 페이지 제목으로만 사용(검색창으로 특정 이름 필터링 가능, 기존 `BoardModule` 기능 그대로). 클럽/주제별 게시판은 EPIC-049 때 이미 실제 board 행(name=클럽 이름)으로 존재하므로, `src/lib/useHubBoardId.ts`에 추가한 `useBoardIdByName(name)` 훅으로 정확히 이름이 일치하는 그 board에 그대로 연결(새 board 생성 없음).
  - **중복 제거 ①**: `src/components/shared/UniversalBoard.tsx` 완전 삭제(대체 후 참조 없음 확인) — 자체 검색/정렬 재구현이 사라지고 Universal Board System(`BoardHeader`/`BoardRenderer`/`Pagination`) 하나로 통일.
  - **중복 제거 ②**: `src/components/mypage/EmptyState.tsx`(마이페이지 전용, `message` prop)가 Board System의 `src/components/modules/EmptyState.tsx`(`title` prop)와 사실상 동일한 컴포넌트로 중복 존재 — 마이페이지 패널 11개 + `CollectionCategoryPanel.tsx` 총 12곳의 import와 prop명(`message`→`title`)을 일괄 전환하고 마이페이지 전용 버전을 삭제. 이제 게시판이든 마이페이지든 "콘텐츠 없음" 상태는 컴포넌트 하나만 공유.
  - **Board Config 단순화 확인**: `src/lib/boardLayout.ts`의 `BOARD_DEFINITIONS`/`INDIVIDUAL_BOARD_DEFINITIONS` + `resolveBoardDefinition()`가 이미 "설정 파일 하나만 수정해 새 게시판 추가" 구조를 만족함을 재확인(EPIC-047부터 유지) — 이번 EPIC은 이 구조를 변경하지 않고 그대로 재사용.
  - **범위 밖(의도적, 지시 반영)**: `/shop`(아이템 카탈로그)·`/docent`(도슨트 콘텐츠)는 `posts`/`boards` 테이블과 무관한 별개 데이터 도메인이라 Board 연결 대상이 아님(게시판이 아님). 마이페이지 개인 데이터 패널(컬렉션/위시리스트/팔로우 등)도 개인 전용 데이터라 실제 `board_id` 연결 대상 아님 — EmptyState 컴포넌트만 공유. `silo-store`/`online-docent` hub는 EPIC-054F와 동일하게 "새 페이지 금지"로 전용 URL을 만들지 않음(`/boards` 디렉토리 슬라이드로만 노출, 기존과 동일). `salon-topics`/`salon-weekday`/`survey` 중첩 hub도 전용 URL 없음(Community 허브 하위 카드로만 접근, 기존과 동일). 새 Editor/Block/DB/Storage/Upload/Authentication/Design은 전혀 만들지 않음.
  - 문서 동기화: `docs/STAGES.md`(Stage 1 Board System 진행률), `docs/PROJECT_DASHBOARD.md`, `docs/EPIC.md`, `NEXT_TASK.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint` 통과(신규/수정 파일 관련 에러 0건). 로컬 dev 서버로 `/heritage/grandma/Agatha`(Board 미연결 상태 EmptyState 정상), `/community/club/경제`(동일하게 EmptyState — 라이브 DB에 클럽 board 행 자체가 아직 없음을 확인), `/boards`(기존 6개 legacy 게시판만 실제 존재함을 재확인) 콘솔 에러 없이 확인.

## 2026-07-28 (EPIC-054F)
- **EPIC-054F: 모든 상위/하위 카테고리 메뉴가 실제 Page(Route)를 갖도록 정비 — 새 기능/디자인/DB/게시판/Block/Editor 없이 Page 생성만**
  - **조사**: EPIC-054D 감사(navConfig.ts/Board Definition System 전수 확인) 결과를 근거로, 지시받은 카테고리 목록(Studio/Community/Membership/Gallery/Archive/Online Docent/Heritage/마이페이지) 각각의 실제 Route 존재 여부를 재확인 — 마이페이지 12개 탭은 전부 이미 실제 페이지 보유(변경 없음), Online Docent(`/docent`)는 이미 완전히 구현됨(변경 없음). **Community**(`/community/club/[name]`만 있고 `/community` 자체는 없음), **Heritage**(`/heritage/grandma|grandpa/[name]`만 있고 `/heritage` 자체는 없음), **Studio**/**Membership**/**Gallery**/**Archive**(디렉토리 자체가 아예 없음) 6곳이 실제 404 상태임을 확인 — 전부 Board Definition System의 hub 정의(`src/lib/boardLayout.ts`)는 이미 존재하지만 그 hub를 가리키는 Route가 없던 상태.
  - **공용 Page Template 신설**: 새 디자인을 만들지 않기 위해 기존 두 컴포넌트를 조합만 함 — `src/components/PageHeader.tsx`에서 Breadcrumb/Title/Subtitle/Description 블록을 `PageHeaderContent`로 추출(기존 `PageHeader`는 그대로 `<main>`으로 감싸 하위 호환, 19개 기존 페이지 동작 변경 없음) + `src/components/PageTemplate.tsx` 신규(`PageHeaderContent` + Board Container 자리에 `BoardModule`(EPIC-054C, Search/Sort/Pagination/글쓰기 버튼/Empty State 전부 포함) 또는 `boardId`가 없을 때 `EmptyState`("게시글이 없습니다.")를 배치). Sidebar는 전역 레이아웃(Navbar의 LeftSidebar/RightSidebar)이 모든 페이지에 이미 제공하므로 별도로 만들지 않음.
  - **`src/lib/useHubBoardId.ts` 신규**: slug로 실제 board row id를 찾는 훅 — `src/app/boards/page.tsx`가 이미 쓰던 "전체 boards 조회 후 `resolveBoardDefinition(b).slug`로 매칭" 패턴을 그대로 재사용(새 조회 로직 없음), 6개 신규 페이지가 공유.
  - **6개 신규 페이지**: `/community`, `/heritage`, `/studio`, `/membership`, `/gallery`, `/archive` — 전부 `PageTemplate` + `useHubBoardId(slug)` 조합으로 동일하게 구현. 브라우저로 6개 전부 확인: 5개는 해당 hub의 board 행이 라이브 DB에 아직 시딩되지 않아 "게시글이 없습니다." Empty State 정상 노출(Board 미연결 상태에서도 Page 자체는 항상 존재), `/archive`만 기존에 실제로 존재하던 "자료게시판"(legacy `board_type='archive'` 그룹, EPIC-047 이전부터 있던 실제 게시판)이 우연히 같은 slug("archive")로 해석돼 정상적으로 콘텐츠+검색/정렬/페이지네이션이 표시됨.
  - **발견(수정하지 않음, P2)**: legacy `BOARD_DEFINITIONS.archive`(그룹, "자료게시판")와 신규 `INDIVIDUAL_BOARD_DEFINITIONS.archive`(hub, "Archive")가 동일한 slug `"archive"`를 쓰는 네이밍 충돌이 있음 — `resolveBoardDefinition`이 `category`(개별 정의)를 `board_type`(그룹 정의)보다 우선 확인하는 순서 때문에 실제 동작은 깨지지 않지만, "어느 archive를 가리키는지" 혼동 여지가 있다. Board Definition System 자체를 수정하는 일이라 "새 게시판/DB 변경 금지" 범위 밖 — NEXT_TASK.md에 기록만.
  - **모든 Route 목록**: `src/app` 기준 `page.tsx` 76개(기존 70개 + 신규 6개, `api/` 제외) — 상세는 `docs/PROJECT_DASHBOARD.md`/터미널 출력 참고.
  - **범위 밖(의도적)**: nested hub(`salon-topics`/`salon-weekday`/`survey`)는 지시된 카테고리 목록에 없어 전용 top-level Route를 만들지 않음 — Community 허브 페이지의 "하위 게시판" 카드 그리드(기존 `BoardRenderer`의 `HubView`, EPIC-048)를 통해 이미 도달 가능. 새 기능/디자인/DB/게시판/Block/Editor는 지시대로 전혀 만들지 않음.
  - 문서 동기화: `docs/STAGES.md`(EPIC-054E 규칙에 따라 Stage 1 Navigation/Routing 진행률 갱신), `docs/PROJECT_DASHBOARD.md`, `docs/EPIC.md`, `NEXT_TASK.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint` 통과(신규/수정 파일 관련 에러 0건). 로컬 dev 서버로 6개 신규 페이지 전부 브라우저 확인(Breadcrumb/Header/Description/Board 또는 EmptyState 렌더링, 콘솔 에러 없음).

## 2026-07-28 (EPIC-054E)
- **EPIC-054E: EPIC 번호와 프로젝트 진행 단계(Stage) 분리 — 프로젝트 운영 체계 구축(문서/프로세스만, 코드 변경 없음)**
  - **`docs/STAGES.md` 신규**: Stage 1(Foundation) ~ Stage 6(Scale) 6단계 정의. Stage 1(현재 단계)은 지시받은 14개 세부 항목(Navigation/Routing/Authentication/Supabase/Storage/Database/Board System/Page System/Block Editor/SEO/Metadata/Sitemap/Responsive/Accessibility) 각각을 EPIC-054D까지의 실제 코드 상태로 감사해 완료/부분/미착수로 분류 — 10개 완료, 3개 부분 완료, 1개(Block Editor 완전판) 별도 미병합 브랜치(`feature/EPIC-053`)에만 존재함을 명시. Stage 2~6은 "예상 포함 기능"만 기록(착수 전) — 단 Stage 4(Business)는 이 Stage 모델이 생기기 전(EPIC-001~018 무렵)에 이미 예약/결제/Membership/Rental/Styling 대부분이 구현돼 있었다는 점을 정직하게 기록(역행이 아니라 Stage 개념 도입 이전에 비즈니스 기능이 먼저 만들어진 것).
  - **`docs/PROJECT_DASHBOARD.md` 신규**: 지시받은 형식(Project/Current Stage/Progress/Current EPIC/Next EPIC/Recent Completed/Current Priority/Known Issues(P0-P3)/Technical Debt/Next Milestone) 그대로 작성. Known Issues는 EPIC-054D가 이미 P0~P3로 분류해둔 NEXT_TASK.md 항목을 그대로 재사용(중복 발견 대신 재사용). 상세 근거는 이 문서에 복제하지 않고 STAGES.md/EPIC.md/NEXT_TASK.md로 링크.
  - **`PROJECT_BLUEPRINT.md` 갱신**: 새 §11(Project Stages / Project Dashboard) 추가 — Current Stage(Stage 1)/Current Milestone(Stage 1 완료까지 남은 5개 항목) 명시, 두 신규 문서로 링크.
  - **`CLAUDE.md` 갱신**: "세션 시작 시 읽기 순서" 절 신규 — 새 세션 시작 시 `docs/PROJECT_DASHBOARD.md` → `docs/STAGES.md` → `PROJECT_BLUEPRINT.md` 순으로 읽어 프로젝트 상태를 먼저 파악하도록 명시. "Stage와 EPIC은 혼용하지 않는다"는 원칙도 이 절에 명문화. 기존 "Epic 완료 시 문서 갱신" 규칙에 `docs/PROJECT_DASHBOARD.md`/`docs/STAGES.md`를 추가.
  - **범위 밖(지시 반영)**: 이번 EPIC은 문서/프로세스 구축만 — 기능 추가/UI 변경/DB 변경/게시판 변경 전혀 없음. 코드 파일은 한 줄도 수정하지 않음(`type-check`/`lint`는 회귀 확인용으로만 재실행).
  - 문서 동기화: `docs/STAGES.md`(신규), `docs/PROJECT_DASHBOARD.md`(신규), `PROJECT_BLUEPRINT.md`, `CLAUDE.md`, `docs/EPIC.md`, `NEXT_TASK.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint` 재실행 — 코드 변경이 없으므로 EPIC-054D 시점과 동일하게 pre-existing 27건만 존재, 신규 0건.

## 2026-07-28 (EPIC-054D)
- **EPIC-054D: 사이트 전체 Navigation/Routing/SEO/Breadcrumb/404/URL 구조 전수 감사(Audit) — 새 기능/디자인/게시판/Block 생성 없이 감사+리팩토링만**
  - **브랜치 준비**: 이 감사가 사이트의 "현재 상태"를 정확히 반영하려면 아직 미병합인 `feature/EPIC-054A`(placeholder→실페이지 전환)와 `feature/EPIC-054B`(Page Module + Board 연결)가 모두 반영된 코드가 필요해 사용자 확인 후 두 브랜치를 로컬에서 병합한 `feature/EPIC-054D`를 새로 만들어 감사를 진행함.
  - **핵심 발견(P0)**: `src/lib/navConfig.ts`의 `FALLBACK_NAV_TABS`(EPIC-044가 재작성한 `/heritage/*/[name]`·`/community/club/[name]` 동적 구조)와 실제 라이브 `site_navigations`(DB 시드, `docs/navigation-blueprint.md`가 반영하는 구조)가 서로 다른 nav 트리로 공존한다 — 어느 쪽만 보고 감사하느냐에 따라 "죽은 링크"/"orphan 페이지" 목록이 달라지는 근본 원인. 코드에 하드코딩된 링크 자체(FALLBACK_NAV_TABS)만 놓고 보면 깨진 링크는 없으나, 두 구조가 가리키는 대상이 달라 `/shop/heritage/grandma`(정적, EPIC-054A 전환) vs `/heritage/grandma/[name]`(동적, EPIC-044) 같은 **중복 콘텐츠 쌍**이 여럿 존재. 이 이중 구조 통합은 실제 nav 재설계(새 디자인/기능)라 이번 감사 범위 밖 — 별도 EPIC으로 사용자와 논의 필요(NEXT_TASK.md 기록).
  - **SEO(§6/7)**: `src/app/layout.tsx`의 root `metadata`가 create-next-app 스캐폴드 placeholder(`title: "Create Next App"`)를 그대로 쓰고 있었고 70개 페이지 중 단 하나도 `metadata`/`generateMetadata`를 override하지 않아(전수 조사 완료) 전 페이지가 이 값을 상속하고 있었다 — 실제 사이트 정보(title template/description/OpenGraph/Twitter Card)로 교체하고 `metadataBase`(`NEXT_PUBLIC_SITE_URL` env, 없으면 `localhost:3000`) 추가. `lang="en"` → `lang="ko"`로 수정(문서 언어가 실제 콘텐츠와 다르면 스크린리더/검색엔진 모두에 부정확한 신호). 페이지별 metadata는 70개 각각 콘텐츠 작성이 필요한 별도 작업이라 범위 밖(NEXT_TASK.md).
  - **Sitemap(§8) 신규**: `src/app/sitemap.ts` — `src/app` 디렉토리를 직접 스캔해 정적 라우트를 자동 수집(admin/api/mypage/me/settings/login/signup 제외) + `navConfig.ts`의 하드코딩 이름 배열(heritage/community, 이번에 export 처리) 기반 동적 이름 라우트 + Supabase 조회 기반 동적 콘텐츠(boards/items/docent_contents/clubs, 테이블별 개별 try/catch로 하나 실패해도 전체가 깨지지 않음). 파일시스템을 직접 스캔하므로 "새 Page가 추가되면 자동으로 Sitemap에 포함"되는 요구를 코드 유지보수 없이 만족.
  - **robots.txt(§9) 신규**: `src/app/robots.ts` — sitemap.ts와 동일한 기준으로 관리자/마이페이지/개인정보/인증 폼 제외, `Sitemap:` 지시어로 위 sitemap.ts 연결.
  - **Canonical(§10)**: `metadataBase` 추가로 상대 경로 기반 OG/canonical 계산의 기준점은 마련했으나, 페이지별 명시적 `alternates.canonical`은 70개 페이지 전체에 metadata를 붙이는 더 큰 작업이 선행돼야 해 범위 밖(P2, NEXT_TASK.md).
  - **접근성(§13)**: `LeftSidebar.tsx`/`RightSidebar.tsx` — Escape 키로 닫기, 패널이 닫힐 때 트리거 아이콘 버튼으로 포커스 자동 복귀, 닫혀 있을 때 `inert`+`aria-hidden`(스크린리더/Tab 접근 차단), 트리거 버튼에 `aria-expanded`/`aria-controls` 추가. `Navbar.tsx`의 순수 CSS hover 드롭다운(EPIC-041-042-HOTFIX가 의도적으로 JS state를 피한 구조)에 `group-focus-within` 클래스를 추가해 키보드 Tab만으로도 동일하게 열리도록 하고(JS state 재도입 없음), 2차 플라이아웃의 그룹 라벨을 포커스 불가능한 `<div>`에서 포커스 가능한 `<button>`으로 변경(그래야 Tab이 도달해 `focus-within`을 트리거할 수 있음), 드롭다운 트리거에 `aria-haspopup` 추가. Escape로 드롭다운을 닫는 것은 순수 CSS 구조상 구현하지 않음(포커스를 다른 곳으로 옮기면 자연히 닫힘) — P2로 기록.
  - **성능(§12)**: `Navbar.tsx`의 `leftSidebarTab`/`rightSidebarTab`(최대 96개 항목 배열에 대한 `Array.find`)을 `useMemo`로 감쌈. `activeCustomFonts`/`fontFamilyValue`도 시도했으나 이 저장소의 `eslint-config-next`에 포함된 React Compiler 대비 lint 규칙과 충돌(수동 `useMemo` 의존성 배열이 컴파일러 추론과 어긋남 — `next.config.ts`에 `experimental.reactCompiler`는 아직 꺼져 있어 실제 컴파일러 동작 차이는 없음)해 원래 형태로 되돌림, 이유를 주석으로 남김.
  - **범위 밖으로 남겨둔 것(의도적, "새 기능/디자인 추가 금지" 반영)**: Breadcrumb 자동 생성 시스템(현재 19개 정적 페이지만 수동 breadcrumb, 나머지 51개 페이지는 아예 없음 — 사이트 전체에 새로 만들면 명백한 신규 기능이라 구현하지 않고 설계 방향만 NEXT_TASK.md에 기록), Responsive/모바일 전용 레이아웃(Navbar에 반응형 브레이크포인트 자체가 없음 — 새로 만들면 새 디자인이라 구현하지 않음), 이중 nav 구조 통합(위 P0 참고).
  - **검증**: `npx tsc --noEmit`/`npm run lint` 통과(신규/수정 파일 관련 에러 0건). 로컬 dev 서버로 `/sitemap.xml`(admin/api/mypage 등 자동 제외 확인), `/robots.txt`(Disallow 목록+Sitemap 링크 확인), `/`(title이 "사일로 스토어"로 바뀜 확인), 좌측 사이드바 열기→Escape로 닫기→트리거 버튼에 포커스 복귀까지 직접 확인.
  - 문서 동기화: `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`, `NEXT_TASK.md`, `README.md`(`NEXT_PUBLIC_SITE_URL` env 문서화).

## 2026-07-28 (EPIC-054C)
- **EPIC-054C: 모든 Page를 Board와 연결 — Board Module을 실제 게시판 데이터에 연결하고, 한 Page에 여러 Board를 배치**
  - **`src/components/modules/BoardModule.tsx` 신규**: `boardId` 하나만 받아 정의 조회(`resolveBoardDefinition`)+`posts` 조회+Search/Sort/Pagination 상태 관리(250ms 디바운스 포함)+hub 피드 조회까지 전부 스스로 처리하는 자기완결형 모듈. 기존 `src/app/boards/[id]/page.tsx`에만 있던 로직을 그대로 옮긴 것(동작 변경 없음, 리팩터). `definition.boardType`이 뭐든(story/gallery/community/hub/timeline) `BoardRenderer`가 알아서 맞는 레이아웃을 그리므로, Story/Gallery/List/Slide Board 4종 모두 이 컴포넌트 하나로 커버 — `pageModules.ts`의 `BoardModuleProps`도 `{definition, posts, ...}`(EPIC-054B 초안)에서 `{boardId, includeChildBoards?}`로 단순화했다.
  - **핵심 설계 이유**: boardId만 있으면 어디서든 재사용 가능한 자기완결형 컴포넌트라서, 여러 개를 한 Page에 나란히 배치해도 서로의 검색어/정렬/페이지 상태가 섞이지 않는다 — "Page 하나 = Board 하나" 구조를 구조적으로 강제하지 않게 되는 지점. 추후 Block Editor가 "게시판 임베드" 블록을 추가할 때도 이 컴포넌트에 boardId 하나만 넘기면 그대로 연동 가능(지시문의 "자동 연동 가능한 구조 유지" 반영).
  - **`src/app/boards/[id]/page.tsx` 축소**: 170줄짜리 조회/상태 로직을 전부 `BoardModule`로 옮기고, 페이지 자체는 `<BoardModule boardId={id} />` 하나만 렌더링하는 얇은 레이아웃 래퍼로 축소.
  - **`src/app/boards/page.tsx`(디렉토리) 재구성 — 한 Page에 여러 Board를 실제로 배치**: 기존에는 모든 게시판을 뭉뚱그린 단일 "마스터 피드"(`HUB_DEFINITION` + 전체 feed)를 `BoardRenderer`로 한 번만 그렸는데, 이를 제거하고 parent가 없는 최상위 hub(Silo Store/Online Docent/Heritage/Community/Membership/Gallery/Archive/Studio) 하나마다 `slide_board` 모듈을 만들어 `PageModuleRenderer`로 순서대로 렌더링하도록 재구성 — 한 Page 안에 Board 여러 개(최대 8개)가 각자 독립적으로 동작하는 구조를 실제로 증명한다. 아래 "게시판 허브" 바로가기 카드 그리드와 레거시 8개 그룹 링크 목록(자유게시판/패트론 라운지 등)은 게시판 콘텐츠가 아니라 순수 내비게이션이라 Board Module로 바꾸지 않고 그대로 유지.
  - **`src/components/modules/EmptyState.tsx` 신규**: "콘텐츠가 0건"이라는 상태를 위한 공용 컴포넌트(점선 테두리 카드) — `BoardRenderer`의 게시글 0건 분기(기존엔 `<p>아직 게시글이 없어요.</p>` 텍스트만)와 `PageModuleRenderer`의 모듈 0개 분기가 이 컴포넌트 하나를 공유한다. 지시문에 따라 Placeholder Module이 아니라 Empty State UI로 구분.
  - **Search/Sort/Pagination 지원 확인**: `src/lib/boardLayout.ts`의 모든 `story()`/`community()`/`timeline()` 빌더와 8개 legacy `BOARD_DEFINITIONS`(community/story/gallery 계열)는 이미 `searchable`/`sortable`/`pageable`이 전부 `true`(hub 계열만 의도적으로 `false` — 콘텐츠 목록이 아니라 피드 집계 뷰이므로 대상 아님) — 새로 바꿀 필요 없이 `BoardModule`이 이 플래그를 그대로 존중해 Search/Sort/Pagination UI를 표시한다.
  - **브라우저 검증**: 로컬 dev 서버(`npm run dev`)로 `/boards`(모듈 0개일 때 EmptyState 노출 확인, 라이브 DB에 hub 게시판 미시딩 상태라 정상) → 레거시 그룹의 실제 게시판(`자유게시판`) 진입 → 검색/정렬 UI 렌더링 확인 → 검색어 입력 시 결과가 실시간으로 걸러지고 결과 0건일 때 EmptyState가 뜨는 것까지 직접 확인.
  - 문서 동기화: `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`, `NEXT_TASK.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint` 통과(신규/수정 파일 관련 에러 0건 — 기존 27건은 전부 무관한 pre-existing 이슈).

## 2026-07-28 (EPIC-054B)
- **EPIC-054B: Page(화면)와 Board(게시판) 분리 — Page Module 구조 신설 (콘텐츠/Board 생성 없이 타입/렌더러 스캐폴드만)**
  - **조사**: 지시문의 16개 모듈(Hero/Story Board/Gallery Board/List Board/Slide Board/Timeline/Comment/Search/Pagination/Notice/CTA/Form/Calendar/Survey/Ranking/Profile Card) 각각에 대해 재사용 가능한 기존 컴포넌트가 있는지 전수 조사 — 9개는 기존 컴포넌트로 바로 대응 가능(Hero→`HeroSlideshow`, Story/Gallery/List/Slide Board→`BoardRenderer`, Timeline→`TimelineView`, Comment→`CommentSection`, Pagination→`Pagination`), 2개는 컴포넌트가 아니라 `BoardHeader.tsx` 안의 인라인 JSX로만 존재(Search/CTA), 6개는 재사용할 대상 자체가 없음(Notice/Form/Calendar/Survey/Ranking/Profile Card — Ranking은 NEXT_TASK.md EPIC-052 후속에 "구현 안 됨"으로 이미 기록돼 있던 항목과 동일 사안).
  - **`src/lib/pageModules.ts` 신규**: `PageModuleKind`(16종) + 모듈별 props 타입(Board 계열은 기존 `BoardDefinition`/`BoardPost`/`HubFeed`/`HubChildBoard`/`TimelineEntry`/`Comment` 타입을 그대로 import해 재사용, 새 타입 중복 정의 없음) + 판별 유니온 `PageModuleConfig`(`{id, kind, props}`) + `PageDefinition`(`{key, title, modules: PageModuleConfig[]}`). `modules`가 평면 배열이라 "자유롭게 추가/삭제/순서 변경" 요구사항이 표준 배열 연산(push/filter/재정렬)만으로 이미 충족됨 — 별도 트리/우선순위 필드 불필요.
  - **`src/components/modules/PageModuleRenderer.tsx` 신규**: `modules` 배열을 순서대로 순회하며 `kind`별로 기존 컴포넌트에 props를 그대로 전달하는 조합기. Board 계열 4종은 `BoardRenderer`(Board Definition System, EPIC-047)로, Timeline/Comment/Pagination도 각각 기존 컴포넌트로 위임 — 새 레이아웃 로직 없음.
  - **`SearchInput`/`CtaButtons` 추출**(`src/components/modules/`): `BoardHeader.tsx`가 인라인으로 그리던 검색 입력창/CTA 버튼 마크업을 그대로 뽑아낸 컴포넌트로, `BoardHeader.tsx`도 이 두 컴포넌트를 import해서 쓰도록 리팩터(렌더링 결과·클래스 동일, 중복 컴포넌트 생성 금지 원칙 반영).
  - **6개 신규 최소 셸**(`NoticeBanner`/`FormShell`/`CalendarGrid`/`SurveyCard`/`RankingList`/`ProfileCard`, 전부 `src/components/modules/`): 재사용할 기존 컴포넌트가 없는 경우에만 새로 작성 — `docs/design-system.md`의 기존 색상/카드/폼 클래스만 재사용하고, 데이터 조회·저장·검증 로직은 포함하지 않는 순수 프레젠테이션 컴포넌트(예: `SurveyCard`의 `onVote`는 콜백 시그니처만 제공, 투표 집계는 하지 않음).
  - **기존 코드에 `export` 추가(동작 변경 없음)**: `boardLayout.ts`의 `story()`/`community()`/`hub()`/`timeline()` 빌더 4개, `CommentSection.tsx`의 `Comment` 타입 — Page Module이 임시 `BoardDefinition`/댓글 타입을 재사용할 수 있게 하기 위함.
  - **범위 밖(의도적)**: 이 시스템을 사용하는 실제 Page 인스턴스, 콘텐츠, 새 Board 행은 전혀 만들지 않았다 — 어떤 `page.tsx`도 아직 `PageModuleRenderer`를 import하지 않는다. 모듈 추가/삭제/순서를 편집하는 관리자 UI도 범위 밖(`PAGE_MODULE_LABELS`만 향후를 위해 준비).
  - 문서 동기화: `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`, `NEXT_TASK.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint` 통과(신규/수정 파일 관련 에러 0건 — 기존 27건은 전부 무관한 pre-existing `react-hooks/set-state-in-effect` 이슈).

## 2026-07-28 (EPIC-054A)
- **EPIC-054A: 모든 상위/하위 메뉴가 실제 Page를 갖도록 정비 (페이지/URL/레이아웃 생성 + Placeholder 제거까지만)**
  - **인벤토리**: `docs/navigation-blueprint.md`(라이브 `site_navigations` DB 시드 기준 SSoT)를 근거로 사이트 전체 메뉴/서브메뉴를 조사 — `src/components/ComingSoon.tsx`(`"준비 중입니다"`만 렌더링)를 그대로 쓰는 페이지 19개를 확인(사일로 Heritage 할머니/할아버지 2개, 살롱 Community 2개/Membership 5개/Gallery 5개, 스튜디오 물품 대여/공간 스타일링 2개, nav 미연결 orphan 3개 — 투어 도슨트 프로그램/음료 주문/구 공간 촬영 대관). `navConfig.ts`의 `FALLBACK_NAV_TABS`(EPIC-044~053에서 갱신됐으나 라이브 DB에는 아직 시드되지 않은 신규 구조)는 실제 사용자에게 보이는 nav가 아니라고 판단해 대상에서 제외(NEXT_TASK.md에 별도 기록된 기존 nav-wiring gap과 동일 사안, 이번 EPIC 범위 아님).
  - **공용 `PageHeader` 컴포넌트 신규**(`src/components/PageHeader.tsx`, `ComingSoon.tsx` 대체): `title`/`subtitle`/`breadcrumb`/`description` props만 받아 Title(h1)/Subtitle/Breadcrumb(홈 › 상위 탭 › 그룹 › 항목)/Description/Page Container(`max-w-2xl mx-auto`)를 렌더링 — 게시판 연결이나 데이터 조회는 하지 않는 순수 정적 컴포넌트. 지시문에 따라 게시판 연결/기능 추가/Block Editor 수정/Board Module 생성은 하지 않음.
  - **19개 페이지 전환**: 위 placeholder 19개 전부 `<ComingSoon title="...">` → `<PageHeader title=... subtitle=... breadcrumb=[...] description=... />`로 교체. 각 페이지의 breadcrumb은 실제 nav 계층(예: `/salon/gallery/awards` → 홈 › 살롱데상 › Gallery › 시상식)을 그대로 반영. URL/라우팅은 전혀 변경하지 않음(기존 파일 내용만 교체).
  - **`ComingSoon.tsx` 삭제**: 전환 후 참조하는 곳이 없어 완전히 제거(더 이상 쓰이지 않는 컴포넌트를 남겨두지 않음).
  - **404 없음 확인**: `docs/database-schema.sql`의 실제 `site_navigations` 시드 INSERT 문(라이브 반영 확인됨, EPIC-023)에 있는 모든 href를 이번 19개 전환 결과 + 기존 실제 페이지와 대조해 하나도 빠짐없이 실제 `page.tsx`가 존재함을 확인.
  - **범위 밖으로 남겨둔 것(의도적)**: 새로 만든 정적 페이지들은 여전히 실제 데이터/게시판과 연결되어 있지 않다(지시문상 금지) — 예: `/salon/gallery/*`는 이미 Board Definition System(`Gallery` hub, EPIC-050)에 실제 콘텐츠가 있지만 이 정적 페이지들과 연결하지 않음. `navConfig.ts`의 새 Board/Community/Membership/Studio 동적 라우트가 라이브 nav에 아직 연결되지 않은 기존 nav-wiring gap도 그대로 남김.
  - 문서 동기화: `docs/navigation-blueprint.md`, `docs/content-blueprint.md`, `docs/membership-blueprint.md`, `docs/design-system.md`, `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint` 통과(신규 파일 관련 에러 0건 — 기존 lint 에러 27건은 전부 이번 변경과 무관한 pre-existing `react-hooks/set-state-in-effect` 이슈, NEXT_TASK.md에 이미 기록됨). Board Definition System, Block Editor, DB 스키마는 전혀 건드리지 않음.

## 2026-07-28 (EPIC-052)
- **EPIC-052: 마이페이지를 Personal Hub로 확장 + Tiptap Block Editor 도입**
  - **사전 확인(AskUserQuestion)**: 이번 지시문은 두 가지 큰 갈림길이 있어 진행 전 사용자에게 직접 확인함 — (1) "나의 컬렉션"을 Board Definition의 공개 story 게시판으로 만들지, 아니면 지금처럼 비공개(member_collections)로 두고 시각적으로만 story 카드 스타일을 적용할지 → **비공개 유지 + 시각적 재사용**으로 결정. (2) Tiptap/Lexical Block Editor 도입을 이번 EPIC에 포함할지 → **지금 바로 Tiptap 통합 시작**으로 결정. 아래 항목은 전부 이 두 결정을 전제로 한다.
  - **Tiptap Block Editor 도입(엔진 레벨)**: `@tiptap/react`/`@tiptap/starter-kit`/`@tiptap/extension-link`/`@tiptap/extension-placeholder`/`@tiptap/pm`/`isomorphic-dompurify` 추가. `src/components/editor/RichTextEditor.tsx`(굵게/기울임/제목/목록/인용/링크 툴바) 신규 — 특정 게시판 전용이 아니라 `src/app/boards/[id]/write/page.tsx` 단 하나(모든 Board Definition 게시판이 공유하는 글쓰기 폼)에서 textarea를 대체해, 게시판이 몇 개가 늘어도 이 컴포넌트 하나만 재사용된다("향후 수십 개 게시판에서 재사용" 요구 반영).
    - **저장 형식**: `posts.body`는 컬럼 변경 없이 Tiptap의 `getHTML()` 결과(HTML 문자열)를 그대로 저장 — 새 JSON 컬럼을 추가하지 않아 스키마 변경이 필요 없다.
    - **보안(XSS)**: 클라이언트 에디터를 거치지 않고 API를 직접 호출해도 안전하도록 `src/lib/sanitize.ts`(`sanitizeHtml`/`stripHtml`, DOMPurify 기반 허용 태그 화이트리스트)를 만들어 `POST /api/boards/[id]/posts`에서 저장 직전 서버 측 정제를 수행(클라이언트 검증만 믿지 않음). 상세 페이지 렌더링(`PostBody.tsx`)에서도 한 번 더 정제하는 이중 방어.
    - **레거시 호환**: 이전에 plain text로 저장된 글과 새 HTML 글이 같은 컬럼에 섞여 있어, `PostBody.tsx`가 태그 포함 여부(`/<[a-z][\s\S]*>/i`)로 렌더링 방식을 자동 분기(HTML이면 정제 후 렌더링, 아니면 기존처럼 줄바꿈만 유지) — 마이그레이션 스크립트 없이 하위 호환.
    - **목록 요약 수정**: `BoardRenderer.tsx`의 story 카드 요약이 HTML 태그를 그대로 노출하던 문제를 `stripHtml()`로 수정.
  - **"나의 컬렉션"을 story 카드로 시각적 통일**: `src/components/boards/StoryCard.tsx` 신규(공용 프레젠테이션 컴포넌트) — `BoardRenderer.tsx`의 story 레이아웃과 마이페이지 `CollectionCategoryPanel.tsx`가 이 컴포넌트 하나를 공유(중복 UI 없음). `member_collections`/`orders`(나의 보물) 스키마·공개 범위는 전혀 바꾸지 않음 — 여전히 본인만 보는 비공개 데이터.
  - **Timeline Engine 추출 + 실제 재사용**: 기존 "타임라인" 게시판(`BoardRenderer.tsx`) 안에 갇혀 있던 연/월 그룹핑 로직을 `src/lib/timelineEngine.ts`(`groupByYearMonth`)+`src/components/TimelineView.tsx`(공용 렌더러)로 분리 — 게시글이 아닌 마이페이지 활동 로그도 "정렬된 `{id, createdAt}` 목록"만 맞추면 그대로 재사용 가능. `/mypage/timeline`(`TimelinePanel.tsx`)이 이를 실제로 사용해 `points_ledger`(글 작성/댓글/좋아요 받음/개념글 승격/상점 구매·대여/공간 대관/클럽 참여/출석)+`likes`(내가 준 좋아요)+`member_follows`(팔로우)를 종합 표시 — 새 활동 로그 테이블 없이 기존 3개 테이블만 조합.
  - **PlaceholderPanel 4개를 실제 데이터로 교체**("단순 Placeholder 페이지를 만들지 않는다" 반영):
    - **나의 살롱**(`SalonPanel.tsx`): `reservations`(클럽 예약)+`salon_checkins`(체크인)+`daily_checkins`(출석)+`poll_votes`(설문 참여) 4개 기존 테이블 종합.
    - **나의 도슨트 수료증**(`DocentCertificatePanel.tsx`): 별도 수료증/진행률 테이블이 없어(스키마 추측 금지) 결제 확정된 `docent_purchases`를 "수료 완료"로 재해석 — 진행률(%)은 강의 모듈 개념 자체가 없어 표시하지 않고 완료/대기 건수만 표시.
    - **나의 공간**(`SpacePanel.tsx`): `rental_bookings`(대관 예약)를 그대로 조회. 스타일링은 고객 신청을 기록하는 테이블이 없어(`styling_projects`는 관리자 포트폴리오) Studio 게시판으로 안내하는 링크만 제공.
    - **나의 전시회**(`ExhibitionPanel.tsx`): 전용 전시 테이블 없이 기존 마이피드 API(`GET /api/members/[memberId]/posts`, `board_id IS NULL` 개인 글)를 재사용해 사진 있는 글만 필터링 — 새 쿼리/테이블 없음.
  - **기존 실제 기능 강화**: `CommentsPanel.tsx`에 "원글 이동" 링크 추가(select에 `post_id`/`board_id` 확장) + 원글 좋아요 수 표시. `BadgesPanel.tsx`에 보유 배지 수 표시 — "전체 랭킹"/"다음 배지 진행률"은 (1) `member_badges`가 본인 행만 읽는 RLS라 다른 회원과의 비교를 클라이언트에서 계산할 수 없고 (2) 배지 획득 조건을 정의하는 규칙 테이블이 없어 보류(NEXT_TASK.md). `FollowPanel.tsx`는 "향후 알림 시스템 연동 가능하도록 설계" 요구를 `member_follows`의 기존 follower/following 분리 구조가 이미 충족한다고 보고 주석으로만 문서화(코드 변경 없음).
  - **버킷리스트(신규 기능)**: `member_bucket_list`(연도/제목/완료 여부, own-row 전용) 신규 테이블 + `BucketListPanel.tsx`(추가/체크/삭제, 연도별·전체 완료율) + `/mypage/bucketlist` 라우트 — `mypageConfig.ts`의 `MYPAGE_TABS`에 탭 추가(기존 11개 탭 순서/URL 변경 없음).
  - **DB(신규 1테이블)**: `member_bucket_list`. 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260728-0100.sql`로 백업. 그 외 스키마는 전부 기존 재사용(신규 컬럼/제약 변경 없음).
  - 기존 URL/라우트 전부 유지 — `/mypage/*` 11개 경로 그대로, `/mypage/bucketlist` 1개만 추가. 게시판 쪽(`/boards/**`)도 라우팅 변경 없음(글쓰기 폼 내부 컴포넌트만 교체).
  - 문서 동기화: `docs/database-schema.sql`, `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`.
  - 검증: `npx tsc --noEmit` 통과. `npm run lint` 27건(기존 26건 + 신규 1건) — 신규 1건은 `BucketListPanel.tsx`의 `set-state-in-effect`로, 이미 저장소 전반에 퍼진 동일 클래스의 pre-existing P2 이슈와 같은 성격(CLAUDE.md 에러 트리아지 정책상 기능을 막지 않음, NEXT_TASK.md 기록). 다른 세션이 3000번 포트를 점유 중이고 `member_bucket_list` 시드도 라이브 미적용이라 브라우저로 Tiptap 에디터 실제 타이핑/버킷리스트 CRUD/각 패널의 실데이터 렌더링을 확인하지 못함 — 사용자 확인 필요(NEXT_TASK.md 참고).

## 2026-07-27 (EPIC-051)
- **EPIC-051: Studio(공간 문의) 게시판 생성 + 기존 예약 Flow 연동(BoardDefinition.ctas)**
  - Board Definition System으로 게시판 5개(전부 신규 DB 행)를 추가 — 최상위 hub `Studio`(Silo Store/Online Docent/Heritage/Community/Membership/Gallery/Archive와 형제) + 하위 4개 story 게시판: `공간 촬영 대관(1층)`(studio-1f)/`공간 촬영 대관(2층)`(studio-2f)/`물품 대여`(rental)/`공간 스타일링`(styling).
  - **`BoardDefinition`에 `ctas` 필드 추가**: `{label, href}[]` — "문의하기"/"예약하기" 같은 액션 버튼을 config로 지정하면 `BoardHeader`가 그대로 링크 버튼으로 렌더링한다. **새 예약 시스템/컴포넌트를 전혀 만들지 않고**, 이미 있는 실제 페이지로만 연결: `studio-1f`→`/rental?floor=1f_silostore`, `studio-2f`→`/rental?floor=2f_salon`, `rental`→`/space-inquiry/item-rental`, `styling`→`/shop/projects`(대표 프로젝트) + `/space-inquiry/styling`(문의/신청). 세 페이지 모두 기존에 실제로 존재하는 라우트임을 코드로 직접 확인 후 연결.
  - **"문의하기"/"예약하기"가 같은 페이지로 연결되는 이유(판단 필요 사항)**: 이 프로젝트에는 예약과 별개인 "단순 문의" 전용 채널이 없다 — 새 시스템을 만들지 않기 위해(주의사항) 두 버튼을 지시대로 둘 다 표시하되, 둘 다 같은 실제 예약/문의 Flow(`/rental?floor=...`, `/space-inquiry/*`)로 연결했다. 별도의 문의 전용 폼이 필요하면 사용자 확인 후 별도 작업 필요.
  - **"공간 스타일링"의 "대표 프로젝트"/"프로젝트 슬라이드" 처리(판단 필요 사항)**: 지시대로 `styling_projects`용 새 DB/컴포넌트를 만들지 않고, 이미 그 테이블을 그대로 조회해 보여주는 기존 `/shop/projects`(목록, industry 필터) 페이지를 `ctas`의 "대표 프로젝트 보기" 링크로 재사용했다 — `styling` 게시판 자체는 소개/절차 등 일반 콘텐츠(posts)만 담당.
  - **hub 슬라이드에 대표 이미지 표시(EPIC-051, 이 EPIC에서만 추가된 개선)**: `Studio` hub가 "최신 포트폴리오/대표 이미지/추천 콘텐츠"를 슬라이드로 보여줘야 해서, `HubFeedItem`에 `photo_url` 필드를 추가하고 `/api/boards/feed`가 이를 select+반환하도록, `FeedSlide`(BoardRenderer.tsx)가 있으면 썸네일을 렌더링하도록 확장 — 기존 hub(Silo Store 등)는 `photo_url`이 없는 글도 많아 하위 호환(썸네일 없으면 기존처럼 텍스트만).
  - **"모든 Studio 서비스에 공통" 목록이 이전 EPIC들보다 짧은 점(판단 필요 사항)**: 지시문의 "공통" 목록(검색/정렬/페이지네이션/공유/북마크/좋아요/태그)에 글쓰기 버튼/댓글/조회수/작성자/작성일/수정일이 빠져 있었지만, "실제 콘텐츠를 등록하고 운영할 수 있도록"이라는 상위 목표와 모순되지 않도록 글쓰기(공간 소개/이용 안내/FAQ 등록 수단)는 유지했다 — 나머지(댓글/조회수 등)도 기존 `story()` 헬퍼 그대로 켜져 있어 다른 story 게시판과 동일하게 동작(제외하라는 명시적 지시는 없었다고 판단).
  - DB(신규 5행): `board_type='topic'` 재사용, `category`에 slug. 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-2205.sql`로 백업.
  - **재사용한 기존 기능**: `/rental`+`rental_types`+`rental_bookings`(공간 대관 예약), `/space-inquiry/item-rental`·`/space-inquiry/styling`(기존 문의 placeholder 페이지), `/shop/projects`+`styling_projects`(스타일링 포트폴리오) — 전부 코드/스키마 변경 없이 링크만 추가.
  - 기존 게시판(그룹 8종 + EPIC-048~050의 68개)의 동작은 변경 없음. 기존 라우팅과 URL 전부 유지.
  - 문서 동기화: `docs/database-schema.sql`, `docs/content-blueprint.md`, `docs/navigation-blueprint.md`, `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, EPIC-050과 동일 — 신규 이슈 없음) 통과. 다른 세션이 3000번 포트를 점유 중이고 DB 시드도 라이브 미적용이라, 브라우저로 실제 문의/예약 버튼 클릭 이동과 hub 썸네일 노출을 확인하지 못함 — 사용자 확인 필요(NEXT_TASK.md 참고).

## 2026-07-27 (EPIC-050)
- **EPIC-050: Salon des Cent Membership/Gallery/Archive 게시판 생성 + Timeline Engine + 실제 인가 연결**
  - Board Definition System으로 게시판 17개(전부 신규 DB 행)를 추가 생성 — 새 페이지/컴포넌트 없이 `src/lib/boardLayout.ts`에 정의만 추가. 구조: 최상위 hub 3개(`Membership`/`Gallery`/`Archive`, Silo Store/Online Docent/Heritage/Community와 형제). `Membership` 하위 6개(나의 보물 이야기 story/나의 아티스트 소개/마음일기/패트론 게시판/한문장 소설 프로젝트/비밀의 방 도슨트). `Gallery` 하위 5개 story(시상식/공연들/파티/운명의 방문자들/패트론들). `Archive` 하위 3개(소개지 story/포스터 story/타임라인 timeline).
  - **5번째 boardType "timeline" 추가**: `BoardLayoutType`에 `"timeline"` 추가하고 `BoardRenderer.tsx`에 `TimelineView`+`groupPostsByYearMonth`를 실제 구현(연→월→일 순 그룹핑, 반응형). **Timeline Engine은 독립 컴포넌트가 아니라 BoardRenderer.tsx 내부의 재사용 가능한 함수**로 유지 — "정렬된 `{created_at, title, ...}` 목록"에만 의존하므로, 향후 마이페이지 타임라인 탭(현재 `PlaceholderPanel`)이 같은 그룹핑 로직을 그대로 가져다 쓸 수 있는 구조(이번 EPIC에서 mypage 쪽 연동까지 하지는 않음 — NEXT_TASK.md 참고).
  - **`accessLevel` 필드 추가 + "패트론 게시판"에 실제 인가 연결(판단 필요 사항)**: `BoardDefinition`에 `accessLevel?: "patron" | "secret_room"` 추가. 지시문이 "패트론 게시판"엔 "멤버십 권한 적용"(현재형, 적용하라는 지시)이라 표현한 반면 "비밀의 방 도슨트"엔 "accessLevel만 지정"(구조만 유지하라는 지시)이라고 구분해서 표현한 것으로 판단해, 두 게시판을 다르게 처리했다:
    - **패트론 게시판**: `src/lib/serverAuth.ts`의 `canReadBoard`/`canWriteToBoard`를 확장해 `resolveBoardDefinition(board).accessLevel === "patron"`이면 실제 `board_type`(재사용한 `'topic'`)과 무관하게 `membership_tiers.board_has_patron_board` 플래그로 읽기/쓰기 모두 막는다 — board_type 하나만 보고 게이팅하던 기존 로직의 사각지대(새 게시판이 다 `'topic'`을 재사용하다 보니 패트론 전용으로 만들 방법이 없었음)를 config 기반으로 메운 것. 기존 8개 그룹(특히 원본 `patron` board_type 게시판)의 동작은 그대로.
    - **비밀의 방 도슨트**: `accessLevel:"secret_room"`만 지정하고 `canReadBoard`/`canWriteToBoard`에는 아무 분기도 추가하지 않음 — 지금은 다른 일반 게시판과 동일하게 전체 공개(구조만 준비, 실제 시험/권한 로직은 `salon_rooms`/`salon_room_access`와의 연동 여부를 사용자와 논의 후 진행, NEXT_TASK.md 참고).
  - **"단순 Placeholder를 만들지 않는다" 확인**: 이 17개 게시판은 다른 EPIC-047~049 게시판과 동일하게 실제 `posts`/`comments`/`likes`/`post_bookmarks` 테이블 기반으로 글쓰기·좋아요·댓글·북마크·태그·검색·정렬·페이지네이션이 전부 즉시 동작한다 — UI만 있는 정적 화면이 아니라 실제 서비스 가능한 게시판(단, 아래 "구조만 유지" 항목들은 예외).
  - **"Gallery" 5개는 기존 ComingSoon 페이지와 같은 주제(판단 필요 사항)**: `docs/content-blueprint.md`에 "전부 미구현(ComingSoon)"으로 기록돼 있던 `/salon/gallery/{awards,performances,parties,visitors,patrons}` 5개 서브페이지와 동일한 주제를 이번에 실제 게시판으로 구현했다. 지시문에 기존 페이지를 대체/연결하라는 내용이 없고 "새 React 페이지 생성 금지"만 있어, **기존 ComingSoon 페이지 자체는 건드리지 않았다** — 실제 콘텐츠는 새 `/boards/[id]` 게시판이 담당하고, 내비게이션 연결은 별도 작업으로 남김(NEXT_TASK.md 참고).
  - **"나의 보물 이야기"/"패트론 게시판"의 실제 데이터 연동은 하지 않음**: 지시문의 "연동 가능한 구조를 유지한다"를 "지금 연동하라"가 아니라 "나중에 연동할 여지를 남겨두라"로 해석 — 마이페이지 컬렉션, 등급 시스템 어느 쪽도 이 게시판들의 `posts`와 실제로 조인/동기화하지 않는다.
  - **DB(신규 17행)**: 전부 새 게시판이라 재사용할 기존 행이 없음(EPIC-049와 달리) — `board_type='topic'` 재사용, `category`에 slug. 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-2155.sql`로 백업.
  - 기존 게시판(그룹 8종 + EPIC-048/049의 51개)의 동작은 변경 없음. 기존 라우팅과 URL 전부 유지.
  - 문서 동기화: `docs/database-schema.sql`, `docs/content-blueprint.md`, `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, EPIC-049와 동일 — 신규 이슈 없음) 통과. 다른 세션이 3000번 포트를 점유 중이고 DB 시드도 라이브 미적용이라, 브라우저로 타임라인 렌더링/패트론 게시판 실제 잠금 동작을 확인하지 못함 — 사용자 확인 필요(NEXT_TASK.md 참고).

## 2026-07-27 (EPIC-049)
- **EPIC-049: Salon des Cent Community 영역 게시판 생성 — Board Definition만 추가**
  - Board Definition System(EPIC-047/048)을 재사용해 Community 영역 게시판을 생성 — 새 페이지/컴포넌트 없이 `src/lib/boardLayout.ts`의 `INDIVIDUAL_BOARD_DEFINITIONS`에 정의 31개(신규 게시판 정의) 추가. 구조: 최상위 hub `Community`(Silo Store/Online Docent/Heritage와 형제) 아래 `출석체크/예술가의 달력`(attendance)·`자유게시판`(free)·`주제별 소통 게시판`(salon-topics, hub)·`요일별 클럽`(salon-weekday, hub)·`월별 모임`(monthly-salon)·`설문 [우리들 맴]`(survey, hub)·`공연/전시회 소개`(events, story)·`이벤트 공지`(notice, story)·`Q&A 고민 게시판`(qna) 9개, 그 아래 `salon-topics`의 자식 13개(경제/예술/세계역사/과학/코메디/문학/건강/정치/영화/심리/스포츠/인간 집사들/따듯한 세상 클럽)와 `salon-weekday`의 자식 7개(월요반란/책 낭송/행간의 조각가/놀아보자 영어클럽/비포 선라이즈/무슨일이든 일어날수있어/연극이 끝나고 난 뒤).
  - **"기존 DB 최대 재사용"을 문자 그대로 적용(판단 필요 사항)**: 13개 클럽 + 7개 요일별 모임방은 EPIC-018 이전부터 이미 `boards`에 시딩돼 있던 진짜 board_type='topic'/'group' 행이라, **새 DB 행을 만들지 않고** 기존 `category` 값(economy/art/history/.../mon/tue/.../sun)을 그대로 slug로 참조하는 개별 `BoardDefinition`만 추가했다. `resolveBoardDefinition()`은 개별 slug 매칭을 그룹 매칭보다 먼저 시도하므로, 이 20개 게시판은 이제 기존 "클럽 주제 게시판"/"모임별 게시판" 그룹 대신 `salon-topics`/`salon-weekday` hub의 자식으로 재분류된다 — DB 행/URL은 완전히 그대로지만, `/boards` 최상위 디렉토리의 평면 그룹 목록에서는 빠지고(같은 항목이 두 곳에 중복 표시되지 않도록) `Community → 주제별 소통 게시판`/`Community → 요일별 클럽` hub를 통해서 찾게 된다(시각적 재구성, 데이터 변경 없음).
  - **신규 DB 행은 10개뿐**: `community`/`attendance`/`free`/`salon-topics`/`salon-weekday`/`monthly-salon`/`survey`/`events`/`notice`/`qna` — `board_type='topic'` 재사용, `category`에 slug. 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-2145.sql`로 백업.
  - **"category='qna'" 신규 게시판과 기존 "질문과 답변"(board_type='qna', category=null) 게시판은 서로 다른 별개 게시판이다** — 지시문이 Community 하위에 별도의 "Q&A 고민 게시판"을 요구해 slug 문자열이 우연히 같을 뿐, `resolveBoardDefinition()`은 `category`가 null인지 여부로 정확히 구분한다(충돌 없음, 코드로 직접 확인).
  - **"출석 체크"/"오늘의 예술가·음악가·..." 및 "각 모임방 추가 기능"(주간 참석 신청/참석 버튼/참석 인원 표시/주간 일정 표시) 처리(판단 필요 사항)**: 새 컴포넌트를 만들지 않기 위해(BoardRenderer만 사용 원칙) 전용 UI를 구현하지 않고, 각 게시판 설명(`description`)에 의도만 기록 — 실제 콘텐츠는 해당 게시판에 일반 글(제목/본문/태그)로 작성하는 방식으로 대체한다. 기존 `/attendance`(`daily_checkins`)나 `club_sessions`/`reservations`와는 별개 시스템이며 연동하지 않음(지시문의 "배지/포인트 연동 가능하도록 구조 유지"는 지금 당장 연동하라는 뜻이 아니라 향후 확장 여지만 남겨두라는 의미로 해석).
  - **"설문 [우리들 맴]"(survey, hub) 처리(판단 필요 사항)**: "설문 카드/종료일/참여자 수/진행중·종료" 전용 카드 UI는 새 컴포넌트가 필요해 구현하지 않고 표준 hub 레이아웃만 적용. 지시문에 이 hub의 하위 게시판이 명시돼 있지 않아 자식 게시판 없이 생성(하위 설문 게시판이 추가되면 자동으로 피드에 집계됨).
  - `/boards`(최상위 디렉토리)의 "게시판 허브" 바로가기 섹션이 `parent === null`인 hub만 보이도록 필터 수정 — Community 하위의 중첩 hub(salon-topics/salon-weekday/survey)까지 평면으로 다 나열되면 산만해지므로, 최상위 4개 hub(Silo Store/Online Docent/Heritage/Community)만 노출하고 중첩 hub는 각자의 부모 hub 카드를 통해 접근한다.
  - 기존 게시판(그룹 8종 + EPIC-048의 20개)의 동작은 변경 없음. 기존 라우팅과 URL 전부 유지.
  - 문서 동기화: `docs/database-schema.sql`, `docs/content-blueprint.md`, `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, EPIC-048과 동일 — 신규 이슈 없음) 통과. 다른 세션이 3000번 포트를 점유 중이고 DB 시드도 라이브 미적용이라 브라우저로 실제 노출을 확인하지 못함 — 사용자 확인 필요(NEXT_TASK.md 참고).

## 2026-07-27 (EPIC-048)
- **EPIC-048: Silo Store 실제 게시판 20개 생성 — Board Definition만 추가**
  - EPIC-047에서 구축한 Board Definition System을 실제로 사용해 게시판 20개(hub 3개: Silo Store/Online Docent/Heritage, story 17개: 사일로 보물들/보물 목록/입양신청서 라이브러리/분양 후기/시대별 11개(르네상스~디지털)/Grandmas/Grandpas)를 생성. **새 React 페이지/컴포넌트를 만들지 않고**, `src/lib/boardLayout.ts`에 `INDIVIDUAL_BOARD_DEFINITIONS` 레지스트리(개별 게시판 20개 config)만 추가하고 기존 `/boards/[id]` 라우트+`BoardRenderer`가 그대로 소화하도록 함.
  - **개별 게시판 slug 매칭(스키마 변경 없이 처리, 판단 필요 사항)**: `boards.board_type`에 새 값을 추가하려면 CHECK 제약을 ALTER해야 해서(스키마 변경 최소화 원칙에 반함), 기존 `board_type='topic'`을 그대로 재사용하고 이미 자유 텍스트인 `category` 컬럼에 각 게시판의 slug(`treasures`/`items`/`renaissance`/`grandmas` 등)를 담았다. `resolveBoardDefinition()`이 `category`를 개별 slug 레지스트리에서 먼저 찾고, 없으면 기존 8개 그룹 로직으로 폴백 — 기존 게시판 동작에 영향 없음.
  - **BoardRenderer가 hub를 실제로 렌더링하도록 확장**: 이전(EPIC-047)에는 `hub`를 community로 대체 렌더링하는 자리표시자였는데, 이번에 `HubView`(최신글/인기글/추천글 슬라이드 3개 + 하위 게시판 카드)를 실제로 구현 — `BoardRenderer`가 `hubFeed`/`hubChildBoards` prop을 받아 그린다. `/boards/[id]/page.tsx`는 게시판이 hub면 `/api/boards/[id]/posts` 대신 `/api/boards/feed?parent=<slug>` + `/api/boards`(자식 필터)를 불러오도록 분기(같은 파일 안에서 분기 — 새 페이지 없음).
  - **최상위 `/boards`도 BoardRenderer로 통일**: 기존에 `/boards/page.tsx`가 자체적으로 갖고 있던 `FeedCardRow`/`FeedList`(중복 컴포넌트)를 제거하고 `BoardRenderer`(hub 케이스)를 그대로 재사용 — "BoardRenderer만 사용한다" 지시를 프로젝트 전체에 일관 적용. 그룹별 게시판 디렉토리(8개 그룹) 섹션은 그대로 유지하고, 새로 생긴 3개 hub로 이동할 수 있는 "게시판 허브" 바로가기 섹션을 추가.
  - **`/api/boards/feed`에 `?parent=<slug>` 필터 추가**: 파라미터가 없으면 기존처럼 전체 게시판 대상(최상위 `/boards`용), 있으면 그 slug를 부모로 둔 자식 게시판만 집계(Silo Store/Online Docent/Heritage 개별 hub용).
  - **"보물 목록(items)"의 "카테고리 필터" 처리(판단 필요 사항)**: 새 필터 UI 컴포넌트를 만들지 않기 위해(중복 컴포넌트 생성 금지), 이미 있는 검색(제목/본문/작성자/태그) 기능을 그대로 활용 — 글쓰기 시 물품 카테고리를 태그로 등록하면 검색창에 그 카테고리명을 입력하는 것이 곧 필터 역할을 한다. 전용 드롭다운 필터가 필요하면 별도 확인 필요.
  - **DB(최소 변경, board_type CHECK 제약 그대로 유지)**: `boards`에 새 행 20개 INSERT(`board_type='topic'`, `category`=slug) — 라이브 미적용, Supabase SQL Editor에서 직접 실행 필요. 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-2132.sql`로 백업.
  - 기존 8개 게시판 그룹의 동작(검색/정렬/페이지네이션/좋아요/댓글/북마크/태그)은 변경 없음. 기존 라우팅과 URL 전부 유지.
  - 문서 동기화: `docs/database-schema.sql`, `docs/content-blueprint.md`, `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`.
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, EPIC-047과 동일 — 신규 이슈 없음) 통과. 다른 세션이 3000번 포트를 점유 중이라 브라우저로 hub 슬라이드/하위 게시판 카드/신규 20개 게시판 목록 노출을 직접 확인하지 못함 — 사용자 확인 필요(NEXT_TASK.md 참고). 또한 DB 시드가 라이브에 아직 없어, 실행 전까지는 신규 20개 게시판이 실제로 화면에 보이지 않는 것이 정상.

## 2026-07-27 (EPIC-047)
- **EPIC-047: Common Board Engine — BoardRenderer 기반 community/story/gallery/hub**
  - 게시판별로 화면을 개별 구현하지 않도록, `src/lib/boardLayout.ts`의 `getBoardLayoutType(board_type)`이 기존 8종 `board_type`(등급/쓰기 권한 축, 그대로 유지)을 화면 레이아웃 3종으로 매핑하고, `BoardRenderer.tsx`가 그 값 하나로 community(목록형)/story(카드형+썸네일)/gallery(이미지 중심 Masonry) 중 하나를 렌더링한다. `/boards/[id]` 라우트 하나가 모든 게시판을 처리하므로 "동일 컴포넌트 공유"가 아키텍처상 자동 보장됨.
  - **매핑 판단(스키마 변경 없이 처리, 판단 필요 사항)**: 전용 `display_type` 컬럼을 추가하는 대신 기존 `board_type`에서 코드로 파생 — `adoption_story`→story(대표 이미지+요약이 있는 후기 성격), `archive`→gallery(자료게시판=이미지/첨부 위주로 가정), 나머지(topic/group/patron/artist_promo/qna)→community. `/boards`(게시판 디렉토리)는 특정 게시판이 아니라 네 번째 레이아웃 `hub`로 취급 — 하위 게시판 전체의 최신글/인기글/추천글을 슬라이드+카드로 종합 표시.
  - **공통 기능**: 검색(제목/내용/작성자/태그, `GET /api/boards/[id]/posts?q=`), 정렬 5종(최신순/인기순/조회순/댓글순/오래된순, `?sort=`), 페이지네이션(10개 단위, 페이지 번호 최대 10개 블록 — `Pagination.tsx`), 글쓰기 버튼(`BoardHeader`, 기존 유지), 좋아요(기존 유지), 조회수(`posts.view_count`, 상세 조회마다 +1), 댓글수(목록 API가 매 요청 시 집계), 태그(`posts.tags`, 글쓰기 폼에 쉼표 구분 입력 필드 추가), 공유(현재 URL 클립보드 복사, 서버 연동 없음), 북마크(`post_bookmarks` 신규 테이블, own-row 토글), 작성일/수정일(`updated_at` 추가 — 게시글 수정 기능 자체가 없어 현재는 항상 `created_at`과 동일), 작성자 프로필(게시글 작성자 + 댓글 작성자 모두 `/u/[memberId]`로 링크).
  - **"추천글" 처리(판단 필요 사항)**: hub의 "추천글"에 대응하는 별도 플래그가 없어, 이미 "좋아요 10개 이상으로 승격"되는 기존 `is_best`(개념글) 플래그를 추천글로 재해석해 사용(`GET /api/boards/feed`) — 새 컬럼을 추가하지 않음.
  - **신규 파일**: `src/lib/boardLayout.ts`(레이아웃 매핑+타입+정렬 옵션), `src/components/boards/{BoardRenderer,Pagination,PostActions}.tsx`(신규), `PostDetailHeader.tsx`/`CommentSection.tsx`/`BoardHeader.tsx`(EPIC-046에서 확장), `src/app/api/boards/[id]/posts/[postId]/bookmark/route.ts`, `src/app/api/boards/feed/route.ts`.
  - **DB(최소 변경)**: `posts`에 `view_count`(int, default 0), `tags`(text[], default '{}'), `updated_at`(timestamptz, default now()) 3개 컬럼 추가. 신규 테이블 `post_bookmarks`(wishlists와 동일한 own-row 패턴). 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-2050.sql`로 백업. `view_count` 갱신을 위한 `posts` 컬럼별 GRANT 확장(`like_count, is_best` → `like_count, is_best, view_count`)도 문서화(라이브 미적용, Supabase SQL Editor에서 직접 실행 필요 — `docs/database-schema.sql` RLS 섹션 TODO 참고).
  - **마이그레이션 전에도 안 깨지도록 방어적으로 구현**: 새 컬럼(`tags`/`view_count`/`updated_at`)이 라이브 DB에 없으면 PostgREST가 select 전체를 42703으로 실패시키므로, 목록/상세 조회와 글쓰기(태그 insert) 모두 "새 컬럼 포함 시도 → 실패 시 레거시 컬럼으로 재시도"하는 폴백을 넣어 마이그레이션 전에도 게시판 읽기/쓰기 자체는 계속 동작한다(태그/조회수만 0/빈 배열로 보임). `post_bookmarks`가 없을 때도 북마크 버튼은 503 안내만 뜨고 나머지 기능에는 영향 없음.
  - 기존 좋아요/댓글/글쓰기/등급 게이팅 로직은 변경하지 않음. 기존 라우팅과 URL 전부 유지(`/boards`, `/boards/[id]`, `/boards/[id]/write`, `/boards/[id]/[postId]`).
  - 문서 동기화: `docs/database-schema.sql`, `docs/design-system.md`(§10 확장), `docs/content-blueprint.md`(§1 확장), `PROJECT_BLUEPRINT.md`, `docs/EPIC.md`(EPIC-022~047 그동안 누락된 항목 일괄 보충 — 여러 세션에 걸쳐 CLAUDE.md 규칙에도 불구하고 갱신되지 않고 있었음).
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, EPIC-046과 동일 — 신규 이슈 없음) 통과. 다른 세션이 3000번 포트를 점유 중이라 브라우저로 실제 검색/정렬/페이지네이션/북마크/공유 동작을 직접 확인하지 못함 — 사용자 확인 필요(아래 NEXT_TASK.md 참고).

- **EPIC-047 Part 2: Board Definition System — config만으로 게시판을 정의하는 구조로 전환**
  - 위 Part 1의 `getBoardLayoutType(board_type)` 1줄짜리 매핑 함수를, 지시받은 필드(`id/slug/title_ko/title_en/parent/boardType/visibility/membership/searchable/pageable/sortable/thumbnail/comments/likes/bookmarks/tags/allowPosting/defaultSort/pageSize/description`)를 모두 갖춘 `BoardDefinition` 타입 + `BOARD_DEFINITIONS`(8개 그룹: general/topic/group/patron/artist_promo/adoption_story/archive/qna) 레지스트리로 전면 교체(`src/lib/boardLayout.ts`). `resolveBoardDefinition({board_type, category})`가 DB의 `boards` 행 하나를 정의 하나로 해석한다. 새 게시판 "종류"를 추가할 때는 (1) `boards`에 해당 board_type 시드 행 추가 (2) 이 레지스트리에 정의 한 항목 추가만 하면 되고, 페이지/컴포넌트 코드는 그대로 — 지시문의 "Community/자유게시판/경제클럽/예술클럽/Heritage/Renaissance/Gallery/Membership/My Collection처럼 config만 추가하면 자동 생성" 요구를 만족하는 구조. 이번 EPIC에서는 지시대로 새 게시판을 실제로 추가하지는 않음(기존 8개 정의만 구축).
  - **하드코딩 제거**: `boards/page.tsx`의 그룹 판별 로직이 각 그룹마다 손으로 짠 `match()` 함수 배열(`GROUP_LABELS`)이었던 것을, `BOARD_GROUP_ORDER` + `resolveBoardDefinition()` 하나로 대체 — 이 resolver를 hub 그룹핑, 목록/상세/글쓰기 API, 목록/상세/글쓰기 페이지가 전부 공유하므로 그룹 판정 로직이 한 곳에만 존재한다.
  - **BoardRenderer/BoardHeader가 정의를 직접 읽어 동작**: `BoardRenderer`는 `layoutType` 대신 `definition` 전체를 받아 `definition.boardType`으로 community/story/gallery를 고른다. `BoardHeader`는 `definition.searchable`/`sortable`/`allowPosting`이 꺼져 있으면 검색창/정렬 셀렉트/글쓰기 버튼 자체를 렌더링하지 않는다(이전엔 prop 존재 여부로만 판단해 사실상 모든 게시판에서 항상 켜져 있었음). 목록 API(`GET /api/boards/[id]/posts`)도 `definition.pageable`이 꺼지면 페이지네이션 없이 전체를 반환하고, `definition.pageSize`/`defaultSort`를 하드코딩된 `10`/`"latest"` 대신 실제로 사용한다(예: `archive`는 `pageSize:20`으로 설정해 갤러리에 더 많은 썸네일이 한 번에 보이도록 함 — 값이 실제로 동작에 반영됨을 보여주는 예시).
  - **좋아요/북마크/댓글/태그도 토글 기반**: 상세 페이지가 `definition.likes`/`bookmarks`/`comments`/`tags`를 읽어 해당 UI(`PostActions`의 `showLike`/`showBookmark`, `CommentSection` 렌더 여부, 태그 표시/입력)를 켜고 끈다 — 지금은 `qna`만 `tags:false`이고 나머지는 기존과 동일하게 전부 켜져 있어 **기존 8개 게시판의 실제 동작은 바뀌지 않음**(토글 배선만 새로 생김).
  - **하드코딩된 등급 안내 문구 제거**: 3개 API 라우트(`boards`, `boards/[id]/posts`, `boards/[id]/posts/[postId]`)에 각각 반복돼 있던 `RANK_LABELS[3]`(patron 등급 고정 가정) 잠금 안내 문구를, `RANK_LABELS[definition.membership]`로 대체 — 실제 읽기 인가(`canReadBoard`/`canWriteToBoard`, `membership_tiers`의 boolean 플래그 기반)는 보안 변경 없이 그대로 두고, `membership` 필드는 어디까지나 안내 문구 생성용 메타데이터로만 사용(주석에 명시).
  - **미배선 필드**: `visibility`/`parent`는 타입/레지스트리에 존재하지만 아직 어떤 동작도 참조하지 않는 예약 필드(현재 이 프로젝트에 "비공개 게시판"이나 게시판 간 실제 계층 구조 개념이 없음) — 향후 계층형 hub(예: Heritage → Renaissance)를 만들 때 `parent`를 실제로 배선할 것.
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, Part 1과 동일 — 신규 이슈 없음) 통과. 기존 라우팅/URL 전부 유지, 8개 게시판 그룹의 화면 동작(검색/정렬/페이지네이션/좋아요/댓글/북마크/태그 노출)은 토글이 전부 기존과 동일한 값으로 설정돼 있어 사용자 관점에서 변화 없음 — 다른 세션이 포트를 점유해 브라우저로 직접 재확인은 못함(NEXT_TASK.md 참고).

## 2026-07-27 (EPIC-046)
- **EPIC-046: Editorial Magazine board design system**
  - 게시판(`/boards`, `/boards/[id]`, `/boards/[id]/[postId]`, `/boards/[id]/write`) 전체를 신문/매거진풍 "Editorial Magazine" 디자인 언어로 통일 — House of Honey류 기사 레이아웃의 정보 구조(좌: No./날짜, 중앙: 큰 제목, 우: Author/작성자)를 참고하되 새 색상 없이 기존 뉴트럴 팔레트+`font-serif`(Tailwind 기본 스택, 폰트 파일 추가 없음)만으로 재해석. 자세한 규칙은 `docs/design-system.md` §10 신설.
  - 신규 공용 컴포넌트 4개(`src/components/boards/`): `BoardHeader`(게시판명+글쓰기 버튼+얇은 divider), `PostDetailHeader`(3열 헤더: No./작성일 · 큰 제목 · Author/작성자 + 대표 이미지 풀와이드), `PostTags`(태그 칩), `CommentSection`(댓글 목록+작성 폼, hairline 구분선) — `/boards/[id]`와 `/boards/[id]/[postId]` 두 라우트가 전부 이 컴포넌트로만 렌더링되므로 "모든 게시판이 동일한 컴포넌트 공유" 요구를 자동으로 만족(게시판별 커스텀 페이지가 없는 기존 아키텍처 그대로).
  - **기존 기능 100% 유지, UI만 교체**: 좋아요/댓글/글쓰기/등급 게이팅 로직·API 호출은 한 줄도 바꾸지 않음(단, 응답에 필드 2개만 추가 — 아래 참고). 카드+그림자 리스트를 hairline 구분선 목록으로, 좁은 `max-w-2xl` 단일 폭을 헤더는 `max-w-4xl`/본문은 `max-w-2xl`로 이중화(넓은 여백+읽기 좋은 폭 동시 확보)해 시각만 재구성.
  - **"태그 영역 추가" 처리 방식(판단 필요 사항)**: `posts` 테이블에 태그 전용 컬럼이 없어(스키마 변경 최소화 원칙) 새 컬럼을 추가하는 대신, 이미 있는 게시판 카테고리 + `is_docent_post`/`is_best` 여부를 `#태그` 칩으로 파생 표시(`PostTags.tsx`). 사용자가 직접 태그를 입력/편집하는 기능이 필요하면 `posts.tags`(배열) 컬럼 추가가 필요한 별도 스키마 작업.
  - **"글 번호(No.)" 처리 방식**: 저장된 시퀀스 컬럼이 없어, `GET /api/boards/[id]/posts/[postId]`가 매 요청마다 "같은 게시판에서 이 글보다 먼저(또는 동시에) 작성된 글의 개수"를 계산해 `post.post_number`로 반환(1부터 시작, 시간순). 응답에 `post.photo_url`도 추가(기존 select에서 누락돼 있었음 — 대표 이미지 기능에 필요).
  - 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-1929.sql`로 백업(실제 스키마 변경 없음).
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, EPIC-045와 동일 — 신규 이슈 없음) 통과. dev 서버가 다른 세션에서 3000번 포트를 점유 중이라 이번 세션은 브라우저로 실제 레이아웃(3열 헤더, 풀와이드 이미지, hairline 목록)을 직접 확인하지 못함 — 사용자 확인 필요(아래 NEXT_TASK.md 참고).

## 2026-07-27 (EPIC-045)
- **EPIC-045: Mypage restructure — museum-like collection, route-based tabs**
  - `/mypage`가 11개 탭을 `useState`로 전환하는 단일 페이지에서 각 탭이 독립된 URL을 갖는 라우트 구조로 재구성됨 — 지시문의 "각 하위 페이지는 앞으로 기능 확장이 쉽도록 독립 페이지/라우트 구조를 사용한다"에 따름. 새 `src/app/mypage/layout.tsx`가 로그인 게이트 + 등급/포인트 요약 조회 + `MyPageNav`를 공유 chrome으로 끌어올리고, `MyPageProvider`(`src/components/mypage/MyPageContext.tsx`)로 `memberId`를 하위 라우트에 전달한다.
  - 새 라우트 12개: `/mypage`(허브 — 11개 섹션을 카드 그리드로 보여주는 "박물관 입구"), `/mypage/collections`(→ `/mypage/collections/treasure`로 즉시 이동), `/mypage/collections/[category]`(9개 카테고리 동적 라우트), `/mypage/wishlist`, `/mypage/follow`, `/mypage/salon`, `/mypage/docent-certificate`, `/mypage/space`, `/mypage/exhibition`, `/mypage/badges`, `/mypage/comments`, `/mypage/timeline`, `/mypage/visitors`.
  - **기존 기능 재사용**: `WishlistPanel`/`FollowPanel`/`BadgesPanel`/`CommentsPanel`/`VisitorsPanel`/`PlaceholderPanel`(EPIC-022)은 코드 변경 없이 그대로 각 라우트에 배치. `CollectionsPanel.tsx`(내부 `useState`로 9개 서브탭을 전환하던 구버전)는 삭제하고, 같은 조회/등록/수정/삭제 로직을 카테고리 하나만 받는 `CollectionCategoryPanel.tsx`로 재작성 — `CollectionModal.tsx`는 그대로 재사용. 서브탭 전환용 `CollectionsSubNav.tsx`(Link 기반)를 신규 작성해 `MyPageNav.tsx`도 같은 방식(`usePathname()`으로 활성 탭 자체 판단)으로 전환.
  - `mypageConfig.ts`(11개 탭/9개 컬렉션 서브탭 정의, EPIC-022)는 탭 id가 이미 라우트 세그먼트와 1:1 대응해 변경 없이 그대로 재사용.
  - **URL 변경 없음**: 기존 `/mypage`는 계속 유효(허브로 의미가 바뀌었을 뿐 경로 자체는 유지). 하위 라우트는 전부 신규 추가라 기존 링크(Navbar/설정 페이지의 `/mypage`)에 영향 없음.
  - Schema 변경 없음 — `member_collections`/`member_follows`/`member_badges`/`member_visitors`는 이미 EPIC-022/023에서 설계·라이브 확인된 테이블을 그대로 사용. 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-1646.sql`로 백업만 해둠(실제 변경 없음).
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, EPIC-043과 동일 — 신규 이슈 없음. `CollectionCategoryPanel.tsx`의 `set-state-in-effect` 1건은 삭제된 `CollectionsPanel.tsx`에 있던 동일 패턴을 그대로 옮긴 것이라 순증 없음) 통과. dev 서버 점유 여부는 이번 세션에서 확인하지 못해 실제 라우트 이동/데이터 렌더링은 사용자 확인 필요.

## 2026-07-27 (EPIC-044)
- **EPIC-044: Dynamic routing, navigation data & universal board component**
  - `src/components/shared/UniversalBoard.tsx` 신규 작성: 이름/주제가 무한히 늘어나는 카테고리(헤리티지 인물, 클럽 등)를 위한 공용 게시판 템플릿 — 검색창, 정렬 드롭다운(조회수순/좋아요순/최신날짜순), 목록, 하단 총 페이지 수 통계. `posts`/`totalPages`는 옵션 prop(기본 빈 배열)으로, 카테고리별 실제 데이터 소스가 아직 없어 UI 뼈대만 구현.
  - 동적 라우트 3개 신규: `src/app/heritage/grandma/[name]/page.tsx`, `heritage/grandpa/[name]/page.tsx`, `community/club/[name]/page.tsx` — 각각 `params`를 `await`해 이름을 제목으로 표시하고 `<UniversalBoard />`를 렌더링.
  - `src/lib/navConfig.ts`의 `FALLBACK_NAV_TABS`에 사이드바 메뉴 데이터 대량 주입: `silostore`(사일로상점) 탭에 "사일로 헤리티지 · 할머니"(51명)/"사일로 헤리티지 · 할아버지"(17명) 그룹, `salon`(살롱데상) 탭에 "주제별 소통게시판"(13개 주제)/"요일별 클럽"(7개) 그룹 추가 — 전부 위 동적 라우트로 링크. **주제별 소통게시판은 전용 라우트가 지시문에 없어 `community/club/[name]`을 재사용**(요일별 클럽과 공유).
  - `LeftSidebar.tsx`의 `isAccordionGroup`을 "헤리티지" 포함 그룹도 매칭하도록 확장 — 51명+17명 목록이 항상 펼쳐진 채로 있으면 사이드바가 지나치게 길어져, "도슨트" 그룹과 동일하게 hover 펼침 아코디언으로 처리.
  - **LeftSidebar.tsx/RightSidebar.tsx 자체는 데이터를 소유하지 않음**: 두 컴포넌트는 `navConfig.ts`가 넘긴 `tab.groups`를 그대로 렌더링하는 순수 뷰라, 실제 대량 데이터는 그 데이터가 흘러나오는 지점인 `FALLBACK_NAV_TABS`에 주입했다(지시문의 "LeftSidebar/RightSidebar 데이터 바인딩" 문구와 실제 아키텍처가 달라 판단해 처리). `site_navigations`(DB)가 채워지면 이 폴백은 무시되므로, 운영 반영을 원하면 같은 항목을 DB에도 시딩해야 함 — Management API 토큰이 없어 DB 작업은 하지 않음.
  - 검증: `npx tsc --noEmit`/`npm run lint`(26건, 기존과 동일 — 신규 이슈 없음) 통과.

## 2026-07-27 (EPIC-043)
- **EPIC-043: Font settings overhaul, sidebar click-only + hover accordion (성능 최적화는 보류)**
  - **폰트 설정 개편**: 작동하지 않던(폰트 파일 자체가 없는) "텍스트 폰트" select(`textCustomFont`: Graphire/Primor)를 `admin/navigation/settings/page.tsx`와 `Navbar.tsx`에서 완전히 삭제. 단일 `main_logo.fontFileUrl`을 `customFonts`(배열, 각 항목 `{ id, url, isActive }`)로 교체 — 관리자 폼에서 여러 폰트를 등록해두고 각각 "적용" 체크박스로 켜고 끌 수 있다. `Navbar.tsx`는 `isActive`인 항목들만 등록 순서대로 `@font-face`를 각각 주입하고, 그 순서 그대로 `font-family` 폴백 체인(`'SiloCustomLogoFont-{id}', ..., 자유입력 fontFamily 또는 sans-serif`)을 구성해 로고 좌/우 텍스트에 적용한다. 구버전 단일 `fontFileUrl`은 로드 시 1개짜리 배열로 자동 이전(관리자 폼과 `Navbar.tsx` 양쪽 모두).
  - **사이드바 클릭 전용 + Hover 아코디언**: `Navbar.tsx`가 `LeftSidebar`/`RightSidebar`에 더 이상 `onIconMouseEnter`를 넘기지 않고(두 컴포넌트에서 prop 자체를 제거), 여닫이 아이콘은 오직 클릭으로만 열린다(패널을 닫는 방법은 그대로: ✕/바깥 클릭/패널에서 마우스가 완전히 벗어남). `LeftSidebar.tsx`는 "도슨트"가 포함된 그룹(현재 라벨 "온라인 도슨트 라이브러리")만 기본 접힘 + hover로 펼쳐지는 아코디언 — 정확한 문자열 대신 부분 일치로 구현해, 관리자가 site_navigations에서 그룹 라벨을 살짝 바꿔도(실제로 이번 세션 중 "온라인 도슨트 Online Docent"로 바뀌었다) 계속 매칭된다. `RightSidebar.tsx`는 그룹 전부(커뮤니티/멤버십/갤러리/아카이브)가 동일하게 hover 아코디언 — 라벨을 하드코딩하지 않고 모든 그룹에 균일 적용. 둘 다 JS state 없이 순수 Tailwind `group`/`group-hover`(문서 흐름 안에서 그룹 헤더 바로 아래로 펼쳐지는 구조라 플로팅 팝업과 달리 별도 "브릿지" 여백이 필요 없다).
  - **슬라이드/배경 이미지 next/image 전환은 보류**: 지시대로 `HeroSlideshow.tsx`의 `<img>`/`backgroundImage`를 `next/image`(`fill`+`priority`/`loading="lazy"`+`quality`)로 교체해봤으나, 이 Next 16 + Turbopack 조합에서 **재현 가능한 심각한 회귀**가 발견됐다 — `<Image fill .../>`를 슬라이드에 쓰는 순간 Navbar를 포함한 앱 전체가 클라이언트에서 전혀 hydrate되지 않아(콘솔/서버 로그에 에러 한 줄도 없이) 상단 탭 메뉴가 완전히 빈 채로 굳어버림. 브랜드 뉴 탭 + `.next` 캐시 삭제 + 서버 재시작까지 거쳐 `priority`/`sizes`/`quality`/`className` 하나씩 제거하며 이진 탐색으로 원인을 `fill` prop 자체(다른 prop 없이도 재현)까지 좁혔지만, 명확한 에러 메시지를 못 찾아 근본 원인은 특정하지 못했다. 핵심 내비게이션을 깨뜨리는 회귀를 "성능 개선"과 맞바꿀 수 없어 `HeroSlideshow.tsx`는 기존 `<img>`/CSS `backgroundImage` 구현으로 되돌렸다 — 아래 NEXT_TASK.md 참고.
  - 검증: `npm run lint`(26건, 직전과 동일 — 신규 이슈 없음)/`npx tsc --noEmit` 통과. 이번 세션 dev 서버에서 직접 확인 — 사이드바 아이콘이 클릭으로만 열림(코드상 hover 핸들러 자체가 없음), "온라인 도슨트 Online Docent" 그룹만 `group`/`group-hover` 클래스가 붙고 나머지 LeftSidebar 그룹엔 안 붙는 것/RightSidebar는 4개 그룹 전부에 붙는 것을 DOM에서 직접 확인, 관리자 폼의 새 커스텀 폰트 배열 UI(구버전 데이터 1개 자동 이전 포함) 렌더링 확인.

## 2026-07-27 (EPIC-041-042-HOTFIX)
- **EPIC-041-042-HOTFIX: fix hover bug & switch to direct URL inputs**
  - **드롭다운 hover 버그 완전 재구현**: `Navbar.tsx`의 상단 탭 드롭다운을 JS state(`openTab`/`popupPos`/`handleTabMouseEnter`/`handlePopupMouseLeave`, `position:fixed`)에서 순수 Tailwind `group`/`group-hover`로 전면 교체. 버그 원인은 트리거(탭 버튼)와 팝업이 서로 다른, 별개의 DOM 서브트리(팝업은 헤더 맨 끝에 fixed로 따로 렌더링)였다는 점 — 마우스가 그 사이를 이동할 때 각각의 enter/leave 타이밍이 어긋나면서 벗어나도 안 닫히는 경우가 생겼다. 이제 트리거+팝업을 같은 `relative group/tab` 컨테이너의 부모-자식으로 중첩해, 브라우저가 그 컨테이너 전체를 기준으로 `:hover`를 계산하므로 완전히 벗어나는 즉시 예외 없이 닫힌다. 탭↔팝업, 그룹↔2차 플라이아웃 사이의 시각적 간격은 각각 `pt-4`/`pl-2` **padding**(margin이 아님)으로 만들어 "투명한 다리" 역할을 하게 했다 — padding은 그 요소 박스의 일부라 마우스가 그 위를 지나도 hover가 끊기지 않는다. 이름 있는 그룹(`group/tab`, `group/row`)을 쓴 이유: 이름 없는 `group`을 중첩하면 Tailwind가 "가장 가까운 조상"이 아니라 "어떤 조상이든 `.group`이고 hover 중이면" 매칭해 상위 탭에 마우스를 올리기만 해도 모든 하위 그룹의 플라이아웃이 한꺼번에 열려버리는 문제가 있었음.
  - `<nav>`의 `overflow-x-auto`(모바일 가로 스크롤용)를 `flex-wrap`으로 교체 — CSS 스펙상 `overflow-x`가 `visible`이 아니면 `overflow-y`도 `auto`로 강제 계산돼, 그 안에 중첩된 `position:absolute` 드롭다운이 잘려 보이는 문제를 `position:fixed` 없이 해결하기 위함(4개 탭 기준으로는 줄바꿈이 자연스러운 대안).
  - **URL 직접 입력으로 전환**: `admin/navigation/settings/page.tsx`의 커스텀 폰트 파일 업로드와 좌/우 사이드바 아이콘 업로드(`input type="file"` + Storage 업로드)를 제거하고, Supabase Storage에 이미 올린 파일의 공개 URL을 직접 붙여넣는 텍스트 입력으로 교체 — 가장 단순하고 확실한 방식을 우선했다. 로고 이미지/슬라이드/Wallpaper 이미지는 대상이 아니라 계속 파일 업로드를 쓴다.
  - 검증: `npm run lint`(26건, 직전과 동일 — 신규 이슈 없음)/`npx tsc --noEmit` 통과. `@font-face` 주입과 사이드바 아이콘 `src` 바인딩 로직은 EPIC-041에서 이미 구현된 그대로이며 이번엔 값의 출처만(업로드 → 직접 입력) 바뀌었으므로 코드 경로상 문제 없음을 확인. 다만 이번 세션은 Browser 창이 화면에 표시되지 않아 실제 마우스 hover(: hover는 진짜 커서 이동에만 반응하고 JS로 디스패치한 이벤트로는 재현되지 않음) 동작을 스크린샷으로 직접 확인하지 못했음 — 사용자가 직접 브라우저에서 탭 hover 후 마우스를 완전히 치웠을 때 즉시 닫히는지 확인 필요.

## 2026-07-27 (EPIC-041-042)
- **EPIC-041-042: Unified UI polish — hover UX, custom fonts, icons, home curation**
  - **드롭다운 UX 수정**: `Navbar.tsx`의 상단 탭 다단계 팝업에서 "클릭으로 고정(pinned)" 개념을 완전히 제거했다 — `pinnedKey`/`handleTabClick`/outside-click `useEffect`/`navRef`를 모두 삭제하고, 탭 버튼에는 `onMouseEnter`만 남겼다. 팝업을 닫는 것도 오직 `onMouseLeave`(`handlePopupMouseLeave`)뿐이라 마우스가 완전히 벗어나면 예외 없이 즉시 닫힌다. 클릭으로 닫던 배경(backdrop) `<div>`도 제거 — pinned 상태가 없어 필요 없어졌고, 이전엔 이 배경이 hover 중 페이지의 다른 클릭을 가로채는 부작용이 있었다. 팝업은 여전히 `position: fixed`(JS로 좌표 계산) — 상단 nav의 `overflow-x-auto`가 CSS 스펙상 `overflow-y`도 `auto`로 강제해 `position: absolute` 팝업은 잘려 보이기 때문(2차 플라이아웃은 계속 순수 CSS `group-hover`).
  - **커스텀 폰트 업로드**: `admin/navigation/settings/page.tsx`에 "커스텀 폰트 파일 업로드(.woff/.woff2/.ttf/.otf)" 필드 추가 — `public-assets`/`logo_fonts` 폴더에 업로드하고 URL을 `main_logo.fontFileUrl`로 저장. `Navbar.tsx`는 이 URL이 있으면 `<style>` 태그로 `@font-face`(`font-family: 'SiloCustomLogoFont'`)를 동적 주입하고, 로고 좌/우 텍스트의 `fontFamily`에 최우선 적용(기존 Graphire/Primor/자유 입력 서체보다 우선).
  - **아이콘 크기 설정**: `sidebar_icons`에 `iconSizePx`(기본 32px, 기존 `w-8 h-8` 하드코딩과 동일) 추가 — 관리자 폼에 숫자 입력 필드, `LeftSidebar`/`RightSidebar`가 `width`/`height` 인라인 스타일로 반영.
  - **홈 큐레이션 동적 배열**: `home_curation` 설정을 단일 객체에서 `HomeCurationBlock[]`(섹션 제목 + 필터 기준(도메인) + 타겟 값(slug) + 정렬)로 고도화 — 관리자 폼에 블록 추가/삭제/위로·아래로 이동 UI 추가. 구버전 단일 객체 데이터는 로드 시 블록 1개로 자동 이전(관리자 폼과 `page.tsx` 양쪽 모두). 신규 `src/components/HomeCurationSlider.tsx`(섹션 제목 + 가로 스크롤 썸네일, 표시 전용)를 만들고 `page.tsx`가 저장된 순서대로 렌더링 — `domain==="shop"` 블록은 `items` 테이블을 실제로 조회(카테고리 slug 필터, `status='available'`)하고, salon/collection/docent 도메인은 아직 각 화면의 실제 스키마를 확인하지 않아 UI 확인용 더미 데이터로 대체(스키마 추측 금지 원칙에 따름 — NEXT_TASK.md 참고).
  - 검증: `npm run lint`(26건, EPIC-040과 동일 — 신규 이슈 없음)/`npx tsc --noEmit` 통과. 이번 세션 dev 서버에서 직접 확인 — hover 팝업이 마우스가 벗어나면 즉시 닫힘(브라우저 자동화 도구의 합성 마우스 이동이 실제 `mouseout`을 늘 발생시키지 않는 경우가 있어, 실제 `mouseout` 이벤트를 직접 디스패치해 닫힘을 재확인함), 홈 큐레이션 블록이 구버전 데이터에서 자동 이전되어 실제 `items` 테이블 데이터("아르누보 유리 램프")로 렌더링되는 것까지 확인. 폰트 파일 업로드/아이콘 크기 반영은 실제 파일 업로드 다이얼로그 조작이 불가해 코드 리뷰 수준으로만 확인.

## 2026-07-27 (EPIC-040)
- **EPIC-040: Master UI — nested dropdown, independent sidebars, logo texts, random wallpapers**
  - **다단계(Nested) 드롭다운**: `Navbar.tsx`의 상단 탭 hover 팝업이 groups(사이드바 타입, 예: 사일로상점/살롱데상)를 가질 때 이제 그룹 라벨을 1차 목록으로 보여주고, 각 행에 마우스를 올리면 그 그룹의 items가 2차 플라이아웃으로 옆에 튀어나온다 — 별도 JS state 없이 Tailwind `group`/`group-hover`만으로 구현(플라이아웃이 부모 팝업 바깥으로도 잘리지 않게 팝업의 `max-h-[70vh] overflow-y-auto`를 제거). `dropdown` 타입(예: 스튜디오)은 groups가 없어 기존처럼 평평한 목록.
  - **좌/우 사이드바 독립 state 복구**: EPIC-039는 전체 높이 사이드바(open 여부)를 상단 탭 hover/pin 상태(`openTab`/`pinnedKey`)에서 파생시켰는데, 그러면 상단 탭 hover가 곧 전체 사이드바를 열어버려 이번 EPIC의 "탭 hover 시 작은 다단계 팝업" 요구와 근본적으로 충돌했다(하나의 hover가 두 다른 UI를 동시에 열 수 없음). `leftOpen`/`rightOpen`을 다시 독립적인 `useState`로 되돌려, 전체 사이드바는 오직 `LeftSidebar`/`RightSidebar` 자신의 여닫이 아이콘 버튼(hover로 열기/✕·바깥 클릭·패널에서 마우스가 벗어나면 닫기)으로만 제어한다 — 상단 탭 쪽 다단계 팝업과는 완전히 별개의 UI/상태.
  - 사이드바 아이콘 업로드, 로고 좌/우 텍스트, 슬라이드쇼 다중 Wallpaper 랜덤 배경은 EPIC-039에서 이미 구현된 것을 그대로 사용(이번 EPIC에서 관련 파일을 다시 건드리지 않음) — 상세 내용은 위 EPIC-039 항목 참고.
  - 검증: `npm run lint`(26건, EPIC-039와 동일 — 신규 이슈 없음)/`npx tsc --noEmit` 통과. 이번 세션 dev 서버에서 직접 확인: 상단 탭 hover → 1차 그룹 팝업 → 그룹 hover 시 2차 아이템 플라이아웃, 사이드바 아이콘(🔑) hover-열림/✕-닫힘/바깥 클릭-닫힘(별도 상태로 상단 탭 팝업과 무관하게 동작), 로고 좌/우 텍스트("I'm your" / "SILO") 실 데이터로 대칭 렌더링, 슬라이드쇼 wallpaper가 재로딩마다 다른 이미지로 무작위 표시되는 것까지 확인.

## 2026-07-27 (EPIC-039)
- **EPIC-039: Master UI polish — sidebars, icons, logo texts, hover, random wallpapers**
  - **사이드바 복구**: EPIC-037이 sidebar-left/sidebar-right를 dropdown과 동일한 작은 팝업으로 통합했던 것을, 화면 전체 높이의 슬라이드인 패널로 복구했다. 다만 EPIC-037의 "hover로 열고 클릭으로 고정, 바깥 클릭으로 닫기" 상태 관리(`openTab`/`pinnedKey`)는 그대로 재사용 — `leftOpen`/`rightOpen`을 별도 state로 다시 두지 않고 `pinnedKey === tab.key || (!pinnedKey && openTab?.key === tab.key)`로 파생시켜, "Hover 로직과 충돌하던 사이드바 State"가 다시 생기지 않게 했다. 패널 UI 자체는 `src/components/LeftSidebar.tsx`/`RightSidebar.tsx` 2개 컴포넌트로 분리.
  - **사이드바 아이콘**: `admin/navigation/settings/page.tsx`에 좌/우 사이드바 아이콘 파일 업로드(새 `site_settings` 키 `sidebar_icons`, `public-assets`/`sidebar_icons` 폴더) 추가. `LeftSidebar`/`RightSidebar`의 여닫이 버튼이 이 아이콘을 `w-8 h-8`로 렌더링하고, 아이콘이 없으면 기존 🔑/🚪 이모지로 자동 대체.
  - **로고 좌/우 텍스트**: `main_logo`의 단일 `extraText`+`textPosition`을 `leftText`/`rightText`로 분리 — 로고 이미지를 중앙에 두고 양옆에 동일한 `flex-1` 폭으로 대칭 배치. 이 레이아웃이 EPIC-034의 "정렬 위치"(`align`)와 의미가 겹쳐 관리자 UI에서 정렬 select는 제거(항상 중앙). 구버전 `extraText`+`textPosition` 데이터는 로드 시 1회 `leftText`/`rightText`로 자동 이전(`align`/`extraText`/`textPosition` 필드 자체는 구버전 호환을 위해 타입에는 남겨둠).
  - **상단 탭 hover 일관성**: dropdown/sidebar-left/sidebar-right 3개 타입은 EPIC-037부터 이미 동일한 hover-팝업 상호작용을 공유 — 이번 EPIC은 사이드바 타입의 팝업 내용만 컴팩트 박스에서 전체 패널로 바꿨을 뿐, 트리거 메커니즘(hover 미리보기/클릭 고정/바깥 클릭 해제)은 손대지 않았다. `link` 타입(마이페이지)은 하위 항목이 데이터 모델에 없어(그룹/아이템 없음) 실제 드롭다운 노출은 적용하지 않고, 시각적 일관성만 위해 동일한 hover 테마 색상(`hover:bg-green-800`)을 추가했다 — 실제 서브메뉴가 필요하면 `site_navigations`에 자식 행을 추가하는 별도(데이터) 작업이 필요하다.
  - **슬라이드쇼 랜덤 배경**: `hero_slideshow.wallpaperUrl`(단일 문자열)을 `wallpaperUrls`(최대 10개 배열)로 교체 — 관리자 폼은 슬라이드 목록과 동일한 "+ 추가/삭제" 패턴의 반복 업로드 UI. `HeroSlideshow.tsx`는 슬라이드 인덱스(`current`)가 바뀔 때마다 이펙트에서 `Math.random()`으로 하나를 골라 `useState`에 담아 배경으로 적용 — `Math.random()`은 순수하지 않아 렌더/`useMemo` 안에서 호출할 수 없다(`react-hooks/purity`)는 새 ESLint 규칙 때문에 useEffect+setState 방식을 택함(모든 슬라이드가 같은 배경을 공유해 크로스페이드 중 배경이 어긋나 보이지 않게 함). 구버전 단일 `wallpaperUrl`은 로드 시 1개짜리 배열로 자동 이전.
  - 검증: `npm run lint`(26건 → 27건, +1은 위 wallpaper 이펙트의 `react-hooks/set-state-in-effect` — 이미 저장소 전반에 퍼져 있는 동일 클래스의 pre-existing 이슈, NEXT_TASK.md의 P2 항목과 동일 성격)/`npx tsc --noEmit` 통과. 이번 세션 dev 서버에서 직접 확인: 사이드바 hover-열림/클릭-고정/바깥 클릭-닫힘, 로고 좌측 텍스트 마이그레이션 표시, 관리자 폼의 새 필드(좌/우 텍스트, Wallpaper 다중 업로드, 사이드바 아이콘) 렌더링까지 확인. Wallpaper 실제 파일 업로드/랜덤 배경 렌더링과 사이드바 아이콘 업로드는 실제 파일 다이얼로그 조작이 불가해 코드 리뷰 수준으로만 확인(NEXT_TASK.md 참고).

## 2026-07-27 (EPIC-037)
- **EPIC-037: Navigation hover & click UX improvement**
  - `Navbar.tsx`: 상단 탭의 `dropdown`/`sidebar-left`/`sidebar-right` 3개 타입을 렌더링 방식 하나로 통일 — 예전에는 sidebar 타입이 화면 전체 높이로 슬라이드인하는 별도 패널(+ 화면 가장자리의 🔑/🚪 플로팅 버튼)이었지만, 이제 세 타입 모두 탭 바로 아래에 뜨는 작은 팝업(그룹이 있으면 그룹 라벨+항목, 없으면 dropdown의 평평한 항목 목록)으로 동작한다. 기존 `leftOpen`/`rightOpen`/`dropdownTab`/`dropdownPos`/`openDropdown`/`closeDropdown`/`closeSidebars`를 `openTab`/`popupPos`/`pinnedKey`와 `handleTabMouseEnter`/`handleTabClick`/`handlePopupMouseLeave`로 교체.
  - Hover 시 탭 배경/텍스트가 사이드바와 동일한 테마 색상(`bg-green-800`/`text-white`)으로 바뀌고 탭 바로 아래에 팝업이 뜬다. 클릭 시에는 `pinnedKey`에 해당 탭의 `key`를 저장해 팝업을 "고정"하고, 고정된 동안에는 다른 탭에 마우스를 올려도 내용이 바뀌지 않는다(의도치 않은 전환 방지). 문서 전체에 `mousedown` 리스너를 다는 `useEffect`(의존성 `[pinnedKey]`)로 팝업/탭 바깥 클릭을 감지해 고정을 해제 — 팝업(`popupRef`)이나 탭이 속한 `<nav>`(`navRef`) 내부 클릭은 무시해 탭 전환이 자연스럽게 이어지도록 함.
  - 검증: `npm run lint`(기존 25건 pre-existing 이슈만 유지, 신규 발생 없음)/`npx tsc --noEmit` 통과. 이번 세션 dev 서버에서 실제로 hover 시 팝업+테마 색상 전환, 클릭 후 마우스를 팝업 밖으로 옮겨도 유지되는 고정, 빈 공간 클릭 시 닫힘까지 직접 확인.

## 2026-07-27 (EPIC-036)
- **EPIC-036: Logo text color & slide background wallpaper**
  - `admin/navigation/settings/page.tsx`: `main_logo`에 "추가 텍스트 색상"(`textColor`, 컬러 피커 + HEX 직접 입력) 필드 추가 — 기본값은 `Navbar.tsx` 사이드바에 쓰이는 짙은 녹색(Tailwind `green-800`, `#166534`)으로 맞춤. `hero_slideshow`에는 "여백 배경 이미지(Wallpaper)" 파일 첨부 필드(`wallpaperUrl`) 추가 — 로고/슬라이드 이미지와 동일한 `uploadImage()`/`public-assets` 버킷 업로드 로직 재사용.
  - `Navbar.tsx`: 로고 옆 추가 텍스트의 하드코딩된 `text-gray-900` 클래스를 제거하고, `mainLogo.textColor`(없으면 기본값 `#166534`)를 인라인 `style={{ color }}`로 적용.
  - `HeroSlideshow.tsx`: `wallpaperUrl` prop 추가. `objectFit==="contain"`이고 `wallpaperUrl`이 있을 때만 각 슬라이드 컨테이너에 `backgroundImage`/`backgroundSize: cover`/`backgroundPosition: center` 인라인 스타일을 적용해 이미지 좌우·상하 여백을 채움 — `cover` 모드에서는 여백이 애초에 없으므로 배경이 적용되지 않음.
  - `src/app/page.tsx`: 홈페이지 Server Component가 `hero_slideshow` 조회 결과의 `wallpaperUrl`을 `HeroSlideshow`에 그대로 전달하도록 연결.
  - 검증: `npm run lint` 통과 확인. 이번 세션은 dev 서버를 직접 띄운 세션이라 브라우저로 실제 렌더링(색상 피커 반영, wallpaper 배경)까지 확인 완료 — 자세한 내용은 세션 로그 참고.

## 2026-07-27 (EPIC-034-Ext)
- **EPIC-034-Ext: Advanced logo text styling**
  - `admin/navigation/settings/page.tsx`: `main_logo`에 "텍스트 위치"(로고 좌/우, `textPosition`)와 "텍스트 폰트"(기본/Graphire/Primor Select, `textCustomFont`) 추가. EPIC-034의 자유 입력 서체 필드(`fontFamily`)는 유지하고 "기본" 선택 시에만 사용하도록 해 대체가 아닌 보완 방식으로 구현 — Graphire/Primor 선택 시 자유 입력란은 비활성화.
  - `Navbar.tsx`: `textPosition==="left"`일 때 로고+텍스트 컨테이너에 `flex-row-reverse`를 적용해 렌더링 순서를 반전. 텍스트 색상은 `text-gray-900`으로 하드코딩(헤더 기본 톤과 통일). `textCustomFont`가 Graphire/Primor면 `"'Graphire', serif"`/`"'Primor', serif"` 형태로 serif 폴백을 포함해 인라인 `fontFamily`로 적용, 기본이면 기존 자유 입력값 사용.
  - `globals.css`: 최상단에 `Graphire`/`Primor` `@font-face` 뼈대를 주석으로 추가 — 실제 폰트 파일이 없어 비활성 상태(파일 추가 후 경로 채우고 주석 해제하면 적용). 그 전까지는 Navbar가 serif로 자연스럽게 대체.
  - 검증: `npm run type-check`/`npm run lint` 통과 확인. 실제 렌더링(정렬/폰트 전환)은 아래 "localhost 확인 불가" 사유로 직접 확인하지 못함.

## 2026-07-27 (EPIC-035-Fix)
- **EPIC-035-Fix: Unify category CMS & clean up old pages**
  - 구버전 `top-tabs`/`sidebar-left`/`sidebar-right` 3개 페이지(정적 `NavNodeEditor` 기반)를 삭제 — EPIC-035의 `CategoryTreeManager`(드래그앤드롭 통합 화면, `/admin/navigation`)로 `site_navigations` 관리 UI를 일원화.
  - `admin/navigation/layout.tsx`의 서브 탭을 4개에서 "카테고리 통합 관리"(`/admin/navigation`)와 "홈페이지 설정 관리"(`/admin/navigation/settings`) 2개로 정리. `admin/layout.tsx`의 상위 "메뉴/카테고리 관리" 탭은 이미 `/admin/navigation`으로 연결돼 있어 별도 수정 불필요함을 확인.
  - `admin/navigation/shared.tsx`의 `NavNodeEditor`/`CategoryRowEditor`/`NavRow`/`TargetType` 등은 삭제된 3개 페이지에서만 쓰이던 export라 이제 죽은 코드가 됐지만, 이번 EPIC 수정 대상 파일에 `shared.tsx`가 없어 정리하지 않음(`DOMAIN_OPTIONS`/`inputClass` 등은 `settings/page.tsx`가 계속 사용해 남겨둠).
  - 검증: `npm run type-check`/`npm run lint` 통과 확인, 삭제된 라우트에 대한 참조가 남아있지 않음을 grep으로 확인.

## 2026-07-27 (EPIC-035)
- **EPIC-035: Tistory-style drag-and-drop category CMS**
  - `site_navigations`(상단 탭/좌측·우측 사이드바 트리)에 `topic`(주제/태그), `thumbnail_url`(대표 이미지), `description`(카테고리 소개), `is_public`(공개 여부, default true) 4개 컬럼 추가. "카테고리"라는 표현이 `site_navigations`(내비 트리)와 `site_categories`(상점/살롱/도슨트 등 도메인 카테고리) 둘 다를 가리킬 수 있어 모호했지만, "상단 탭/좌측/우측 사이드바 공통 적용"이라는 지시 문구와 `parent_id`+`sort_order`를 이미 갖춘 트리 구조가 필요하다는 점에서 `site_navigations` 쪽으로 판단해 진행. 작업 전 `docs/database-schema.sql`을 `docs/backups/database-schema-20260727-0035.sql`로 백업.
  - `src/components/admin/CategoryTreeManager.tsx` 신규 작성: `@dnd-kit/core`+`@dnd-kit/sortable`로 구현한 재사용 가능한 트리 관리 컴포넌트. `targetTypes` prop으로 상단 탭/좌측/우측 사이드바 중 어느 트리를 다룰지 지정. 각 행에 [추가]/[수정]/[관리]/[삭제] 버튼, 드래그 핸들(⠿)을 배치 — 같은 부모 밑에서 위/아래로 끌면 순서(`sort_order`)만 바뀌고, 다른 행 위로 끌어다 놓으면 그 행의 하위 항목으로 즉시 재부모화(`parent_id` 변경)되어 DB에 반영. [관리] 클릭 시 공개 설정/주제·태그/대표 이미지(Supabase Storage `public-assets` 버킷 직접 업로드 또는 URL)/카테고리 소개를 편집하는 모달 표시.
  - `admin/navigation/page.tsx`: 기존에 `top-tabs`로 단순 리다이렉트하던 인덱스 페이지를 `CategoryTreeManager` 3개(상단 탭/왼쪽 사이드바/오른쪽 사이드바)를 한 화면에 나란히 보여주는 통합 관리 화면으로 교체. 이번 EPIC의 수정 대상 파일이 이 파일로 한정되어 있어, 기존 `top-tabs`/`sidebar-left`/`sidebar-right`(EPIC-023/025/027, 정적 `NavNodeEditor` 기반) 3개 페이지는 그대로 남아있음 — 같은 테이블을 보므로 어느 화면에서 편집해도 결과는 동일하게 반영됨.
  - 검증: `npm run type-check`/`npm run lint` 통과 확인(신규 파일의 유일한 lint 에러는 기존 `shared.tsx`의 `NavNodeEditor`와 동일한 패턴의 사전 존재 `set-state-in-effect` 이슈). Drag & Drop 실제 동작과 새 컬럼 저장은 라이브 DB에 컬럼이 없어 로컬에서 직접 확인하지 못함(아래 참고).

## 2026-07-27 (EPIC-034)
- **EPIC-034: Advanced logo & header customization**
  - `admin/navigation/settings/page.tsx`: `main_logo` 설정에 정렬 위치(좌/중앙/우, `align`), 로고 옆 추가 텍스트(`extraText`), 텍스트 서체(`fontFamily`)/굵기(`bold`)/크기(px, `fontSizePx`) 필드 추가. 기존과 동일하게 `setting_value`(jsonb) 안에 전체 `mainLogo` 객체를 그대로 저장해 병합.
  - `Navbar.tsx`: 로고+추가텍스트를 계정 영역(로그인/마이페이지 등)과 분리된 `flex-1` 컨테이너로 감싸고, 그 컨테이너에만 `justify-start`/`justify-center`/`justify-end`를 동적 적용 — 헤더 전체에 justify를 걸면 우측 계정 영역까지 로고 옆으로 끌려오는 문제가 있어, "로고 정렬"의 실제 의도(로고 블록 자체의 위치)를 살리면서 계정 영역 배치는 그대로 유지하도록 범위를 좁혔다. 추가 텍스트가 있으면 로고 옆에 `fontFamily`/`fontWeight`/`fontSize` 인라인 스타일로 렌더링.
  - 검증: `npm run type-check`/`npm run lint` 통과 확인. `site_settings` 라이브 미적용 + 로컬 포트 점유로 실제 렌더링은 직접 확인하지 못함(아래 참고).

## 2026-07-27 (EPIC-033)
- **EPIC-033: Admin CMS — direct file upload & dynamic logo/slideshow styling**
  - `admin/navigation/settings/page.tsx`: 메인 로고·슬라이드 이미지에 `<input type="file" accept="image/*">`를 추가 — 선택 시 Supabase Storage(`public-assets` 버킷, `main_logo/`·`slides/` 경로)에 즉시 업로드하고 반환된 public URL을 기존 URL 텍스트 입력값에 그대로 채운다(URL 직접 입력도 fallback으로 계속 동작). 업로드 실패(버킷 미생성 등)는 기존 에러 배너로 표시.
  - `main_logo`에 "로고 높이 (px)" 숫자 필드(`heightPx`, 기본 64) 추가. `hero_slideshow`에 "자동 전환 시간 (초)"(`autoAdvanceSeconds`, 기본 5)와 "이미지 채움 방식"(`objectFit`: cover/contain) 필드 추가 — `setting_value`가 jsonb라 스키마 변경 없이 안전하게 저장됨. `addSlide`/`updateSlide`/`removeSlide`가 기존에 `{ slides }`만 반환해 새 필드를 매번 지워버리던 버그를 `...prev` 스프레드로 수정.
  - `Navbar.tsx`: 로고 `<img>`의 고정 `h-16` 클래스를 제거하고 `mainLogo.heightPx`를 인라인 `style.height`로 동적 적용(기본 64px).
  - `HeroSlideshow.tsx`: `autoAdvanceSeconds`/`objectFit`을 props로 받아 `setInterval` 주기와 `object-cover`/`object-contain` 클래스에 반영(둘 다 기본값 있어 하위호환).
  - `src/app/page.tsx`(지시문의 수정 대상 파일 목록에는 없었지만, `HeroSlideshow`에 새 설정값을 실제로 전달하는 연결 지점이라 함께 수정 — 그 외 로직 변경 없음): `hero_slideshow`의 `autoAdvanceSeconds`/`objectFit`도 함께 조회해 `HeroSlideshow`에 전달.
  - 검증: `npm run type-check`/`npm run lint` 통과 확인. `public-assets` Storage 버킷 존재 여부와 실제 업로드 동작은 라이브 환경에서 사용자 확인 필요(아래 참고).

## 2026-07-26 (EPIC-032)
- **EPIC-032: Homepage & Navbar site_settings integration**
  - `Navbar.tsx`: `site_settings.main_logo`를 클라이언트에서 조회(`fetchNavTabs`와 동일한 패턴)해 로고를 대체. `type: "image"`이고 `imageUrl`이 있으면 이미지로, 아니면 저장된 텍스트로 렌더링하고, 값이 없거나 테이블이 아직 라이브에 없으면 기존 하드코딩 텍스트("사일로 스토어")로 자동 대체(로고가 비는 일 없음). `Navbar`는 `useAuth`/`useSearchParams`에 의존하는 기존 Client Component 구조라 async Server Component로 전환하지 않고, EPIC-023의 `fetchNavTabs()`와 같은 최소 지연 클라이언트 패칭 패턴을 그대로 따름.
  - `src/app/page.tsx`: 그대로 남아있던 create-next-app 기본 템플릿을 실제 홈페이지로 교체. async Server Component로 `site_settings.hero_slideshow`를 서버에서 직접 조회(깜빡임 없음) — 슬라이드가 있으면 이미지·제목·설명 카드 그리드로, 없으면(테이블 미적용 포함) 브랜드 텍스트 + `/shop` 링크로 이루어진 기본 히어로 섹션을 표시.
  - 검증: `npm run type-check`/`npm run lint` 통과 확인. `site_settings` 테이블이 라이브 DB에 아직 없어(EPIC-026 후속) 실제 데이터 연동은 로컬에서 직접 확인하지 못함 — 아래 참고.

## 2026-07-26 (EPIC-031)
- **EPIC-031: Admin Post Management — pagination & is_hidden column**
  - `posts` 테이블에 관리자 전용 숨김 플래그 `is_hidden`(boolean, not null default false) 컬럼 추가(`docs/database-schema.sql`, 라이브 DB에는 아직 미적용 — 아래 ALTER TABLE 문을 Supabase SQL Editor에서 직접 실행 필요). EPIC-028에서 임시로 `posts.visibility='private'`를 재사용하던 "숨기기"가 작성자 본인의 비공개 설정과 뒤섞이던 문제를 해결.
  - `admin/posts/salon/page.tsx`: `toggleHidden`이 이제 `visibility` 대신 `is_hidden`을 업데이트하고, "공개 여부" 배지도 `is_hidden` 기준으로 표시.
  - `admin/posts/salon/page.tsx`: 임시 `.limit(200)`(`FETCH_LIMIT`)을 제거하고 `PAGE_SIZE=20` 단위 페이지네이션으로 교체 — `.range()` + `{ count: 'exact' }`로 총 건수를 가져와 이전/다음 버튼과 "N / 총 페이지" 표시 구현. `board_type` 필터 변경 시 페이지를 1로 재설정(같은 이벤트 핸들러에서 두 state를 함께 갱신해 불필요한 이중 조회 방지).

## 2026-07-26 (EPIC-030)
- **EPIC-030: Studio Portfolio Registration — submit UX fix**
  - 작업 지시가 요청한 `styling_projects`/`styling_project_media`/`styling_project_items` 3테이블 연동 폼(`/admin/projects/new`)은 EPIC-016에서 이미 완전히 구현되어 있었음(`docs/EPIC.md` 완료 목록 확인) — `page.tsx`가 3개 테이블 모두 다루는 폼을 갖추고 있고 `POST /api/styling-projects`(`src/app/api/styling-projects/route.ts`)가 이미 세 테이블에 순차 insert. 지시문의 "제목(title)" 필드는 실제 스키마에 없고(`client_name`+`industry`가 실제 필드 — 담당 업체를 기록하는 기능이라 의도적으로 다름), 사용자 확인 결과 스키마 변경 없이 기존 구현을 유지하기로 함.
  - 유일하게 지시문과 실제 동작이 다르던 지점만 수정: 등록 성공 시 기존에는 `/shop/projects/[id]`로 즉시 이동했으나, 지시문이 요구한 "성공 알림 후 폼 초기화" 동작으로 변경(`window.alert` + 전체 폼 상태 리셋). 더 이상 쓰이지 않는 `useRouter` import 제거.
  - `src/app/api/styling-projects/route.ts`는 기존 로직이 이미 요구사항(3테이블 순차 insert, 관리자 체크)을 충족해 변경 없음.

## 2026-07-26 (EPIC-029)
- **EPIC-029: Member Collections CRUD Implementation**
  - `mypage/CollectionModal.tsx` 신규 작성: `member_collections`의 8개 카테고리(`book`/`movie`/`music`/`artist`/`place`/`scent`/`brand`/`era`)를 모두 처리하는 범용 등록/수정 모달. `title`(필수)/`description`(선택)/`image_url`(선택) 입력, `item` prop이 `null`이면 신규 등록(insert), 실제 항목이면 수정(update) 모드로 동작.
  - `CollectionsPanel.tsx` 연동: "나의 보물"(주문 재사용) 탭을 제외한 8개 서브탭 상단에 "+ 아이템 추가" 버튼 배치, 각 카드에 수정(✏️)/삭제(🗑️) 아이콘 버튼 추가(삭제는 `window.confirm` 확인 후 실행). `@supabase/supabase-js` 브라우저 클라이언트로 `member_collections`에 직접 Insert/Update/Delete(EPIC-023 이후 admin CMS 관례와 동일하게 별도 API Route 없음), `reloadKey` state로 CUD 완료 시 목록 즉시 재조회.
  - 검증: 라이브 DB에 anon key REST(`/rest/v1/member_collections?select=id&limit=1`)로 조회한 결과 `200 []` — `docs/database-schema.sql` 상단 동기화 노트(EPIC-022가 "아직 라이브 미적용"이라 표기)와 달리 테이블이 실제로는 이미 라이브에 존재함을 확인(로그인 세션이 없어 실제 CUD 동작 자체는 사용자 확인 필요 — 아래 참고).

## 2026-07-26 (EPIC-028)
- **EPIC-028: Admin Post Management Implementation (Shop & Salon)**
  - `admin/posts/shop/page.tsx`를 Placeholder에서 실 구현으로 교체: `items` 테이블(`docs/database-schema.sql` §2)을 데이터 테이블로 조회, 시대(Time Slip 8종) 필터, 상태 뱃지(판매중/대여중/판매완료/비활성), 활성화·비활성화 토글(`status` ↔ `available`/`archived`), 삭제 버튼 구현.
  - `admin/posts/salon/page.tsx`를 Placeholder에서 실 구현으로 교체: `posts`+`boards` 조인(`docs/database-schema.sql` §6)으로 게시판 글을 최신순 데이터 테이블로 조회, `board_type` 7종 필터(`boards!inner` join으로 DB 단에서 필터링), 작성자 이름은 `public_profiles` 뷰로 별도 조회 후 클라이언트에서 병합(CLAUDE.md 규칙 — 다른 회원 이름은 항상 `public_profiles` 경유). 개인 마이피드 글(`board_id is null`)은 이 화면 대상에서 제외.
  - "숨기기" 기능은 이 스키마에 관리자 전용 노출 플래그가 없어, 기존 `posts.visibility`를 `'private'`로 바꾸는 방식으로 대체 구현(스키마 변경은 이번 EPIC 범위 밖 — 전용 컬럼이 필요하면 별도 Epic에서 추가할 것).
  - 두 페이지 모두 별도 API Route 없이 브라우저에서 anon key + RLS(admin bypass)로 직접 CUD(EPIC-023 이후 admin CMS 관례 유지).
  - 검증: 실제 물품 상태 토글(판매중→비활성→판매중 복원), 시대 필터, 게시판 글 board_type 필터(패트론 라운지 필터 시 정상적으로 0건) 모두 실 데이터로 확인.

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
