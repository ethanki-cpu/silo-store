# BOARD SYSTEM

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> 기존 `PROJECT_BLUEPRINT.md`에 흩어져 있던 게시판(Board) 관련 서술(§4 주요 기능의 게시판 행,
> §6 인증 구조의 권한 판정 함수, §7.5 Page Module 시스템의 Board 연결 부분)을 모은 것입니다.
> 정보를 삭제하거나 요약하지 않았습니다 — 원문 그대로입니다.
>
> ⚠️ **`PROJECT_BLUEPRINT.md` 자체에는 게시판 시스템의 "요약"만 있고, 실제 상세 SSoT는 이미
> [docs/content-blueprint.md](docs/content-blueprint.md) §1(게시판)에 훨씬 자세히 존재합니다**
> (라우트별 동작, API 스펙, 필드 목록, 포인트 규칙, `posts.order_id` 연결 등). 이 문서는 그
> 상세 문서를 대체하지 않으며, `PROJECT_BLUEPRINT.md`에 있던 내용만 옮겼다 — 두 문서가
> 상당 부분 겹친다는 것은 이번 재구성의 최종 보고("중복 발견 사항")에 명시했다.

## Board Types (구 PROJECT_BLUEPRINT.md §4 "게시판" 행)

자유/클럽주제/모임별/패트론/아티스트홍보/After Adoption/자료게시판/Q&A(그룹 8종) + EPIC-048(Silo
Store 20개) + EPIC-049(Community 영역, 기존 DB 재분류 포함) + EPIC-050(Membership/Gallery/Archive
17개) + EPIC-051(Studio 5개, 예약/문의는 `ctas`로 기존 `/rental`·`/space-inquiry/*`·`/shop/projects`
연결).

라우트: `/boards`(hub), `/boards/[id]`, `/boards/[id]/write`, `/boards/[id]/[postId]`.

## Rendering (구 PROJECT_BLUEPRINT.md §4)

디자인은 EPIC-046부터 "Editorial Magazine" 시스템, EPIC-047부터 **Board Definition
System**(`src/lib/boardLayout.ts`의 `BOARD_DEFINITIONS`/`INDIVIDUAL_BOARD_DEFINITIONS` config +
`resolveBoardDefinition()` + `BoardRenderer`)으로 전 게시판이 동일 엔진을 공유 — 새 게시판은 DB
시드 행 + config 정의 추가만으로 생성 가능(코드 변경 없음, 기존 DB 행 재사용도 가능).
`BoardRenderer`의 `hub` 레이아웃은 중첩 구조를 지원(EPIC-049)하고 5번째 레이아웃
`timeline`(EPIC-050)이 있다. 상세는 `docs/design-system.md` §10, `docs/content-blueprint.md` §1.

## Board Lifecycle / 관계 (구 PROJECT_BLUEPRINT.md §4, §7.5)

- `BoardDefinition.accessLevel`(EPIC-050)로 커스텀 등급 게이팅, `BoardDefinition.ctas`(EPIC-051)로
  기존 예약/문의 페이지 연결 버튼을 config만으로 추가할 수 있다.
- **Page Module 시스템과의 연결(EPIC-054C, 구 §7.5)**: `src/components/modules/BoardModule.tsx` —
  게시판 하나(`boardId`)를 Page 어디에든 꽂을 수 있는 자기완결형 모듈. 정의 조회, `posts` 조회,
  Search/Sort/Pagination 상태 관리(디바운스 포함)를 전부 스스로 처리한다. 기존
  `src/app/boards/[id]/page.tsx`에만 있던 로직을 그대로 옮긴 것(동작 변경 없음). `definition.boardType`이
  무엇이든(story/gallery/community/hub/timeline) `BoardRenderer`가 알아서 맞는 레이아웃을 그리므로,
  story/gallery/list/slide board 4종 모두 이 컴포넌트 하나로 커버된다. **핵심 설계**: boardId만
  있으면 어디서든 재사용 가능해, 여러 개를 한 Page에 나란히 배치해도 상태가 섞이지 않고("Page
  하나 = Board 하나" 구조를 강제하지 않음), 추후 Block Editor의 "게시판 임베드" 블록이 boardId
  하나만 넘기면 그대로 연동될 수 있다. (이 부분은 [`PAGE_BUILDER.md`](PAGE_BUILDER.md)에도
  동일하게 기록되어 있다 — Page 관점/Board 관점 양쪽에서 필요한 원문이라 양쪽에 보존했다.)
  - 실제 연결 지점: `src/app/boards/[id]/page.tsx`(`<BoardModule boardId={id} />` 하나만 렌더링,
    Board 1개) / `src/app/boards/page.tsx`(최상위 hub마다 `slide_board` 모듈 — 한 Page에 여러
    Board를 나란히 배치).
  - 재사용을 위해 `export` 처리한 기존 코드(동작 변경 없음): `src/lib/boardLayout.ts`의
    `story()`/`community()`/`hub()`/`timeline()` 빌더 함수, `src/components/boards/CommentSection.tsx`의
    `Comment` 타입.

## Board Permissions (구 PROJECT_BLUEPRINT.md §6 인증 구조)

- **`serverAuth`** (`src/lib/serverAuth.ts`)의 `canReadBoard` / `canWriteToBoard`: 게시판 타입별
  열람/쓰기 권한 판정.
- 가격·열람 권한처럼 위조 방지가 필요한 값은 클라이언트가 아니라 Route Handler가
  `getRequestMember`/`getTier`로 서버에서 재계산한다(사용자가 API를 직접 호출해도 신뢰할 수 있는
  값만 응답) — 등급 체계 자체는 [`MEMBERSHIP_SYSTEM.md`](MEMBERSHIP_SYSTEM.md) 참고.

## Board Relationships (구 PROJECT_BLUEPRINT.md §4 마이페이지 행)

- 게시판 → 마이페이지: "Personal Hub"(EPIC-052) — 비공개 개인 데이터는 그대로 두고(`member_collections`/
  `orders`/`wishlists`/`member_follows`/`member_badges`/`member_visitors`/`comments`), Board
  Definition 게시판과 시각 언어(`StoryCard`)·Timeline Engine(`groupByYearMonth`+`TimelineView`)만
  공유한다. `/mypage`의 `timeline` 탭은 `points_ledger`+`likes`+`member_follows`를 종합해 보여준다
  — 포인트 체계 자체는 [`POINT_SYSTEM.md`](POINT_SYSTEM.md) 참고.
- 게시판 → Page: 위 "Board Lifecycle" 절과 [`PAGE_BUILDER.md`](PAGE_BUILDER.md) 참고.
- 게시판 → 상점 주문 등 그 외 콘텐츠 간 연결 관계의 상세(예: After Adoption 게시글과 주문 데이터의
  관계)는 `PROJECT_BLUEPRINT.md`에는 서술되어 있지 않았다 — [docs/content-blueprint.md](docs/content-blueprint.md)가
  이 부분의 기존 SSoT이니 그쪽을 참고할 것(이 재구성 작업은 `PROJECT_BLUEPRINT.md`에 있던 내용만
  옮기는 것이라 여기에 새로 옮기지 않았다).
