# Design System (de facto)

> 이 프로젝트에는 별도의 디자인 시스템/컴포넌트 라이브러리가 없습니다. 이 문서는 실제 코드에서
> 반복적으로 쓰이는 Tailwind 클래스 패턴을 역추적하여 정리한 **현재 상태 기준 참고 문서**입니다.
> 새 화면을 만들 때는 여기 정리된 기존 관례를 우선 재사용하고, 새 패턴이 필요하면 이 문서도 함께 갱신합니다.
> 최종 확인: 2026-07-27 (코드 기준).

## 0. 프레임워크/설정 사실 확인

- Tailwind v4, `@import "tailwindcss"` + `globals.css`의 `@theme inline` 블록으로 설정(`tailwind.config.js` 없음).
- `globals.css`에 `--background`/`--foreground` 시맨틱 토큰이 정의되어 있으나 **실제 페이지 어디에서도 사용되지 않음** — 모든 페이지가 `bg-gray-*`/`text-gray-*` 등 Tailwind 기본 유틸리티를 하드코딩한다.
- **⚠️ "골동품/1920년대 Time Slip" 브랜드 감성은 현재 카피/콘텐츠 taxonomy(르네상스/바로크/아르데코 등)로만 존재하고, 실제 UI 비주얼(색상/폰트)에는 반영되어 있지 않다.** 세피아/크림/버건디 계열 색상, 세리프/디스플레이 폰트 등은 전혀 없음 — 순수 뉴트럴 그레이 톤의 기본 Tailwind 룩이다. 브랜드 룩앤필을 도입하려면 이 문서와 `globals.css`부터 손대야 한다.
- `body`의 실제 폰트는 `globals.css`에 하드코딩된 `Arial, Helvetica, sans-serif`이며, 이것이 `layout.tsx`에서 로드하는 Geist Sans/Mono(`next/font/google`)를 덮어쓴다. Geist는 CSS 변수로는 존재하지만 실제로 적용되지 않는 미완성 상태 — 폰트 시스템은 의도된 것이 아니라 create-next-app 스캐폴딩이 그대로 남은 결과다(`layout.tsx`의 `<title>`도 여전히 `"Create Next App"`).

## 1. 색상

| 용도 | 클래스 | 확인된 사용처 |
|---|---|---|
| Primary 버튼(사실상 브랜드 색) | `bg-gray-800 text-white` | Navbar 로그인/로그아웃, 상점 구매 버튼, 게시판 글쓰기, 로그인/회원가입 제출 버튼 등 다수 |
| 본문/보조 텍스트 | `text-gray-500` / `text-gray-600` / `text-gray-400` | 대부분의 메타 정보(가격, 날짜, 카운트) |
| 카드/컨테이너 테두리 | `border-gray-200` | 상점 카드, mypage 카드, 게시판 카드 |
| 폼 입력 테두리 | `border-gray-300` | 로그인/회원가입/글쓰기 인풋 |
| 옅은 구분선 | `border-gray-100` | Navbar 하단 구분선 |
| Sidebar 강조색(유일한 non-gray 브랜드색) | `bg-green-800` | Navbar 좌/우 슬라이드 사이드바 + 풀탭. **사이드바 외 다른 곳에서는 쓰이지 않음** |
| 오류 | `bg-red-50 border-red-300 text-red-700` (배너), `text-red-600` (인라인) | 상점/클럽 에러 배너, 폼 유효성 오류 |
| 확인/정보 | `bg-blue-50 border-blue-200 text-blue-700` | 주문 확인 박스 — 사용처 2~3곳뿐, 시스템 전체 규칙으로 단정하지 말 것 |
| 등급 하이라이트 | `border-blue-500 bg-blue-50 ring-2 ring-blue-500` | mypage 등급 비교 카드에서 현재 등급 강조(단일 사용례) |
| 배지(게시판 전용, 다른 곳 재사용 안 됨) | `bg-amber-100 text-amber-700`(개념글) / `bg-blue-100 text-blue-700`(도슨트) / `bg-green-100 text-green-700`·`bg-gray-100 text-gray-500`(Q&A 답변완료/대기) | `boards/[id]/page.tsx` 내부 전용 배지 팔레트 |
| 예외(제3자 브랜드) | Kakao 버튼 `bg-[#FEE500] text-[#191600]` | 로그인 페이지, 유일하게 raw hex 사용 |

## 2. Typography

- 폰트: Geist 로드되지만 `Arial, Helvetica, sans-serif`에 덮여 실제 미적용(§0 참고).
- 페이지 제목(`<h1>`): `text-2xl font-bold` — 상점/mypage/게시판/클럽/ComingSoon/로그인/회원가입/글쓰기 전반에서 일관됨.
- 섹션 소제목: `text-lg font-semibold`
- 그룹 라벨: `text-sm font-semibold text-gray-500`
- 본문/메타: `text-sm text-gray-600` 또는 `text-xs text-gray-400`/`text-gray-500`
- 리스트/카드 제목: `font-medium` 또는 `font-medium text-sm`

## 3. Sidebar (`Navbar.tsx` 전용 패턴 — 다른 곳에 중복 구현 없음)

- 닫혀 있을 때 풀탭: `fixed left-0(또는 right-0) top-1/2 -translate-y-1/2 z-40 rounded-r-md(또는 rounded-l-md) bg-green-800 text-white px-2 py-3 text-lg shadow-md`
- 패널: `fixed inset-y-0 left-0(또는 right-0) z-50 w-64 bg-green-800 text-white transform transition-transform duration-200` + `translate-x-0`/`-translate-x-full`(좌) 또는 `translate-x-full`(우) 토글
- 헤더: `flex items-center justify-between p-4 border-b border-white/20`, 제목 `font-semibold`, 닫기 버튼 `text-white/80 hover:text-white`
- 본문: `p-2 overflow-y-auto max-h-[calc(100vh-64px)]`
- 그룹 라벨: `px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60`
- 링크 아이템: `block px-3 py-2 rounded-md text-sm text-white hover:bg-white/10`
- 오버레이(사이드바 열렸을 때): `fixed inset-0 z-30 bg-black/30`
- 상단 탭(사이드바 아닌 일반 탭): 컨테이너 `flex gap-1 px-4 overflow-x-auto whitespace-nowrap border-t border-gray-100`; 각 탭 `px-3 py-2 text-sm border-b-2 -mb-px`; 활성 `border-gray-800 text-gray-900 font-medium`, 비활성 `border-transparent text-gray-500 hover:text-gray-700`

## 4. Button

- Primary: `rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm`(nav) 또는 `w-full rounded-md bg-gray-800 text-white px-3 py-2`(폼 전체너비). 비활성 상태는 항상 `disabled:opacity-50` 추가.
- Secondary/outline: `rounded-md border border-gray-300 bg-white text-gray-800 px-3 py-2 hover:bg-gray-50` (현재 로그인 페이지 Google 버튼에서만 확인됨 — 재사용 시 신중히)
- Pill/필터 토글(상점 시대 필터): 활성 `bg-gray-800 text-white border-gray-800`, 비활성 `border-gray-300 text-gray-600 hover:bg-gray-50`, 공통 형태 `rounded-full px-3 py-1.5 text-sm border`

## 5. Card

- 표준 카드: `rounded-lg border border-gray-200`(+ 이미지 있으면 `overflow-hidden`), 인터랙티브 카드는 `shadow-sm hover:shadow-md transition-shadow` 추가(상점 아이템 카드)
- 이미지 없는 카드(게시판/클럽): `rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow` (또는 `p-4`)
- 카드 썸네일: `w-full aspect-square object-cover`(전 페이지 공통)
- 카드 내부 텍스트 패딩: `p-4`(상점) 또는 `p-3`(mypage) — 페이지마다 다름, 고정 규칙 아님
- 에러/정보 패널: `rounded-lg border border-red-300 bg-red-50 p-4 text-red-700`(2곳 이상에서 그대로 반복 — 신뢰 가능한 관례)
- 그리드: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`(상점/클럽) 또는 `grid grid-cols-2 sm:grid-cols-3 gap-4`(mypage 갤러리류) — 페이지 유형에 따라 다름

## 6. Input / Form

가장 일관되게 재사용되는 패턴(로그인/회원가입/게시판 글쓰기에서 거의 동일하게 반복):

- 텍스트/이메일/비밀번호/텍스트에어리어/셀렉트: `w-full rounded-md border border-gray-300 px-3 py-2`
- 라벨: `block text-sm mb-1`
- 폼 세로 간격: `<form>`에 `space-y-4`
- 소형 인라인 숫자 입력(대여일수 등): `w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm`(같은 베이스의 너비 축소 변형)
- 체크박스 행: `flex items-center gap-2 text-sm text-gray-600` (체크박스 자체는 무스타일)

## 7. Spacing / Layout

- 페이지 래퍼: 서버 컴포넌트 목록 페이지는 `min-h-screen p-8`, 클라이언트 페이지는 대부분 `flex-1 p-8`(루트 레이아웃의 `flex flex-col`에 의존)
- 컨텐츠 최대 너비(페이지 유형별로 다름, 고정 폭 없음):
  - `max-w-sm` — 인증 폼(로그인/회원가입)
  - `max-w-xl` — ComingSoon
  - `max-w-2xl` — 상세/글쓰기(아이템 상세, 게시판 상세/글쓰기)
  - `max-w-3xl` — 대시보드형(mypage, 게시판 목록)
  - 공통: 어느 폭이든 `mx-auto w-full`로 중앙 정렬
- 섹션 간 세로 간격: `mb-8`(mypage 주요 섹션 간), `mb-6`(헤더-본문 사이)
- 리스트 간격: `space-y-2`(컴팩트 리스트), `space-y-3`/`space-y-4`(폼 필드, 주문 박스)

## 8. 컴포넌트 재사용 현황

- 공용 컴포넌트: `Navbar`, `ComingSoon`, `WishlistButton`, 그리고 EPIC-046의 `src/components/boards/*`(`BoardHeader`/`PostDetailHeader`/`PostTags`/`CommentSection`, §10 참고). 그 외 버튼/카드/인풋/배지/그리드는 대부분 페이지마다 인라인 Tailwind 반복.
- `WishlistButton`은 호출부에서 `absolute top-2 right-2 z-10 rounded-full bg-white/90 w-8 h-8 flex items-center justify-center shadow` 래퍼가 `shop/page.tsx`와 `mypage/page.tsx`에 동일하게 복붙되어 있음 — **공용 컴포넌트로 추출할 후보**로 남겨둔다.
- `ComingSoon`은 실제로 여러 placeholder 페이지에서 재사용되는, 이 프로젝트에서 몇 안 되는 "제대로 추출된" 컴포넌트 사례.

## 9. 새 화면을 만들 때

1. 버튼/카드/인풋이 필요하면 §4/§5/§6의 기존 클래스 조합을 그대로 복사해서 쓴다(새로 디자인하지 않는다).
2. 새로운 색상이 필요하면 먼저 §1에 이미 있는 팔레트(gray 기본 + green-800 sidebar + red/blue/amber 상태색)로 해결되는지 검토한다.
3. "골동품/Time Slip" 감성을 실제로 UI에 반영하는 작업이라면, 이는 이 문서 전체를 다시 쓰는 수준의 디자인 리브랜딩이므로 별도 Epic으로 분리하고 사용자와 먼저 논의한다.
4. 반복되는 새 인라인 패턴을 발견하면(예: WishlistButton 래퍼) 컴포넌트 추출을 고려하고, 추출 시 §8을 갱신한다.

## 10. Editorial Board 디자인 시스템 + Board Engine (게시판 전용, EPIC-046/047)

> §1~§9는 프로젝트 전반의 기본 룩(뉴트럴 그레이 + `bg-gray-800` 버튼)이고, 이 섹션은 **게시판(`/boards/**`)에만** 적용되는 별도 디자인 언어다. House of Honey류 매거진 기사 레이아웃을 참고해 재해석했다 — 그대로 복제하지 않고 이 프로젝트의 뉴트럴 팔레트를 유지한 채 타이포그래피/여백만으로 고급스러움을 만든다.

- **배경**: 항상 명시적 `bg-white`(페이지 최상위 `<main>`에 직접 지정 — 전역 배경 토큰에 의존하지 않음).
- **여백**: 페이지 패딩 `px-6 py-12`(§7의 `p-8`보다 넓음), 헤더 컨텐츠 `max-w-3xl`, 게시글 헤더(+대표 이미지) `max-w-4xl`, 본문/댓글은 그 안에서 다시 `max-w-2xl`로 좁혀 "읽기 좋은 폭" 확보.
- **타이포그래피**: 게시판명·게시글 제목에 `font-serif`(Tailwind 기본 serif 스택, 별도 폰트 파일 로드 없음)로 나머지 sans-serif UI와 의도적으로 대비 — 매거진 마스트헤드 느낌. 메타 정보(No./작성일/Author/댓글 작성자)는 `text-xs uppercase tracking-wide text-gray-400` 캡션 스타일로 통일.
- **레이아웃**:
  - 카드/그림자 대신 `divide-y divide-gray-100` 또는 `border-t border-gray-200` 얇은 구분선(hairline)으로 목록/댓글을 나눈다(§5의 `rounded-lg border` 카드 패턴은 게시판에는 쓰지 않음).
  - 게시글 헤더는 3열 그리드(`grid-cols-1 md:grid-cols-[1fr_2fr_1fr]`): 좌측 No./작성일(+수정일), 가운데 큰 제목+좋아요/조회/댓글 통계, 우측 Author 라벨+작성자명(프로필 링크).
  - 대표 이미지(`posts.photo_url`)가 있으면 헤더 바로 아래 `w-full aspect-[21/9] object-cover`로 풀와이드 배치.
  - 태그는 `posts.tags`(EPIC-047, text[]) + 게시판 카테고리/도슨트·개념글 여부를 함께 `#태그` 칩(`rounded-full border border-gray-300 text-gray-500 text-xs`)으로 표시.
- **Board Definition System(EPIC-047)**: `board_type`(8종, 등급/쓰기 권한 축)과 화면 동작은 `src/lib/boardLayout.ts`의 `BOARD_DEFINITIONS` config 레지스트리로 완전히 분리돼 있다. 각 게시판 그룹(general/topic/group/patron/artist_promo/adoption_story/archive/qna)은 `BoardDefinition`(레이아웃/검색·정렬·페이지네이션 가능 여부/좋아요·댓글·북마크·태그 노출 여부/기본 정렬/페이지 크기 등)을 갖고, `resolveBoardDefinition({board_type, category})`가 DB 게시판 행 하나를 정의 하나로 해석한다 — 새 게시판 "종류"를 추가할 때 페이지/컴포넌트 코드를 만들 필요 없이 이 레지스트리에 항목 하나만 추가하면 된다. `boardType` 필드가 화면 레이아웃 4종을 결정 — `community`(목록형, 썸네일 없음), `story`(카드형+썸네일, `adoption_story`), `gallery`(이미지 중심 Masonry, `archive`), `hub`(`/boards` 디렉토리 전용 — 하위 게시판 전체의 최신글/인기글/추천글을 슬라이드+카드로 종합 표시, `/api/boards/feed`).
- **공용 컴포넌트**(`src/components/boards/`, 모든 게시판이 그대로 공유하며 `definition`을 직접 받아 동작):
  - `BoardHeader` — 게시판명 + 검색/정렬 툴바(`definition.searchable`/`sortable`이 꺼지면 미표시) + 글쓰기 버튼(`definition.allowPosting`) + divider
  - `BoardRenderer` — `definition.boardType`에 따라 community/story/gallery 중 하나를 렌더링(게시판마다 화면을 새로 만들지 않는 핵심 스위치)
  - `Pagination` — `definition.pageSize` 단위(기본 10, 게시판별로 다를 수 있음), 페이지 번호 최대 10개 블록 표시
  - `PostDetailHeader` — 3열 헤더 + 대표 이미지 + 통계
  - `PostTags` — 태그 칩(`definition.tags`가 꺼진 게시판은 자유 태그 없이 배지만)
  - `PostActions` — 좋아요/북마크/공유 버튼 행(`showLike`/`showBookmark`로 `definition.likes`/`bookmarks` 반영, 공유는 토글 없이 항상 표시)
  - `CommentSection` — 댓글 목록(작성자 프로필 링크 포함) + 작성 폼(`definition.comments`가 꺼지면 섹션 자체 미표시)
