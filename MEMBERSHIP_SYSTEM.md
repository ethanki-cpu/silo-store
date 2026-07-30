# MEMBERSHIP SYSTEM

> **문서 재구성 안내(2026-07-30, EPIC-073 "Documentation Architecture Refactoring")**: 이 문서는
> 기존 `PROJECT_BLUEPRINT.md`에 흩어져 있던 멤버십/등급 관련 서술(§1 프로젝트 개요, §6 인증
> 구조, "TODO / 확인 필요")을 모은 것입니다. 정보를 삭제하거나 요약하지 않았습니다.
>
> ⚠️ **`PROJECT_BLUEPRINT.md` 자체의 멤버십 서술은 매우 짧습니다** — 등급 체계의 실제 상세
> (Rank/권한/혜택/게시판 접근/가격 계산 로직)는 이미 [docs/membership-blueprint.md](docs/membership-blueprint.md)가
> 공식 SSoT로 다루고 있고, `PROJECT_BLUEPRINT.md`는 그쪽으로 링크만 하고 있었다. 이 문서는 그
> 상세 문서를 대체하지 않으며, `PROJECT_BLUEPRINT.md`에 있던 내용만 옮겼다.

## Membership Rank (구 PROJECT_BLUEPRINT.md §1)

"사일로 스토어"는 멤버십 기반 커뮤니티 플랫폼으로, 멤버십 등급(`membership_tiers`)에 따라
콘텐츠 열람 범위와 가격이 달라진다.

## Permission (구 PROJECT_BLUEPRINT.md §6 인증 구조)

- **`serverAuth`** (`src/lib/serverAuth.ts`)의 `getTier(rank)`: 등급별 혜택/가격 플래그
  (`membership_tiers`) 조회.
- **`canReadBoard` / `canWriteToBoard`**: 게시판 타입별 열람/쓰기 권한 판정 — 상세는
  [`BOARD_SYSTEM.md`](BOARD_SYSTEM.md) 참고.
- 가격·열람 권한처럼 위조 방지가 필요한 값은 클라이언트가 아니라 Route Handler가
  `getRequestMember`/`getTier`로 서버에서 재계산한다(사용자가 API를 직접 호출해도 신뢰할 수
  있는 값만 응답).
- **`AuthProvider`** (`src/lib/AuthProvider.tsx`)가 제공하는 `member` 객체에
  `membership_rank`/`tier_name`이 포함되어 앱 전역에서 조회 가능하다.

## Benefits / Visibility / Restrictions

`PROJECT_BLUEPRINT.md` 본문에는 등급별 혜택·공개 범위·제한 사항의 개별 목록이 없었다 — 다음의
사용처만 언급되어 있었다:

- 사일로상점 물품 상세(`/shop/[id]`)의 "등급별 큐레이션 4단계 공개"(§4 주요 기능).
- 물품 구매/대여 주문의 "등급별 할인/적립 서버 계산"(§4 주요 기능, `POST /api/orders`).
- 도슨트 콘텐츠 건별 구매의 "월 무료 횟수/할인 적용"(§5 API 구조, `api/docent-purchases`).
- 살롱 출입(체크인)의 "등급별 무료/유료"(§4 주요 기능, `POST /api/salon-checkins`).

## 미확인 사항 (구 PROJECT_BLUEPRINT.md "TODO / 확인 필요")

- **membership_tiers 정책**: `docs/database-schema.sql`에 컬럼 구조와 rank/name/price(6개 행)는
  라이브 DB로 재확인했지만, 등급별 20여 개 혜택 플래그(할인율/적립률/큐레이션 레벨/살롱 출입료
  등)의 **현재 값**은 이번 동기화에서 재검증하지 않음 — 확인 필요(컬럼별 사용처는
  [docs/membership-blueprint.md](docs/membership-blueprint.md)에 정리됨).

## Future plans

`PROJECT_BLUEPRINT.md` 본문에는 멤버십 시스템의 향후 계획이 별도로 서술되어 있지 않았다 —
플랫폼 전체의 향후 방향은 [`PROJECT_VISION.md`](PROJECT_VISION.md) 참고.
