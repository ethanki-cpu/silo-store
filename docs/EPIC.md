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
