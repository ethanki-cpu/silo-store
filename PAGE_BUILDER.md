# PAGE BUILDER

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> 기존 `PROJECT_BLUEPRINT.md` §7.5(Page Module 시스템, EPIC-054B/054C)를 그대로 옮긴 것입니다.
> 정보를 삭제하거나 요약하지 않았습니다 — 원문 그대로입니다.
>
> ⚠️ **중요한 구분**: 이 문서가 다루는 것은 `src/lib/pageModules.ts` + `PageModuleRenderer.tsx`
> 기반의 **컴파일 타임 Page Module 시스템(EPIC-054B/C)**이다. 이 프로젝트에는 이와 별개로,
> DB 테이블(`page_builder`/`page_modules`) 기반의 **Page Builder CMS(EPIC-060 이후, No-Code Visual
> Widget Builder까지 발전)**가 나중에 신설되었다 — Navigation이 Board가 아니라 이 CMS의 독립
> Page로 연결되는 더 최신 아키텍처다. `PROJECT_BLUEPRINT.md` 원문에는 이 최신 CMS를 설명하는
> 전용 절이 없었다(EPIC-060~068의 상세는 `CHANGELOG.md`/`docs/EPIC.md`에만 기록되어 있고
> Blueprint 본문에 정리된 적이 없음) — 그래서 이 문서도 원문을 옮기는 것만으로는 그 최신 CMS를
> 다루지 못한다. 이는 "정보 손실"이 아니라 애초에 `PROJECT_BLUEPRINT.md`에 없던 내용이라
> 옮길 것이 없었다는 뜻이며, 최종 보고에서 별도로 언급한다.

## Page → Modules → Widgets → Rendering (구 PROJECT_BLUEPRINT.md §7.5)

**목적**: "Page(화면)"와 "Board(게시판)"를 개념적으로 분리한다. `Board`는 여전히
`src/lib/boardLayout.ts`의 `BoardDefinition`/`BOARD_DEFINITIONS`가 담당하고, `Page`는 그 위에서
여러 "Page Module"을 순서대로 조합한 것으로 재정의한다. EPIC-054B가 타입 시스템 + 렌더러
스캐폴드만 만들었고(어떤 실제 페이지도 연결 안 됨), **EPIC-054C에서 Board 계열 모듈을 실제
Board와 연결**해 `/boards/[id]`(개별 게시판)와 `/boards`(디렉토리, 여러 Board를 한 Page에 배치)가
이 시스템으로 동작한다.

- **`src/lib/pageModules.ts`**: `PageModuleKind`(16종: `hero`/`story_board`/`gallery_board`/
  `list_board`/`slide_board`/`timeline`/`comment`/`search`/`pagination`/`notice`/`cta`/`form`/
  `calendar`/`survey`/`ranking`/`profile_card`) + 모듈별 props 타입 + 판별 유니온
  `PageModuleConfig`(`{id, kind, props}`) + `PageDefinition`(`{key, title, modules:
  PageModuleConfig[]}`). `modules`가 평면 배열이므로 모듈 추가/삭제/순서 변경은 표준 배열
  연산(push/filter/재정렬)만으로 표현된다 — 별도 트리 구조 불필요. **(EPIC-054C)**
  `story_board`/`gallery_board`/`list_board`/`slide_board` 4종의 props는 `BoardModuleProps = {
  boardId: string; includeChildBoards?: boolean }` 하나로 통일 — `BoardModule`이 boardId만으로
  나머지를 전부 자체 조회하기 때문에, Page를 조립하는 쪽은 "이 자리에 어떤 게시판을 놓을지"만
  결정하면 된다.
- **`src/components/modules/BoardModule.tsx` (EPIC-054C 신규)**: 게시판 하나(`boardId`)를 Page
  어디에든 꽂을 수 있는 자기완결형 모듈 — 정의 조회, `posts` 조회, Search/Sort/Pagination
  상태 관리(디바운스 포함)를 전부 스스로 처리한다. 기존 `src/app/boards/[id]/page.tsx`에만 있던
  로직을 그대로 옮긴 것(동작 변경 없음). `definition.boardType`이 무엇이든(story/gallery/
  community/hub/timeline) `BoardRenderer`가 알아서 맞는 레이아웃을 그리므로, story/gallery/
  list/slide board 4종 모두 이 컴포넌트 하나로 커버된다. **핵심 설계**: boardId만 있으면 어디서든
  재사용 가능해, 여러 개를 한 Page에 나란히 배치해도 상태가 섞이지 않고("Page 하나 = Board
  하나" 구조를 강제하지 않음), 추후 Block Editor의 "게시판 임베드" 블록이 boardId 하나만
  넘기면 그대로 연동될 수 있다. (`BOARD_SYSTEM.md`에도 동일 원문이 있다 — Board 관점/Page
  관점 양쪽에서 필요해 양쪽에 보존했다.)
- **`src/components/modules/PageModuleRenderer.tsx`**: `modules: PageModuleConfig[]`를 받아
  배열 순서대로 렌더링하는 조합기. `kind`별로 기존 컴포넌트에 props를 그대로 전달한다:
  - `hero` → 기존 `HeroSlideshow` 그대로 재사용
  - `story_board`/`gallery_board`/`list_board`/`slide_board` → **(EPIC-054C)** `BoardModule`에
    `boardId`만 전달 — 실제 Board와 연결됨
  - `timeline` → 기존 `TimelineView`/`groupByYearMonth`(Timeline Engine, EPIC-050/052) 그대로 재사용
  - `comment` → 기존 `CommentSection` 그대로 재사용
  - `pagination` → 기존 `Pagination` 그대로 재사용
  - `search`/`cta` → `BoardHeader.tsx`에 인라인으로 있던 검색 입력창/CTA 버튼 마크업을
    `src/components/modules/SearchInput.tsx`/`CtaButtons.tsx`로 추출해 `BoardHeader`와 Page
    Module이 동일 컴포넌트를 공유하도록 리팩터(중복 컴포넌트 생성 금지 원칙 반영, 렌더링
    결과는 기존과 동일)
  - `notice`/`form`/`calendar`/`survey`/`ranking`/`profile_card` → 재사용할 기존 컴포넌트가
    없어 최소 프레젠테이션 셸로 신규 작성(데이터 조회·저장 로직 없음)
  - **(EPIC-054C)** `modules` 배열이 비어 있으면(Board/모듈이 없는 Page)
    `src/components/modules/EmptyState.tsx`를 렌더링 — Placeholder Module이 아니라 "콘텐츠가
    0건"이라는 상태를 그대로 보여준다. `BoardRenderer`의 "게시글 0건" 분기도 동일한
    `EmptyState`를 공유(중복 없음).

## Preview / Publish

`PROJECT_BLUEPRINT.md` 원문에는 이 컴파일 타임 Page Module 시스템 자체의 별도 "미리보기/발행"
개념은 없다(모듈은 코드에 `PageDefinition`으로 정의되는 것이라 draft/published 상태 구분이
없다) — 아래는 실제 연결 지점과 범위 밖 항목이다.

- **(EPIC-054C) 실제 연결 지점**:
  - `src/app/boards/[id]/page.tsx` — `<BoardModule boardId={id} />` 하나만 렌더링(개별 게시판
    페이지, Board 1개).
  - `src/app/boards/page.tsx` — parent가 없는 최상위 hub(Silo Store/Online Docent/Heritage/
    Community/Membership/Gallery/Archive/Studio)마다 `slide_board` 모듈을 하나씩 만들어
    `PageModuleRenderer`로 **한 Page에 여러 Board를 나란히 배치**(Page 하나 = Board 하나
    구조가 아님을 실제로 증명하는 자리). 그 아래 "게시판 허브" 바로가기 카드/레거시 그룹 링크
    목록은 순수 내비게이션이라 Board Module로 바꾸지 않고 그대로 유지.
- **재사용을 위해 `export` 처리한 기존 코드**(동작 변경 없음): `src/lib/boardLayout.ts`의
  `story()`/`community()`/`hub()`/`timeline()` 빌더 함수,
  `src/components/boards/CommentSection.tsx`의 `Comment` 타입.
- **범위 밖(의도적)**: `notice`/`hero`/`form`/`calendar`/`survey`/`ranking`/`profile_card` 등
  Board가 아닌 모듈은 여전히 실제 Page에 연결되지 않았다(이번 EPIC은 "모든 Page를 Board와
  연결"이 목표). 모듈을 추가/삭제/순서 변경하는 관리자 UI도 범위 밖.

각 위젯(모듈) 종류별 상세(Purpose/Configuration/Dependencies/Supported page types)는
[`WIDGET_SYSTEM.md`](WIDGET_SYSTEM.md) 참고.
