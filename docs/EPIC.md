# EPIC LIST

## 완료
- EPIC-001 : 사용자 인증
- EPIC-002 : 멤버십 시스템
- EPIC-003 : 상점
- EPIC-004 : 게시판
- EPIC-005 : 마이페이지
- EPIC-006 : 온라인 도슨트
- EPIC-007 : 대관 시스템
- EPIC-008 : 살롱 체크인
- EPIC-009 : 관리자 결제
- EPIC-010 : 다운로드
- EPIC-011 : 출석체크
- EPIC-012 : 설문
- EPIC-013 : 캐릭터 은행
- EPIC-014 : Time Slip
- EPIC-015 : Your Treasures
- EPIC-016 : 공간 스타일링 포트폴리오
- EPIC-017 : Navigation 재구성 + Wishlist
- EPIC-018 : 상단 탭 재구성 (스튜디오 대관 → 공간 문의 통합, 마이페이지 탭 추가, 중앙 정렬)
- EPIC-019 : Studio Navigation Rename ("공간 문의" → "스튜디오" 라벨 변경)
- EPIC-020 : Google OAuth "No API key found in request" 버그 수정 (`.env.local`의 `NEXT_PUBLIC_SUPABASE_URL` `/rest/v1/` 접미사 제거)
- EPIC-021 : Bug Investigation — Google 로그인 재확인 및 해결 (PC별 `.env.local`/서버 재시작 필요성 확인)
- EPIC-022 : 마이페이지 11개 탭 재구성 + `member_collections`/`member_follows`/`member_badges`/`member_visitors` 스키마 설계
- EPIC-023 : 동적 네비게이션(`site_navigations`) + 카테고리(`site_categories`) 관리자 CMS
- EPIC-024 : 관리자 대시보드 레이아웃 및 인증 가드 수정
- EPIC-025 : 관리자 대시보드 재구성 및 중첩 라우팅
- EPIC-026 : 관리자 홈페이지 설정(`site_settings`) 구현
- EPIC-027 : BugFix — Navigation Editor 저장 기능 추가
- EPIC-028 : 관리자 게시글 관리(상점/살롱) 구현
- EPIC-029 : 나의 컬렉션(Member Collections) CRUD 구현
- EPIC-030 : 스튜디오 포트폴리오 등록 — 제출 UX 개선
- EPIC-031 : 관리자 게시글 관리 — 페이지네이션 및 `is_hidden` 컬럼
- EPIC-032 : 홈페이지 & Navbar `site_settings` 연동
- EPIC-033 : 관리자 CMS — 파일 직접 업로드 및 로고/슬라이드쇼 동적 스타일링
- EPIC-034 : 로고 및 헤더 고급 커스터마이징
- EPIC-034-Ext : 로고 텍스트 고급 스타일링
- EPIC-035 : Tistory 스타일 드래그앤드롭 카테고리 CMS
- EPIC-035-Fix : 카테고리 CMS 일원화 및 구버전 페이지 정리
- EPIC-036 : 로고 텍스트 색상 및 슬라이드 배경 Wallpaper
- EPIC-037 : 내비게이션 hover/click UX 개선
- EPIC-039 : 마스터 UI 개선 — 사이드바/아이콘/로고 텍스트/hover/랜덤 Wallpaper
- EPIC-040 : 마스터 UI — 중첩 드롭다운, 독립 사이드바, 로고 텍스트, 랜덤 Wallpaper
- EPIC-041-042 : UI 통합 개선 — hover UX, 커스텀 폰트, 아이콘, 홈 큐레이션
- EPIC-041-042-HOTFIX : hover 버그 수정 및 직접 URL 입력 방식 전환
- EPIC-043 : 폰트 설정 개편, 사이드바 클릭 전용 + hover 아코디언
- EPIC-044 : 동적 라우팅, 내비게이션 데이터 대량 주입 및 UniversalBoard 컴포넌트
- EPIC-045 : 마이페이지 재구성 — 박물관 컨셉, 라우트 기반 탭 구조
- EPIC-046 : 게시판 디자인 시스템을 Editorial Magazine으로 통일
- EPIC-047 : 게시판 공통 Board Engine 구축(Part 1: BoardRenderer 기반 community/story/gallery/hub) + Board Definition System 전환(Part 2: config만으로 게시판을 정의하는 BOARD_DEFINITIONS 레지스트리, 하드코딩된 그룹 판별 로직 제거)
- EPIC-048 : Board Definition System으로 Silo Store 실제 게시판 20개 생성(hub 3개: Silo Store/Online Docent/Heritage + story 17개) — 새 페이지/컴포넌트 없이 config 추가만으로 생성, BoardRenderer의 hub 레이아웃 실제 구현
- EPIC-049 : Board Definition System으로 Salon des Cent Community 영역 게시판 생성(최상위 hub Community + 하위 9개(중첩 hub 3개 포함) + 기존 DB의 클럽 13개/모임방 7개를 재분류) — 새 DB 행은 10개만 추가, 나머지 20개는 기존 board_type='topic'/'group' 행 재사용, 새 페이지/컴포넌트 없이 config 추가만으로 생성
- EPIC-050 : Board Definition System으로 Salon des Cent Membership/Gallery/Archive 영역 게시판 생성(hub 3개 + 하위 14개, 전부 신규 DB 행) — 5번째 boardType "timeline" 추가(BoardRenderer 내 재사용 가능한 Timeline Engine), BoardDefinition에 accessLevel 필드 추가하고 "패트론 게시판"에 실제 serverAuth.ts 인가 로직 연결
- EPIC-051 : Board Definition System으로 Studio(공간 문의) 영역 게시판 생성(hub 1개 + story 4개, 전부 신규 DB 행) — 새 예약 시스템 없이 BoardDefinition.ctas 필드로 "문의하기"/"예약하기"/"대표 프로젝트 보기" 버튼을 기존 /rental·/space-inquiry/*·/shop/projects(styling_projects) 페이지에 연결, hub 슬라이드에 대표 이미지(photo_url) 표시 추가
- EPIC-052 : 마이페이지를 Personal Hub로 확장 — Tiptap Block Editor 도입(모든 Board Definition 게시판 글쓰기 폼 공용, posts.body에 HTML 저장 + 서버 sanitize), Timeline Engine 추출·재사용(groupByYearMonth+TimelineView), "나의 컬렉션" 비공개 유지하며 StoryCard로 시각 통일, 살롱/도슨트 수료증/공간/전시회 Placeholder를 실데이터로 교체, 버킷리스트 신규 기능(member_bucket_list) 추가
- EPIC-054A : 모든 상위/하위 메뉴가 실제 Page를 갖도록 정비 — `<ComingSoon>`을 렌더링하던 19개 placeholder 페이지(사일로 Heritage 할머니/할아버지, 살롱 Community/Membership/Gallery 각 항목, 스튜디오 물품 대여/공간 스타일링, nav 미연결 orphan 3개(투어 도슨트/음료 주문/공간 촬영 대관 구 페이지))를 전부 공용 `PageHeader` 컴포넌트(Title/Subtitle/Breadcrumb/Description/Page Container)로 교체하고 `ComingSoon.tsx` 삭제 — 게시판 연결/기능 추가/Block Editor 수정/Board Module 생성은 범위 밖. 라이브 nav(site_navigations DB 시드 기준, docs/navigation-blueprint.md)에 연결된 모든 메뉴가 404 없이 실제 페이지로 연결됨을 확인.
- EPIC-054B : Page(화면)와 Board(게시판) 개념 분리 — `src/lib/pageModules.ts`(16종 `PageModuleKind`: Hero/Story Board/Gallery Board/List Board/Slide Board/Timeline/Comment/Search/Pagination/Notice/CTA/Form/Calendar/Survey/Ranking/Profile Card + 판별 유니온 `PageModuleConfig`/`PageDefinition`) + `src/components/modules/PageModuleRenderer.tsx`(모듈 배열을 순서대로 렌더링하는 조합기) 신설. Board 계열(Story/Gallery/List/Slide Board)·Timeline·Comment·Pagination은 기존 Board Definition System/Timeline Engine 컴포넌트를 그대로 재사용, Search/CTA는 `BoardHeader.tsx`에서 `SearchInput`/`CtaButtons`로 추출해 공유(중복 제거), 재사용할 기존 컴포넌트가 없던 Notice/Form/Calendar/Survey/Ranking/Profile Card 6개만 최소 프레젠테이션 셸 신규 작성. 콘텐츠/실제 Board 행/이 시스템을 사용하는 Page 인스턴스는 전혀 만들지 않음(구조만 준비, 향후 EPIC이 실제 데이터로 채움).
- EPIC-054C : 모든 Page를 Board와 연결 — `src/components/modules/BoardModule.tsx` 신규(boardId 하나로 정의 조회+posts 조회+Search/Sort/Pagination을 전부 스스로 처리하는 자기완결형 모듈, 기존 `/boards/[id]/page.tsx` 로직을 그대로 이전). Story/Gallery/List/Slide Board 4종 모두 이 컴포넌트로 통일(`PageModuleConfig`의 `BoardModuleProps`를 `{boardId, includeChildBoards?}`로 단순화). `/boards/[id]/page.tsx`는 `<BoardModule boardId=.../>` 하나만 렌더링(Board 1개)하도록 축소, `/boards/page.tsx`(디렉토리)는 최상위 hub마다 `slide_board` 모듈을 만들어 `PageModuleRenderer`로 **한 Page에 여러 Board를 나란히 배치**(Page 하나 = Board 하나 구조가 아님을 실제로 증명) — 기존 "게시판 허브" 바로가기 카드/레거시 그룹 링크 목록은 순수 내비게이션이라 그대로 유지. `src/components/modules/EmptyState.tsx` 신규 — `BoardRenderer`의 게시글 0건 분기와 `PageModuleRenderer`의 모듈 0개 분기가 공유(Placeholder Module 대신 Empty State UI). 모든 Story/Community/Timeline 정의는 이미 searchable/sortable/pageable=true(hub만 예외, 설계상 의도).
- EPIC-054D : 사이트 전체 Navigation/Routing/SEO/Breadcrumb/404/URL 구조 전수 감사(Audit) — 새 기능/디자인/게시판/Block 생성 없이 감사 및 리팩토링만 수행. **핵심 발견**: `navConfig.ts`의 `FALLBACK_NAV_TABS`(EPIC-044 재작성분)와 실제 라이브 `site_navigations`(DB 시드, `docs/navigation-blueprint.md` 반영분)가 서로 다른 두 개의 nav 구조로 공존(P0, 별도 EPIC 필요) — 코드 링크 기준으로는 죽은/중복 링크 없음, 실제 문제는 이 이중 구조로 인한 orphan/중복 콘텐츠(`/shop/heritage/*` 정적 페이지 vs `/heritage/*/[name]` 동적 라우트 등). **적용한 수정**: (1) SEO — root `metadata`를 create-next-app 기본값("Create Next App")에서 실제 사이트 정보(title/description/OpenGraph/Twitter Card/`metadataBase`)로 교체, `lang="en"→"ko"`; (2) Sitemap — `src/app/sitemap.ts` 신규, `src/app` 파일시스템을 직접 스캔해 정적 라우트를 자동 포함(새 page.tsx 추가 시 코드 수정 불필요) + 하드코딩 이름 목록(heritage/community) + Supabase 동적 콘텐츠(boards/items/docent_contents/clubs) 조합; (3) robots.txt — `src/app/robots.ts` 신규, 관리자/마이페이지/인증 폼 제외 + sitemap 링크; (4) 접근성 — `LeftSidebar`/`RightSidebar`에 Escape 닫기, 닫힐 때 트리거로 포커스 복귀, `inert`/`aria-hidden`(닫힘 시), `aria-expanded`; `Navbar` 드롭다운에 `group-focus-within`(키보드 Tab으로도 열리도록, JS state 재도입 없이) + `aria-haspopup`; (5) 성능 — `Navbar`의 `leftSidebarTab`/`rightSidebarTab` 파생값 `useMemo`(단, `fontFamilyValue`는 eslint-config-next의 React Compiler 대비 lint 규칙과 충돌해 원래 형태 유지, 컴파일러 자체는 아직 미활성). Breadcrumb 자동 생성·Responsive 재설계는 "새 기능/디자인 추가 금지" 범위를 벗어나 구현하지 않고 P1 아키텍처 발견사항으로만 기록(NEXT_TASK.md).
- EPIC-054E : EPIC 번호와 프로젝트 진행 단계(Stage)를 분리하는 운영 체계 구축(문서/프로세스만, 코드 변경 없음) — `docs/STAGES.md` 신규(Stage 1 Foundation ~ Stage 6 Scale 6단계 정의, Stage 1의 14개 세부 항목을 EPIC-054D까지의 실제 코드 상태로 감사해 완료/부분/미착수 분류, Block Editor 완전판이 별도 미병합 브랜치 `feature/EPIC-053`에만 있음을 명시), `docs/PROJECT_DASHBOARD.md` 신규(Current Stage/Progress/Current·Next EPIC/Recent Completed 10/Current Priority/Known Issues P0-P3/Technical Debt/Next Milestone — 매 세션 가장 먼저 읽는 현황 문서), `PROJECT_BLUEPRINT.md`에 §11(Project Stages/Dashboard/Current Stage/Current Milestone) 추가, `CLAUDE.md`에 "세션 시작 시 읽기 순서"(PROJECT_DASHBOARD → STAGES → PROJECT_BLUEPRINT) + EPIC 완료 시 문서 동기화 규칙(4개 문서) 신설. Stage(진행 단계)와 EPIC(작업 기록)은 절대 혼용하지 않는다는 원칙을 명문화.
- EPIC-054F : 모든 상위/하위 카테고리 메뉴가 실제 Page(Route)를 갖도록 정비 — 새 기능/디자인/DB/게시판/Block/Editor 없이 Page 생성만 수행. Community/Heritage(동적 서브라우트만 있고 인덱스 없음)와 Studio/Membership/Gallery/Archive(디렉토리 자체 없음) 6곳이 404였음을 확인(마이페이지 12개 탭·Online Docent는 이미 완비 확인, 변경 없음). 공용 `PageTemplate`(`src/components/PageTemplate.tsx`) 신설 — 기존 `PageHeaderContent`(EPIC-054A에서 분리)+`BoardModule`(EPIC-054C)만 조합, 새 디자인 없음. `src/lib/useHubBoardId.ts` 신규(slug→board id 조회 훅, 기존 `/boards/page.tsx` 패턴 재사용). `/community`·`/heritage`·`/studio`·`/membership`·`/gallery`·`/archive` 6개 페이지 신설 — Board 미연결 시 EmptyState("게시글이 없습니다.") 정상 노출 확인(브라우저 검증). Route 총 76개(page.tsx 기준, 기존 70 + 신규 6). legacy `board_type='archive'`와 신규 hub `archive`의 slug 충돌 1건 발견·기록(수정 안 함, P2 — Board Definition System 변경은 범위 밖).
- EPIC-055 : Universal Board System 완성 — 모든 페이지를 실제 게시판에 연결(새 페이지/기능/DB/Board 컴포넌트 없이 연결+중복 제거만). `src/components/shared/UniversalBoard.tsx`(EPIC-044, 실데이터 없는 뼈대 stub, 자체 검색/정렬 재구현)가 `/heritage/grandma|grandpa/[name]`·`/community/club/[name]`(최대 69개 이름별 URL)에서 여전히 쓰이며 실제 게시판과 미연결 상태였음을 발견·해결 — 전부 `PageTemplate`+`BoardModule`로 교체(할머니/할아버지는 공유 `grandmas`/`grandpas` 스토리 게시판, 클럽/주제는 `useBoardIdByName` 신규 훅으로 이름이 정확히 일치하는 기존 board에 연결). `UniversalBoard.tsx` 삭제 + `src/components/mypage/EmptyState.tsx`(Board System의 `modules/EmptyState.tsx`와 중복, 12곳 사용)를 통합 삭제. Board Config(`boardLayout.ts` 하나만 수정해 게시판 추가 가능한 구조)는 이미 충족돼 있음을 재확인, 변경 없음. `/shop`·`/docent`·마이페이지 개인 데이터는 게시판이 아니라는 이유로 Board 연결 대상에서 의도적으로 제외.

## 진행중
(없음)

## 예정
(비워둠)

## 규칙

- 앞으로 새로운 기능을 만들면 반드시 EPIC 번호를 부여합니다.
- 기능 완료 시 "완료"로 이동합니다.
- 진행 중인 기능은 "진행중"에 둡니다.
- 다음 작업 예정은 "예정"에 둡니다.
- CHANGELOG.md와 NEXT_TASK.md와 함께 항상 최신 상태를 유지합니다.
