# WIDGET SYSTEM

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> `PROJECT_BLUEPRINT.md` §7.5(Page Module 시스템)에 있던 16종 `PageModuleKind`와 그 렌더링 재사용
> 매핑을 위젯(모듈) 단위로 재배열한 것입니다. 정보를 삭제하거나 요약하지 않았습니다.
>
> ⚠️ **범위 안내**: `PROJECT_BLUEPRINT.md`에는 위젯 하나하나의 "Purpose/Configuration/Rendering/
> Preview/Dependencies/Supported page types"를 개별적으로 서술한 절이 없었다 — 있는 것은
> 아래처럼 "이 종류는 어떤 기존 컴포넌트를 재사용해 렌더링하는가"뿐이다. 이 문서는 그 원문을
> 위젯별로 재배열했을 뿐, 존재하지 않던 상세(예: 각 위젯의 개별 설정 필드 스키마)를 새로
> 지어내지 않았다 — 그런 상세는 코드(`src/lib/pageModules.ts`, 그리고 이후 신설된 DB 기반
> Page Builder CMS의 `src/lib/widgetSchema.ts`)에 있으나 아직 문서화된 적이 없다(아래 "범위
> 밖" 참고). 이번 작업은 "재구성만, 새 문서화 금지" 지시를 받았으므로 코드를 새로 읽어 문서화하지
> 않았다.

## 위젯(모듈) 16종 (구 PROJECT_BLUEPRINT.md §7.5)

`src/lib/pageModules.ts`의 `PageModuleKind` — 16종: `hero`/`story_board`/`gallery_board`/
`list_board`/`slide_board`/`timeline`/`comment`/`search`/`pagination`/`notice`/`cta`/`form`/
`calendar`/`survey`/`ranking`/`profile_card`.

공통 타입 구조: 모듈별 props 타입 + 판별 유니온 `PageModuleConfig`(`{id, kind, props}`) +
`PageDefinition`(`{key, title, modules: PageModuleConfig[]}`). `modules`가 평면 배열이므로 모듈
추가/삭제/순서 변경은 표준 배열 연산(push/filter/재정렬)만으로 표현된다 — 별도 트리 구조 불필요.

## 위젯별 Rendering (재사용 대상 컴포넌트) — 구 PROJECT_BLUEPRINT.md §7.5

| 위젯(kind) | Rendering(재사용 컴포넌트) | Dependencies(Board 연결 여부) |
|---|---|---|
| `hero` | 기존 `HeroSlideshow` 그대로 재사용 | 없음 |
| `story_board` | `BoardModule`에 `boardId`만 전달 — 실제 Board와 연결됨(EPIC-054C) | `boardId` 필수 |
| `gallery_board` | 〃 | 〃 |
| `list_board` | 〃 | 〃 |
| `slide_board` | 〃 | 〃 |
| `timeline` | 기존 `TimelineView`/`groupByYearMonth`(Timeline Engine, EPIC-050/052) 그대로 재사용 | 없음 |
| `comment` | 기존 `CommentSection` 그대로 재사용 | 없음 |
| `search` | `BoardHeader.tsx`에서 추출한 `src/components/modules/SearchInput.tsx` 공유 | 없음 |
| `cta` | `BoardHeader.tsx`에서 추출한 `src/components/modules/CtaButtons.tsx` 공유 | 없음 |
| `pagination` | 기존 `Pagination` 그대로 재사용 | 없음 |
| `notice` | 재사용할 기존 컴포넌트가 없어 최소 프레젠테이션 셸로 신규 작성(데이터 조회·저장 로직 없음) | 없음 — 범위 밖(미연결) |
| `form` | 〃 | 없음 — 범위 밖(미연결) |
| `calendar` | 〃 | 없음 — 범위 밖(미연결) |
| `survey` | 〃 | 없음 — 범위 밖(미연결) |
| `ranking` | 〃 | 없음 — 범위 밖(미연결) |
| `profile_card` | 〃 | 없음 — 범위 밖(미연결) |

### Configuration

- `story_board`/`gallery_board`/`list_board`/`slide_board` 4종의 props는
  `BoardModuleProps = { boardId: string; includeChildBoards?: boolean }` 하나로 통일 —
  `BoardModule`이 boardId만으로 나머지(정의 조회/`posts` 조회/Search/Sort/Pagination 상태 관리)를
  전부 자체 조회하기 때문에, Page를 조립하는 쪽은 "이 자리에 어떤 게시판을 놓을지"만 결정하면 된다.
- 나머지 12종의 개별 props 필드 스키마는 `PROJECT_BLUEPRINT.md`에 나열되어 있지 않았다.

### Preview

`modules` 배열이 비어 있으면(Board/모듈이 없는 Page) `src/components/modules/EmptyState.tsx`를
렌더링 — Placeholder Module이 아니라 "콘텐츠가 0건"이라는 상태를 그대로 보여준다.
`BoardRenderer`의 "게시글 0건" 분기도 동일한 `EmptyState`를 공유(중복 없음). 그 밖의 개별 위젯
단위 미리보기 메커니즘은 `PROJECT_BLUEPRINT.md`에 서술되어 있지 않았다.

### Supported page types

- Board 연결 4종(`story_board`/`gallery_board`/`list_board`/`slide_board`)은
  `src/app/boards/[id]/page.tsx`(Board 1개)와 `src/app/boards/page.tsx`(여러 Board를 한 Page에
  배치, 최상위 hub마다 `slide_board` 하나씩)에서 실제로 쓰인다.
- 그 외 위젯의 "지원 페이지 타입"은 `PROJECT_BLUEPRINT.md`에 명시되어 있지 않았다(범위 밖 항목,
  아직 어떤 실제 Page에도 연결되지 않음).

## Future widgets

`PROJECT_BLUEPRINT.md` 원문에는 "향후 추가 예정 위젯" 목록이 없었다. 다만 §7.5 "범위 밖(의도적)"
절에 다음과 같이 기록되어 있다: `notice`/`hero`/`form`/`calendar`/`survey`/`ranking`/`profile_card`
등 Board가 아닌 모듈은 여전히 실제 Page에 연결되지 않았다(해당 EPIC-054C의 목표는 "모든 Page를
Board와 연결"이었다) — 이들을 실제 Page에 연결하는 작업과, 모듈을 추가/삭제/순서 변경하는 관리자
UI 모두 그 EPIC의 범위 밖으로 남아 있었다. 이 항목들이 사실상 "다음에 채워질 위젯"에 가장 가깝다.

> ⚠️ 참고: 이 프로젝트에는 이 문서가 다루는 컴파일 타임 Page Module 시스템과 별개로, 이후
> DB 기반 Page Builder CMS가 신설되며 위젯이 23종까지 확장된 이력이 있다(EPIC-060~065,
> `CHANGELOG.md`/`docs/EPIC.md` 참고) — 그 23종의 개별 위젯 상세는 `PROJECT_BLUEPRINT.md`
> 본문에 정리된 적이 없어 이 문서에도 옮길 원문이 없었다. `PAGE_BUILDER.md`의 안내문과 동일한
> 사유다.
