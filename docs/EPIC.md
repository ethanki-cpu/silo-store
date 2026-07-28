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
- EPIC-054B : Page(화면)와 Board(게시판) 개념 분리 — `src/lib/pageModules.ts`(16종 `PageModuleKind`: Hero/Story Board/Gallery Board/List Board/Slide Board/Timeline/Comment/Search/Pagination/Notice/CTA/Form/Calendar/Survey/Ranking/Profile Card + 판별 유니온 `PageModuleConfig`/`PageDefinition`) + `src/components/modules/PageModuleRenderer.tsx`(모듈 배열을 순서대로 렌더링하는 조합기) 신설. Board 계열(Story/Gallery/List/Slide Board)·Timeline·Comment·Pagination은 기존 Board Definition System/Timeline Engine 컴포넌트를 그대로 재사용, Search/CTA는 `BoardHeader.tsx`에서 `SearchInput`/`CtaButtons`로 추출해 공유(중복 제거), 재사용할 기존 컴포넌트가 없던 Notice/Form/Calendar/Survey/Ranking/Profile Card 6개만 최소 프레젠테이션 셸 신규 작성. 콘텐츠/실제 Board 행/이 시스템을 사용하는 Page 인스턴스는 전혀 만들지 않음(구조만 준비, 향후 EPIC이 실제 데이터로 채움).
- EPIC-054C : 모든 Page를 Board와 연결 — `src/components/modules/BoardModule.tsx` 신규(boardId 하나로 정의 조회+posts 조회+Search/Sort/Pagination을 전부 스스로 처리하는 자기완결형 모듈, 기존 `/boards/[id]/page.tsx` 로직을 그대로 이전). Story/Gallery/List/Slide Board 4종 모두 이 컴포넌트로 통일(`PageModuleConfig`의 `BoardModuleProps`를 `{boardId, includeChildBoards?}`로 단순화). `/boards/[id]/page.tsx`는 `<BoardModule boardId=.../>` 하나만 렌더링(Board 1개)하도록 축소, `/boards/page.tsx`(디렉토리)는 최상위 hub마다 `slide_board` 모듈을 만들어 `PageModuleRenderer`로 **한 Page에 여러 Board를 나란히 배치**(Page 하나 = Board 하나 구조가 아님을 실제로 증명) — 기존 "게시판 허브" 바로가기 카드/레거시 그룹 링크 목록은 순수 내비게이션이라 그대로 유지. `src/components/modules/EmptyState.tsx` 신규 — `BoardRenderer`의 게시글 0건 분기와 `PageModuleRenderer`의 모듈 0개 분기가 공유(Placeholder Module 대신 Empty State UI). 모든 Story/Community/Timeline 정의는 이미 searchable/sortable/pageable=true(hub만 예외, 설계상 의도).

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
