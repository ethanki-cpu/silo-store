# POINT SYSTEM

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> 기존 `PROJECT_BLUEPRINT.md`에 흩어져 있던 포인트/배지/랭킹 관련 서술(§4 주요 기능, §5 API
> 구조)을 모은 것입니다. 정보를 삭제하거나 요약하지 않았습니다.
>
> ⚠️ **`PROJECT_BLUEPRINT.md`에는 포인트 시스템을 다루는 전용 절이 없었다** — 아래는 문서
> 전체에서 포인트/배지/활동/보상 관련 언급을 모두 모은 것이며, 이것이 원문에 존재하는 전부다.
> 포인트 적립 규칙의 더 상세한 수치(예: 글 작성/댓글/좋아요당 포인트)는
> [docs/content-blueprint.md](docs/content-blueprint.md) §1(게시판)에 있으나, 그 문서는
> `PROJECT_BLUEPRINT.md`가 아니라 별도 SSoT라 이번 재구성 대상(= PROJECT_BLUEPRINT.md의 내용
> 이동)에 포함되지 않았다.

## Points (구 PROJECT_BLUEPRINT.md §4, §5)

- **출석체크** (`/attendance`, `api/attendance`): 하루 1회 체크인 + 포인트 적립 + 이번 달 캘린더.
- **물품 구매/대여 주문** (`POST /api/orders`): 등급별 할인/적립을 서버에서 계산(`api/orders`:
  "물품 구매/대여 주문 생성 (등급별 가격/포인트 서버 계산)").
- **마이페이지 등급/포인트 요약**: `/mypage/layout.tsx`가 로그인 게이트 + 등급/포인트 요약 +
  `MyPageNav`를 공유한다(§4 마이페이지 행).
- **마이페이지 `timeline` 탭**: `points_ledger`+`likes`+`member_follows`를 종합해 활동 타임라인을
  보여준다(§4 마이페이지 행) — Timeline Engine(`groupByYearMonth`+`TimelineView`) 자체는
  [`BOARD_SYSTEM.md`](BOARD_SYSTEM.md)/[`PAGE_BUILDER.md`](PAGE_BUILDER.md)에도 등장하는 공용
  컴포넌트다.

## Badges (구 PROJECT_BLUEPRINT.md §4)

- **`member_badges`**: 마이페이지의 비공개 개인 데이터 중 하나로, `/mypage/badges` 탭에서
  노출된다(§4 마이페이지 행: "비공개 개인 데이터는 그대로 두고(`member_collections`/`orders`/
  `wishlists`/`member_follows`/`member_badges`/`member_visitors`/`comments`)").

## Ranking

`PROJECT_BLUEPRINT.md` 본문에는 실제로 동작하는 랭킹 기능이 서술되어 있지 않다. 유일한 언급은
Page Module 시스템의 `ranking`(`profile_card`와 함께) 모듈 종류 이름뿐이며, 그마저도 "재사용할
기존 컴포넌트가 없어 최소 프레젠테이션 셸로 신규 작성(데이터 조회·저장 로직 없음)"·"범위 밖
(의도적) — 여전히 실제 Page에 연결되지 않았다"고 명시되어 있다(§7.5) — 상세는
[`WIDGET_SYSTEM.md`](WIDGET_SYSTEM.md)의 `ranking` 행 참고.

## Activity / Reward

- 활동 기록은 위 "Points"의 마이페이지 `timeline` 탭이 사실상 유일한 통합 뷰다.
- 보상(Reward) 개념으로 서술된 것은 출석체크 포인트 적립과 주문 시 등급별 적립뿐이며, 그 외 별도
  "보상" 체계는 `PROJECT_BLUEPRINT.md`에 없었다.
