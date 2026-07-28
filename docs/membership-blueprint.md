# Membership Blueprint

> 이 문서는 `src/lib/serverAuth.ts` + `docs/database-schema.sql`(`membership_tiers`) +
> 등급을 사용하는 모든 Route Handler를 기준으로 작성된 **멤버십/권한 시스템의 공식 설계 문서(SSoT)**입니다.
> 등급 관련 로직을 추가/변경할 때는 이 문서를 먼저 확인하고, 변경 시 이 문서도 함께 갱신합니다.
> 최종 확인: 2026-07-26 (코드 기준).

## 1. `membership_rank` — 유일한 등급 판정 기준

`members.membership_rank` (int) → `membership_tiers.rank`.

| rank | 등급명 | price |
|---|---|---|
| 0 | Silo Angel | 0 |
| 1 | Alice | 10,000 |
| 2 | Great Gatsby | 25,000 |
| 3 | Patron | 40,000 |
| 4 | Lautrec | 100,000 |
| 99 | Artist | 0 |

`99`(Artist)는 숫자로 `4`보다 크므로 `rank >= N` 비교는 Artist를 자동으로 포함한다.

⚠️ **rank/name/price 3개 컬럼만 라이브 DB로 검증됨.** 아래에 나열하는 20여 개 혜택 플래그 컬럼은 `docs/database-schema.sql`의 `create table` 기본값(디자인 초안)이며, **라이브 DB의 실제 값은 미검증**이다. 값을 신뢰해야 하는 작업(가격 계산 검증 등) 전에는 반드시 Supabase Management API로 직접 재확인할 것.

## 2. `membership_tiers` 전체 플래그 컬럼

| 컬럼 | 타입/기본값 | 사용처 |
|---|---|---|
| `shop_purchase_point_pct` / `shop_purchase_discount_pct` | numeric(4,2), 0 | `/api/orders` (purchase) |
| `shop_rental_point_pct` / `shop_rental_discount_pct` | numeric(4,2), 0 | `/api/orders` (rental) |
| `curation_level` | int, 0 | **DB에 존재하지만 미사용** — `/api/items/[id]`는 이 컬럼을 읽지 않고 `membership_rank`를 직접 하드코딩 임계값과 비교한다(§4 참고) |
| `venue_rental_point_pct` | numeric(4,2), 0 | `/api/rental-bookings` (포인트만, 가격 자체는 비-등급) |
| `club_all_free` | bool, false | `/api/reservations` |
| `club_monthly_free_sessions` | int, 0 | `/api/reservations` |
| `club_participation_discount_pct` | numeric(4,2), 0 | `/api/reservations` |
| `club_point_pct` | numeric(4,2), 0 | `/api/reservations` |
| `club_priority_booking` | bool, false | **미사용** (조회된 라우트 중 참조 없음) |
| `monthly_salon_meeting_invite` | bool, false | **미사용** |
| `secret_room_access` | text, `'none'` | **미사용** (`/salon/secret-room`은 정적 페이지, EPIC-054A) |
| `docent_free_only` | bool, false | `/api/docent-purchases` — ⚠️ §5 버그 주의 |
| `docent_per_item_discount_pct` | numeric(4,2), 0 | `/api/docent-purchases` |
| `docent_monthly_free_count` | int, 0 | `/api/docent-purchases` |
| `docent_needs_agreement` | bool, false | `/api/docent-purchases` (정보성 플래그, 구매 차단 안 함) |
| `drink_free` | bool, false | **미사용** (`/salon/drinks`는 정적 페이지, EPIC-054A) |
| `tour_docent_free` | bool, false | **미사용** (`/salon/docent-tour`는 정적 페이지, EPIC-054A) |
| `salon_entry_free` | bool, false | `/api/salon-checkins` |
| `salon_entry_hourly_fee` | int, 3000 | `/api/salon-checkins` |
| `board_write_scope` | text, `'limited'`/`'all'` | `canWriteToBoard` (`group` 보드) |
| `board_can_write_docent` | bool, false | `canWriteToBoard` (도슨트 글 여부 무관 공통 체크) |
| `board_can_create` | bool, false | **DB에 존재하지만 미사용** — 어떤 코드에서도 참조 안 됨 |
| `board_has_patron_board` | bool, false | `canReadBoard` + `canWriteToBoard` (`patron` 보드) |
| `board_has_promo_board` | bool, false | `canWriteToBoard` (`artist_promo` 보드) |
| `is_lifetime` | bool, false | **미사용** |

## 3. `src/lib/serverAuth.ts` — 공용 인증/권한 헬퍼

- **`getRequestMember(request)`**: `Authorization: Bearer` 토큰 검증 → `{ userId, member, scopedClient, accessToken }` 또는 `null`. `scopedClient`는 호출자 토큰이 주입된 클라이언트로, RLS가 그 사용자 기준으로 평가된다.
- **`getTier(rank)`**: `membership_tiers`에서 13개 플래그 컬럼(§2 표의 "사용처"가 있는 컬럼들 + rank)을 조회. **비-scoped(anon) 클라이언트로 조회** — RLS 무관, 공개 테이블이므로 문제 없음.
- **`canReadBoard(board, tier)`**: `board_type !== "patron"`이면 무조건 `true`(로그아웃 상태 포함). `patron` 타입만 `tier?.board_has_patron_board`를 체크.
- **`canWriteToBoard(board, tier, isDocentPost)`**:
  1. `tier === null`(비로그인/회원 row 없음) → 거부 ("로그인이 필요해요.")
  2. `isDocentPost === true`이고 `tier.board_can_write_docent`가 false → 보드 타입과 무관하게 거부(메시지는 rank 2/Great Gatsby 명시)
  3. `board_type`별 분기:
     - `group` → `board_write_scope === "all"` 필요 (메시지: rank 1/Alice)
     - `topic` / `adoption_story` / `archive` / `qna` → 항상 허용
     - `patron` → `board_has_patron_board` 필요 (메시지: rank 3/Patron)
     - `artist_promo` → `board_has_promo_board` 필요 (메시지: rank 99/Artist)
     - 그 외(default) → 거부

⚠️ **`min_rank_to_write` 컬럼은 DB에 존재(patron=3, artist_promo=99로 세팅됨)하지만 `canWriteToBoard`가 실제로 참조하지 않는다.** 쓰기 권한은 오직 `board_type` + tier 플래그로만 결정되며, `min_rank_to_write`는 `/api/boards`에서 응답에 그대로 pass-through될 뿐 로직에 관여하지 않는다. 새 보드를 추가할 때 `min_rank_to_write`만 세팅하고 끝내면 실제 권한은 바뀌지 않으므로 주의.

## 4. 등급별 접근 가능한 콘텐츠

### 사일로상점 큐레이션 (`GET /api/items/[id]`)

⚠️ 이 라우트는 `serverAuth.ts`를 쓰지 않고 자체 inline 인증 로직을 사용하며, `curation_level` 컬럼도 읽지 않고 `membership_rank`를 직접 하드코딩 임계값과 비교한다(로그인 안 하면 `rank = -1`):

| 필드 | 공개 조건 |
|---|---|
| `era_info` | 전체 공개 (비로그인 포함) |
| `era_context` | `rank >= 1` (Alice+) |
| `maker_info` | `rank >= 2` (Great Gatsby+) |
| `previous_owner_story` (+ `item_personas` 이름/사진) | `rank >= 3` (Patron+) |

잠긴 필드는 `{ locked: true, message: "<등급명> 등급부터 열람 가능" }`으로 응답.

### 게시판 (`boards.board_type`별)

| board_type | 대상 보드 | 읽기 | 쓰기 |
|---|---|---|---|
| `topic` | 자유게시판 외 13개 클럽 주제 게시판 | 전체 공개 | 로그인만 하면 가능 |
| `group` | 7개 클럽 모임방(mon~sun) | 전체 공개 | `board_write_scope === "all"` 필요 |
| `patron` | 패트론 라운지 | `board_has_patron_board` 필요 | `board_has_patron_board` 필요 |
| `artist_promo` | 아티스트 홍보 | 전체 공개 | `board_has_promo_board` 필요 (Artist) |
| `adoption_story` | After Adoption | 전체 공개 | 로그인 + 본인 소유 `confirmed` 주문 필수(등급 무관) |
| `archive` | 자료게시판 | 전체 공개 | 로그인만 하면 가능 |
| `qna` | 질문과 답변 | 전체 공개 | 로그인만 하면 가능 |

도슨트 글(`is_docent_post = true`)은 위 표와 별개로 항상 `board_can_write_docent` 필요.

### 클럽 예약 가격 (`POST /api/reservations`)

1. `club_all_free = true` → 무조건 0원, 즉시 `confirmed`
2. 아니면 이번 달 `is_monthly_free_pick` 예약 수 < `club_monthly_free_sessions` → 이번 건 0원 무료 픽
3. 아니면 `club_participation_discount_pct` 할인 적용, `club_point_pct` 적립, `pending_transfer`

### 도슨트 구매 가격 (`POST /api/docent-purchases`)

1. `docent_free_only = true` → ⚠️ **버그성 동작**: 이름과 달리 가격을 0으로 만들지 않고 `price_charged = content.price`(정가) 그대로 `pending_transfer`로 처리됨. 새로운 로직을 짤 때 이 플래그의 실제 동작(정가 결제)을 기준으로 삼을 것 — "무료"라는 이름만 보고 동작을 추측하지 말 것.
2. 아니면 이번 달 `is_monthly_free` 구매 수 < `docent_monthly_free_count` → 이번 건 무료, `confirmed`
3. 아니면 `docent_per_item_discount_pct` 할인, `pending_transfer`
4. `docent_needs_agreement`는 응답에 `needs_agreement_notice`로 그대로 전달될 뿐 구매를 막지 않음(정보 표시용)

도슨트 콘텐츠 열람(`GET /api/docent-contents/[id]`)은 등급과 무관하며, `content.is_free` 이거나 해당 회원의 `confirmed` `docent_purchases` 행이 있어야 `body_url`이 노출된다.

### 살롱 체크인 (`POST /api/salon-checkins`)

`salon_entry_free = true` → 0원, 아니면 `salon_entry_hourly_fee × hours`(현재 hours는 1로 하드코딩).

### 공간 대관 (`POST /api/rental-bookings`)

가격 자체는 등급과 무관(요일/주말 요금 + 인원 초과 요금). 등급이 영향을 주는 건 **적립 포인트만** — `point_earned = round(price × venue_rental_point_pct / 100)`.

### 물품 구매/대여 (`POST /api/orders`)

- purchase: 기준가 `item.price`, 할인 `shop_purchase_discount_pct`, 적립 `shop_purchase_point_pct`
- rental: 기준가 `item.rental_price_per_day × rental_days`, 할인 `shop_rental_discount_pct`, 적립 `shop_rental_point_pct`

### 스타일링 프로젝트 (`/api/styling-projects*`), 위시리스트 (`/api/items/[id]/wishlist`)

**등급/tier와 무관.** 스타일링 프로젝트는 `members.is_admin`으로만 쓰기 게이트(GET은 완전 공개). 위시리스트는 로그인만 하면 등급 무관하게 사용 가능.

## 5. 새 기능 추가 시 체크리스트

1. 가격/열람 제한이 필요한가? → `getRequestMember` + `getTier`를 Route Handler에서 호출하고, 클라이언트 값은 신뢰하지 않는다.
2. 어떤 `membership_tiers` 플래그를 쓸 것인가? 기존 컬럼 중 재사용 가능한 게 있는지 §2 표를 먼저 확인 — 없으면 새 컬럼을 추가하고 이 문서의 §2/§4를 갱신한다.
3. 게시판 관련 기능이면 `min_rank_to_write`가 아니라 `board_type` + `canWriteToBoard` 분기를 수정하는 것이 맞는지 확인한다(§3 경고 참고).
4. 등급별 값 자체(정확한 %/금액)를 프로젝트 문서에 적기 전에 라이브 DB로 재검증했는지 확인한다(§1 경고 참고).
