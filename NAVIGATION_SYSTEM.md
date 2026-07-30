# NAVIGATION SYSTEM

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> 기존 `PROJECT_BLUEPRINT.md`에 흩어져 있던 내비게이션 관련 서술(§1 프로젝트 개요, §7 공통
> 컴포넌트의 `Navbar.tsx` 단락)을 모은 것입니다. 정보를 삭제하거나 요약하지 않았습니다.
>
> ⚠️ **`PROJECT_BLUEPRINT.md` 자체의 내비게이션 서술은 한 단락뿐입니다** — 전체 내비게이션
> 구조(Top nav, 좌/우 Sidebar, URL, placeholder 여부, 활성 탭 판정 로직)의 실제 상세 SSoT는
> 이미 [docs/navigation-blueprint.md](docs/navigation-blueprint.md)이며, `PROJECT_BLUEPRINT.md`는
> 그쪽으로 링크만 하고 있었다. 이 문서는 그 상세 문서를 대체하지 않으며,
> `PROJECT_BLUEPRINT.md`에 있던 내용만 옮겼다.

## Top Tabs (구 PROJECT_BLUEPRINT.md §1, §7)

**상단 네비게이션(EPIC-018 이후)**: 사일로상점/살롱데상/공간 문의/마이페이지 4개 탭, 화면
중앙 정렬.

`Navbar.tsx`가 상단에 이 4개 진입점(화면 중앙 정렬) + 계정 영역(로그인 상태 표시, 마이페이지
링크, 로그아웃)을 렌더링한다. `NAV_TABS`(`navConfig.ts`)를 그대로 순회하며 각 탭의
`type`(`sidebar-left`/`sidebar-right`/`dropdown`/`link`)에 따라 상호작용 방식만 분기하고,
라벨/링크/그룹은 하드코딩하지 않는다(EPIC-018).

## Left Sidebar / Right Sidebar (구 PROJECT_BLUEPRINT.md §7)

사일로상점·살롱데상은 탭 클릭 또는 화면 좌/우 가장자리 아이콘(🔑/🚪) 클릭·hover 시 각각 좌/우
사이드바가 열리는 구조(초록 배경/흰 글씨).

## Hub Pages (구 PROJECT_BLUEPRINT.md §7.5, Board System과 공유)

Page 하나에 여러 Board(하위 게시판)를 나란히 배치하는 hub 구조는 `src/app/boards/page.tsx`에서
구현된다 — parent가 없는 최상위 hub(Silo Store/Online Docent/Heritage/Community/Membership/
Gallery/Archive/Studio)마다 `slide_board` 모듈을 하나씩 배치한다. 상세는
[`PAGE_BUILDER.md`](PAGE_BUILDER.md)/[`BOARD_SYSTEM.md`](BOARD_SYSTEM.md) 참고(이 내용은 두
문서에도 동일하게 등장한다 — Page 조립 관점과 Board 관점 양쪽에서 필요한 원문).

## Board Pages

`BoardRenderer`의 `hub` 레이아웃은 중첩 구조를 지원한다(EPIC-049) — 상세는
[`BOARD_SYSTEM.md`](BOARD_SYSTEM.md) 참고.

## Navigation hierarchy — 활성 탭 판정

`getActiveNavTabKey()`로 현재 경로에 맞는 탭을 하이라이트한다(구 PROJECT_BLUEPRINT.md §7).

## 전체 상세

Top nav/좌우 Sidebar/URL 구조/placeholder 여부/활성 탭 판정 로직의 전체 상세는
[docs/navigation-blueprint.md](docs/navigation-blueprint.md) 참고.
