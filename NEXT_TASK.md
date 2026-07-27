# NEXT_TASK

## 진행 중
- 없음 (대기 중 — 다음 지시 대기)

## 다음 작업
- **EPIC-041-042-HOTFIX 후속**: 이번 세션은 Browser 창이 화면에 표시되지 않는 상태라(`screenshot`/`hover` 등 실제 커서 이동이 필요한 도구가 모두 실패) 재구현한 순수 CSS `group`/`group-hover` 드롭다운의 실제 마우스 동작(hover 열림, 완전히 벗어났을 때 즉시 닫힘, 2차 플라이아웃)을 스크린샷으로 직접 확인하지 못했다 — `npm run lint`/`npx tsc --noEmit`만 통과 확인. 사용자가 직접 상단 탭에 마우스를 올려 1차/2차 드롭다운이 뜨는지, 마우스를 빈 공간으로 치웠을 때 즉시 닫히는지, 특히 화면 오른쪽에 가까운 탭에서 2차 플라이아웃이 뷰포트 밖으로 잘리지 않는지 확인 필요.
- **EPIC-041-042-HOTFIX 후속**: `<nav>`의 가로 스크롤(`overflow-x-auto`)을 `flex-wrap`으로 바꿔, 아주 좁은 화면(탭 4개가 한 줄에 안 들어가는 경우)에서는 스크롤 대신 다음 줄로 넘어간다 — 실사용 중 이 레이아웃이 어색하면 별도 반응형 처리를 검토할 것.
- **EPIC-041-042 후속**: `src/app/page.tsx`의 홈 큐레이션은 `domain==="shop"`만 `items` 테이블을 실제로 조회하고, `salon`/`collection`/`docent` 도메인은 각 화면(예: `/clubs`, `/docent`)의 실제 테이블·컬럼을 확인하지 않은 채 추측으로 조회하지 않기 위해 더미 데이터로 대체해뒀음 — 실사용 데이터가 필요해지면 각 도메인 화면의 조회 로직을 참고해 `fetchCurationItems()`에 추가할 것.
- **EPIC-041-042 후속**: 커스텀 폰트 업로드(`main_logo.fontFileUrl`)는 실제 폰트 파일 업로드를 브라우저 자동화로 재현할 수 없어 코드 리뷰 수준으로만 확인함 — 사용자가 직접 `.woff`/`.ttf` 파일을 업로드해 로고 좌/우 텍스트에 실제로 적용되는지 확인 필요.
- **EPIC-041-042 후속**: 사이드바 아이콘 크기(`iconSizePx`) 필드도 같은 이유로 실제 값 변경 후 아이콘 크기가 바뀌는지 직접 확인 필요.
- **EPIC-040 후속**: 2차 플라이아웃(`group-hover:block absolute left-full`)은 화면 오른쪽 끝에 가까운 탭(예: 맨 오른쪽 탭)에서 열리면 뷰포트 밖으로 잘려 나갈 수 있음 — 현재는 항상 오른쪽으로만 펼쳐짐. 실사용 중 잘림 현상이 발견되면 뷰포트 우측 여백을 계산해 필요 시 왼쪽으로 펼치는 로직을 추가할 것.
- **EPIC-039 후속**: `sidebar_icons`는 새 `site_settings` 키라 라이브 DB에 해당 row가 없으면(최초 1회) 조회는 정상 동작하되(빈 값으로 처리) 관리자 화면에서 저장 시 `site_settings` 테이블 자체는 이미 있으므로(EPIC-026) upsert가 그대로 새 row를 만든다 — 별도 DDL 불필요, 확인만 하면 됨.
- **EPIC-039 후속**: `main_logo`의 `align`/`extraText`/`textPosition` 필드는 이제 UI에서 노출되지 않고 렌더링에도 쓰이지 않는 죽은 필드가 됐다(구버전 데이터 호환을 위한 타입 정의 및 1회 마이그레이션 용도로만 존재). 사용자가 확인 후 완전히 무의미하다고 판단되면 별도 정리(스키마/타입에서 제거) 작업을 검토할 것 — 이번 EPIC 범위 밖.
- **EPIC-039 후속**: `link` 타입 상단 탭(마이페이지)은 하위 그룹/아이템이 데이터 모델에 없어 hover 시 드롭다운을 띄우지 못하고 색상 힌트만 적용했음 — "모든 상위 탭 hover 시 하위 메뉴 노출"을 문자 그대로 마이페이지에도 적용하려면 `site_navigations`에 마이페이지 하위 항목(예: 마이페이지/설정/로그아웃 등)을 추가하는 별도 데이터 작업이 필요함(추측으로 만들지 않음).
- **EPIC-039 후속**: `HeroSlideshow.tsx`의 wallpaper 랜덤 선택(`Math.random()`)을 `useEffect`+`setState`로 구현해 `react-hooks/set-state-in-effect` 위반이 1건 늘었음(26→27, 이미 저장소 전반에 퍼진 동일 클래스 pre-existing 이슈와 같은 성격) — 아래 "보류 중인 P2 이슈"와 함께 전체 훑는 리팩터링 시 같이 처리할 것.
- **EPIC-039 후속**: Wallpaper 다중 업로드/사이드바 아이콘 업로드는 실제 파일 선택 다이얼로그를 자동화로 조작할 수 없어 코드 리뷰 수준으로만 확인함 — 사용자가 직접 `/admin/navigation/settings`에서 배경 이미지 여러 개를 업로드하고 슬라이드쇼가 "contain" 모드로 전환될 때 배경이 무작위로 바뀌는지, 사이드바 아이콘이 실제로 🔑/🚪 이모지를 대체하는지 확인 필요.
- **EPIC-037 후속**: 팝업이 탭 바로 아래(`top: rect.bottom`)에 붙어 있어 마우스가 버튼→팝업으로 자연스럽게 이동하면 계속 열려 있지만, 버튼에서 팝업을 거치지 않고 다른 곳으로 이동하면(예: 옆의 다른 탭으로 곧장 이동하지 않고 화면 아무 곳이나 이동) 팝업이 "hover 상태"로 남아있다가 실제로 팝업 영역을 스치기 전까지 안 닫히는 경우가 이론상 있을 수 있음(기존 dropdown 타입 코드의 동일한 설계를 그대로 계승). 사용자가 실사용 중 불편함을 느끼면 팝업 컨테이너에 약간의 patding/여유 공간을 두거나 hover-intent 딜레이 로직 추가를 검토할 것.
- **EPIC-036 후속**: `package.json`에 `@dnd-kit/core`/`@dnd-kit/sortable`/`@dnd-kit/utilities`(EPIC-035)가 선언돼 있었으나 `node_modules`에 실제로 설치돼 있지 않아 `/admin/navigation`(`CategoryTreeManager`) 전체가 컴파일 에러로 로드되지 않는 상태였음 — 이번 EPIC 작업 중 `npm install`로 해결. 이 저장소를 여러 기기/세션에서 오가며 작업할 때는 `git pull` 후 `npm install`도 함께 실행할 것(그렇지 않으면 lockfile에는 있지만 로컬 `node_modules`에는 없는 패키지가 생길 수 있음).
- **EPIC-036 후속**: `hero_slideshow.wallpaperUrl` 업로드/저장 자체는 로고·슬라이드 이미지와 동일한 `uploadImage()` 경로를 재사용해 구현했지만, 실제 파일 첨부→업로드→`objectFit="contain"` 상태에서 배경으로 렌더링되는지는 브라우저 자동화로 실제 파일 선택 다이얼로그를 조작할 수 없어 코드 리뷰 수준으로만 확인함 — 사용자가 직접 `/admin/navigation/settings`에서 이미지 채움 방식을 "원본 모두 보이게(contain)"로 바꾸고 Wallpaper 이미지를 업로드해 홈 히어로에서 여백이 채워지는지 확인 필요.
- **EPIC-022 후속**: `member_collections`는 anon key REST 조회(`200 []`)로 라이브에 실제로 존재함을 EPIC-029 작업 중 확인함 — `docs/database-schema.sql` 상단 동기화 노트("아직 라이브 미적용")가 이 테이블에 한해 stale함. `member_follows`/`member_badges`/`member_visitors` 3개는 미확인 상태이므로 여전히 Supabase SQL Editor에서 실제 적용 여부 점검 필요(에이전트는 Management API 토큰 없이는 직접 적용하지 않음 — CLAUDE.md 규칙). 문서 상단 노트 자체의 정정은 이번 EPIC 범위(수정 대상 파일 제한) 밖이라 별도 작업 필요.
- **EPIC-022 후속**: "나의 살롱"/"나의 도슨트 수료증"/"나의 공간"/"나의 전시회"/"타임라인" 5개 탭의 데이터 소스 결정 필요(현재 Empty State만 존재).
- **EPIC-022 후속**: `member_follows`(팔로우 버튼)/`member_visitors`(방문 기록 insert) 쓰기 경로 구현 필요 — 아마도 `/u/[memberId]` 페이지에 추가.
- **EPIC-023 후속**: `docs/database-schema.sql` §12의 `site_navigations`/`site_categories` Seed는 라이브 DB에 적용되어 있음(EPIC-027 검증 중 실제 탭 이름 수정→저장→새로고침→Navbar 반영까지 확인 완료).
- **EPIC-023 후속**: `site_categories`가 아직 실제 화면(`/shop` era 필터, `/docent` era 필터, `CollectionsPanel` 카테고리 탭 등)에는 연결되지 않음 — 이번 EPIC은 테이블/시드/관리자 CRUD까지만. 각 화면의 하드코딩된 카테고리 목록을 `site_categories` 조회로 바꾸는 작업은 별도 Epic 필요.
- **EPIC-026 후속**: `docs/database-schema.sql` §13에 정의된 `site_settings` DDL+Seed를 Supabase SQL Editor에서 실제로 실행해야 함 — 실행 전까지 `/admin/navigation/settings`는 조회 시 "Could not find the table" 에러 배너가 뜨지만 폼 자체는 기본값으로 정상 동작함.
- **EPIC-026 후속**: (EPIC-032에서 해결됨 — `main_logo`/`hero_slideshow`는 Navbar/홈페이지에 연결 완료. `home_curation`은 이번 EPIC 범위 밖이라 여전히 미연결.)
- **EPIC-028 후속**: (EPIC-031에서 해결됨 — `is_hidden` 전용 컬럼으로 교체, 아래 EPIC-031 항목 참고)
- **EPIC-028 후속**: (EPIC-031에서 해결됨 — 20건 단위 페이지네이션 구현, 아래 EPIC-031 항목 참고)

- **EPIC-030**: 작업 지시문이 "프로젝트 제목(title)" 필드를 요구했으나 실제 `styling_projects` 스키마/Blueprint에는 `title`이 없고 `client_name`+`industry`가 그 자리를 대신함(EPIC-016에서 의도적으로 설계) — 사용자 확인 결과 기존 필드 유지로 결정. 만약 향후 정말 범용 "제목" 개념이 필요해지면 스키마 변경(별도 Epic)이 필요.
- **EPIC-031 후속**: `docs/database-schema.sql`의 `posts.is_hidden` DDL을 Supabase SQL Editor에서 실제로 실행해야 함(에이전트는 Management API 토큰 없이는 직접 적용하지 않음 — CLAUDE.md 규칙). 실행 전까지 `admin/posts/salon`에서 숨기기 토글 시 `is_hidden` 컬럼이 없다는 에러가 날 수 있음.
- **EPIC-031 후속**: `admin/posts/shop`(물품 게시글 관리)은 이번 EPIC 범위(수정 대상 파일이 `salon/page.tsx`로 한정)에 포함되지 않아 여전히 `.limit(200)`과 무관하게 동작하지만, "숨기기" 관련 로직은 애초에 없어 영향 없음 — 페이지네이션이 필요해지면 별도 확인 필요.
- **EPIC-032 후속**: `site_settings` 테이블이 라이브 DB에 아직 없어(EPIC-026 후속 DDL 미실행) 현재는 Navbar 로고/홈 히어로 모두 항상 fallback UI로 보임 — 위 EPIC-026 DDL+Seed를 Supabase SQL Editor에서 실행하고 `/admin/navigation/settings`에서 실제 값을 저장해야 실제 연동 화면을 확인할 수 있음.
- **EPIC-032 후속**: `home_curation`(도메인/슬러그/정렬 기준) 설정은 이번 EPIC 범위 밖이라 여전히 홈페이지에 연결되지 않음 — 필요해지면 별도 Epic에서 처리.
- **EPIC-033 후속**: Supabase Storage `public-assets` 버킷이 실제로 생성되어 있는지, public read 정책이 설정돼 있는지 확인 필요 — 버킷이 없으면 관리자 화면에서 파일 업로드 시 에러가 남(에이전트는 Storage 버킷 생성 권한/Management API 토큰이 없어 직접 만들지 않음). Supabase Dashboard → Storage에서 `public-assets` 버킷을 생성하고 공개 읽기로 설정할 것.
- **EPIC-033 후속**: `site_settings` 자체가 아직 라이브 DB에 없어(EPIC-026 후속 DDL 미실행), 새로 추가된 `heightPx`/`autoAdvanceSeconds`/`objectFit` 필드도 DDL 실행 전까지는 저장할 곳이 없음 — EPIC-026 DDL을 먼저 실행해야 이번 EPIC의 저장 기능 전체가 동작함.
- **EPIC-034 후속**: 같은 이유로 `align`/`extraText`/`fontFamily`/`bold`/`fontSizePx`도 `site_settings` DDL 실행 전까지는 저장할 곳이 없음.
- **EPIC-034 후속**: 로고 정렬(`align`)은 지시문이 "헤더 컨테이너"에 justify를 걸라고 했지만, 그대로 하면 우측 계정 영역(로그인/마이페이지)까지 로고 옆으로 끌려와 레이아웃이 깨짐 — 로고+추가텍스트만 감싸는 별도 flex-1 컨테이너에 적용하도록 범위를 좁혀 구현. 만약 계정 영역까지 포함해 완전히 헤더 전체를 재배치하고 싶다면 별도 지시 필요.
- **EPIC-035 후속**: `site_navigations.topic`/`thumbnail_url`/`description`/`is_public` 4개 컬럼을 Supabase SQL Editor에서 실제로 실행해야 함(에이전트는 Management API 토큰 없이는 직접 적용하지 않음) — 실행 전까지 `/admin/navigation`의 [관리] 저장 시 컬럼이 없다는 에러가 날 수 있음. 아래 ALTER TABLE 참고.
- **EPIC-035 후속**: (EPIC-035-Fix에서 해결됨 — `top-tabs`/`sidebar-left`/`sidebar-right` 3개 페이지를 삭제하고 `/admin/navigation`(`CategoryTreeManager`) 하나로 일원화. 아래 EPIC-035-Fix 항목 참고.)
- **EPIC-035-Fix 후속**: `admin/navigation/shared.tsx`의 `NavNodeEditor`/`CategoryRowEditor`/`NavRow`/`TargetType`/`TARGET_TYPE_OPTIONS`가 삭제된 3개 페이지에서만 쓰이던 export라 이제 죽은 코드가 됨(`DOMAIN_OPTIONS`/`inputClass`/`primaryButtonClass`/`smallButtonClass`/`CategoryDomain`은 `settings/page.tsx`가 계속 사용해 남겨둠) — 이번 작업 범위(수정 대상 파일 미포함)라 정리하지 않았음, 필요하면 별도 정리 필요.
- **EPIC-035-Fix**: `admin/layout.tsx`의 최상위 관리자 탭에도 "메뉴·카테고리 관리" 링크가 여전히 `/admin/navigation`(구 top-tabs 리다이렉트 대상이 삭제됨에 따라 지금은 통합 관리 화면)로 잘 연결되는지 확인함 — 별도 수정 불필요.
- **EPIC-035 후속**: `CategoryTreeManager`의 드래그앤드롭은 dnd-kit의 다중 컨테이너(부모별 자식 목록) 패턴으로 구현 — 형제 순서 변경과 다른 항목으로의 재부모화는 지원하지만, "루트 레벨로 다시 꺼내기"는 최상위 컨테이너(`list-root`)로 직접 드롭해야 함(빈 공간이 아니라 최상위 항목들 목록 자체로 드롭). 사용성이 불편하면 명시적인 "최상위로 이동" 버튼 추가를 검토할 것.
- **EPIC-035 후속**: `public-assets` Storage 버킷 존재 여부는 EPIC-033 후속 항목과 동일 — 아직 미확인.
- **EPIC-034-Ext 후속**: `textPosition`/`textCustomFont`도 `site_settings` DDL 실행 전까지는 저장할 곳이 없음(EPIC-026 후속과 동일 사유).
- **EPIC-034-Ext 후속**: `Graphire`/`Primor` 실제 폰트 파일이 없어 `globals.css`의 `@font-face`가 주석 처리된 상태 — 폰트 파일을 확보하면 `public/fonts/`에 추가하고 경로를 채운 뒤 주석 해제할 것. 그 전까지는 브라우저가 serif로 자동 대체하므로 화면이 깨지진 않음.
- **환경 메모**: Next.js(Turbopack)는 같은 프로젝트 디렉토리에 대해 dev 서버를 동시에 두 개 띄울 수 없다(`.next/dev/logs`의 락으로 감지, 포트를 바꿔도 무관하게 즉시 종료됨) — 이 저장소를 여러 세션이 동시에 작업할 때, 다른 세션이 이미 `npm run dev`를 띄워둔 상태라면 이번 세션에서는 로컬 브라우저 검증이 불가능하다. 사용자가 직접 다른 세션의 dev 서버를 내리거나, 그 세션에서 검증을 요청해야 함.

## 사용자 확인 필요
- **EPIC-022**: `/mypage`가 로그인 필요 페이지라 에이전트가 실제 로그인 세션으로 탭 전환/데이터 조회를 시각적으로 검증하지 못함(정책상 실제 자격증명 입력 불가) — type-check/lint/컴파일 확인만 완료. 사용자가 직접 로그인 후 11개 탭 전환 확인 필요.
- **EPIC-029**: 같은 이유로 "나의 컬렉션" 8개 서브탭의 실제 등록/수정/삭제 CRUD 동작을 로그인 세션으로 직접 검증하지 못함(type-check/lint만 통과 확인) — 사용자가 직접 로그인 후 "+ 아이템 추가"로 신규 등록, 카드의 ✏️ 수정/🗑️ 삭제 버튼 동작을 확인 필요.
- **EPIC-032**: 로컬 3000번 포트가 이 세션 밖의 다른 프로세스로 이미 점유돼 있어 Navbar 로고/홈 히어로 렌더링을 브라우저로 직접 확인하지 못함(type-check/lint만 통과 확인) — 사용자가 직접 `/`(홈)과 임의 페이지의 Navbar 로고 영역을 확인 필요. `site_settings`가 라이브에 없는 현재 상태에서는 둘 다 fallback UI로 보이는 게 정상.
- **EPIC-033**: 같은 이유(포트 점유 + `site_settings`/`public-assets` 버킷 라이브 미적용)로 관리자 설정 화면의 실제 파일 업로드, 로고 높이/자동 전환 시간/이미지 채움 방식 저장 및 반영을 직접 검증하지 못함(type-check/lint만 통과 확인) — 사용자가 직접 `/admin/navigation/settings`에서 파일 업로드·숫자 필드·Select 동작과 Navbar/홈 반영 여부를 확인 필요.
- **EPIC-034**: 같은 이유로 로고 정렬/추가 텍스트/서체/굵기/크기 설정 저장 및 Navbar 반영을 직접 검증하지 못함(type-check/lint만 통과 확인) — 사용자가 직접 정렬을 좌/중앙/우측으로 바꿔보며 계정 영역(로그인 등)이 밀리지 않고 로고만 이동하는지 확인 필요.
- **EPIC-035**: 같은 이유(포트 점유 + `site_navigations` 신규 컬럼 라이브 미적용)로 `/admin/navigation`의 드래그앤드롭 순서/재부모화, [관리] 모달 저장(공개 설정/주제/이미지/소개), 파일 업로드를 직접 검증하지 못함(type-check/lint만 통과 확인) — 사용자가 직접 항목을 드래그해 순서/하위 이동을 시도하고, [관리] 모달에서 값 저장 후 새로고침해도 유지되는지 확인 필요.
- **EPIC-035-Fix**: 삭제된 3개 페이지 관련 링크/서브 탭이 실제로 다 정리됐는지, `/admin/navigation`이 의도대로 카테고리 통합 관리 화면으로 잘 뜨는지 브라우저로 직접 확인하지 못함(type-check/lint + grep으로만 확인) — 사용자가 직접 `/admin/navigation`과 서브 탭 2개(카테고리 통합 관리/홈페이지 설정 관리) 전환을 확인 필요.
- **EPIC-034-Ext**: 같은 이유(다른 세션의 dev 서버 점유)로 텍스트 위치 반전(`flex-row-reverse`)과 폰트 Select 동작을 직접 검증하지 못함(type-check/lint만 통과 확인) — 사용자가 직접 텍스트 위치를 좌/우로 바꿔보며 로고와의 순서가 바뀌는지, 폰트를 Graphire/Primor로 바꿨을 때 자유 입력 서체 필드가 비활성화되는지 확인 필요.

## 보류 중인 P2 이슈 (Error Triage Policy, CLAUDE.md 참고 — 사용자 지시 전까지 미수정)
- `npm run lint`가 프로젝트 전반(예: `AuthProvider.tsx`, `WishlistButton.tsx`, `attendance`, `clubs/[id]`, `docent/[id]`, `boards/[id]/[postId]`, `Navbar.tsx`(mounted 플래그), `admin/layout.tsx`(authorized 플래그), `admin/navigation/shared.tsx`(draft 재동기화 effect) 등 다수 파일)에서 `react-hooks/set-state-in-effect` 규칙 위반으로 실패 중 — EPIC-018 작업 범위 밖의 기존(pre-existing) 상태이며, 프로젝트 전체를 훑는 별도 작업이 필요.
