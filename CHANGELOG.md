# CHANGELOG

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
