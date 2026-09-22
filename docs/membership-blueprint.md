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

## 결제 방식 이원화 (EPIC-158, 2026-09-20) — **폐기됨 (2026-09-21, EPIC-159)**

**아래는 역사적 기록이다. 토스페이먼츠(가입비 220,000원 + 연회비 110,000원 선결제 요구)를 폐기하고 스텝페이(Steppay) + 나이스페이 For Startup으로 전환했다 — 코드/DB(`toss_*` 함수, `member_billing` 테이블, `/api/payments/toss/*`)는 2026-09-22 세션에서 완전히 제거됐다.** 현재 정기구독 결제는 `steppay_*` RPC(서버 전용 비밀 `STEPPAY_DB_RPC_SECRET`)와 `steppay_subscriptions` 테이블을 사용하며, 웹훅은 `/api/webhooks/steppay`다. 실물 결제(무통장 입금)는 아래 설명과 동일하게 유지된다.

- ~~**디지털 결제 = 토스페이먼츠**: 유료 등급 4종(Alice/Great Gatsby/Patron/Lautrec) 정기구독(HOTFIX-158.4, `member_billing.tier_rank`)(`/api/payments/toss/billing-auth`, 빌링키는 `member_billing`에 저장 — 클라이언트 역할은 `toss_billing_key` 컬럼을 읽을 수 없음)과 온라인 도슨트 단건 결제(`/api/payments/toss/success`, `docent_purchases`가 `pending_payment → confirmed`).~~
- **실물 결제 = 무통장 입금**: 사일로 상점 `orders`는 기존 `pending_transfer` + `/admin/payments` 관리자 승인 그대로(PG 위젯 없음, 계좌 안내는 `NEXT_PUBLIC_SILO_BANK_ACCOUNT`).
- ~~결제 확정/승급은 service-role 키 없이 `SECURITY DEFINER` RPC(`toss_*`, 서버 전용 비밀 `TOSS_DB_RPC_SECRET`)로만 수행하고, `members.membership_rank`/`is_admin` 직접 변경과 `docent_purchases.payment_status='confirmed'` 직접 쓰기는 트리거로 차단한다(`docs/sql/EPIC-158-toss-payments.sql`).~~ → 동일한 트리거 보호 방식이 `steppay_*` RPC에도 적용된다.

## EPIC-160 등급별 접근 구조 분석 (2026-09-22)

### 현재 실제로 강제되는 구조 (membership_tiers 플래그 기준 — /membership 화면이 이 값을 그대로 보여준다)
| 구분 | Alice 10,000 | Great Gatsby 25,000 | Patron 40,000 | Lautrec 100,000 |
|---|---|---|---|---|
| 게시판 읽기 | 공개 전체 | 공개 전체 | 공개 전체 | 공개 전체 |
| 게시판 쓰기 | 전체(클럽 모임방 포함) | + 도슨트 글쓰기 | + 패트론 라운지, 게시판 개설 | 동일 |
| 클럽 모임 | 정가 | 정가 + 우선 예약 | 월 1회 무료 + 10% 할인 + 우선 예약 | 전체 무료 |
| 살롱 | — | — | 입장 무료, 월별 살롱 모임 초대, 비밀의 방 자격(심사) | + 음료·투어 도슨트 무료 |
| 온라인 도슨트 | 정가 | 정가 | 월 1건 무료 + 20% | 월 1건 무료 + 20% |
| 사일로 상점 | 큐레이션 1단계 | 대여 10% | 구매 5% / 대여 15% | 구매 8% / 대여 15% |

### 발견한 문제
1. 62개 주제 게시판을 포함해 **읽기 제한이 거의 없다**(boards.min_rank_to_read 전부 null, 페이지 1곳만 제한) — 유료 가입 동기가 글쓰기·할인·오프라인 활동에만 의존.
2. `boards.min_rank_to_write`는 DB에 값(나의 보물들=1, 사일로 타임라인=4)이 있지만 **쓰기 API가 참조하지 않아 무효**(canWriteToBoard는 board_type 플래그만 본다).
3. **포인트 적립 역전**: 클럽/상점 구매 포인트가 Alice 3%·Great Gatsby 5%인데 Patron·Lautrec는 0% — 상위 등급이 적립을 못 받는다(할인으로 대체한 설계인지 확인 필요).
4. **Patron(40,000) ↔ Lautrec(100,000)**: 가격은 2.5배인데 게시판 접근 차이가 없고 활동/할인 차이뿐이다.

### 권장 구조 (제안 — 적용 전 대표님 승인 필요)
원칙: (1) 읽기는 공개 유지(아카이브·검색 노출·커뮤니티 성장), (2) 유료 등급은 **참여(쓰기)·모임·전용 공간·할인**으로 차등, (3) 등급이 오를 때마다 체감 혜택이 뚜렷하게 커지게.
- **Alice**: 요일별 클럽 모임방·나의 보물들 글쓰기, 포인트 적립 강화(현행 유지).
- **Great Gatsby**: + 주제별 클럽 게시판(A/B) 글쓰기 확대, 도슨트 글쓰기, 클럽 우선 예약.
- **Patron**: + 패트론 라운지·월별 살롱 모임 게시판 **열람+글쓰기**(열람도 Patron 이상으로 제한), 게시판 개설, 월 1회 클럽 무료, 살롱 입장 무료.
- **Lautrec**: + Lautrec 전용 라운지(신설), 클럽 전체 무료, 음료·투어 도슨트 무료, 비밀의 방, 타임라인 작성 권한.
- 코드 작업: `canWriteToBoard`가 `min_rank_to_write`를 참조하도록 수정, 등급 전용 게시판에 `min_rank_to_read` 설정, 포인트 정책 확정.

### 무료 입문 등급(Silo Angel) 포함 퍼널 재분석 (EPIC-160, 2026-09-22 — "무료 유입 → 유료 전환"이 핵심) — **일부 적용됨(CHANGELOG.md EPIC-160 후속 참고)**
**진단**: 지금 Silo Angel(무료)은 읽기 전체 + 자유·주제별 게시판 글쓰기 + 무료 도슨트 + 클럽 정가 참여까지 가능해 "가입만 해도 대부분 다 되는" 등급이다. 유료로 올라갈 **막힘(gate)과 맛보기(teaser)가 거의 없고**, 전환 동기가 할인율뿐이다(상점 할인은 Alice까지 0%). 즉 유입 장치는 있으나 전환 장치가 약하다.
**원칙**: 무료 = 맛보기 + 소속감 + 습관 형성(읽기·가벼운 글쓰기·포인트), 유료 = 참여(모임방)·오프라인 모임·전용 공간·할인. 무료에서 "여기 더 있구나"를 보게 하고, 유료가 되는 순간 즉시 체감되게 한다.
**등급 사다리(제안)**
| 등급 | 역할 | 핵심 |
|---|---|---|
| Silo Angel 무료 | 유입·습관 | 공개 게시판 읽기, 자유·주제별 글쓰기, 무료 도슨트, 포인트 적립, 살롱 시간당 입장 |
| Alice 10,000 | 첫 유료 = "참여" | 요일별 클럽 모임방 글쓰기(잠금 해제), 포인트 부스트 |
| Great Gatsby 25,000 | "우선권" | 주제별 게시판 확대·도슨트 글쓰기, 클럽 우선 예약, 상점 대여 10% |
| Patron 40,000 | "소속·오프라인" | 패트론 라운지·월별 살롱 모임, 월 1회 클럽 무료, 살롱 무료, 도슨트 월 1건 |
| Lautrec 100,000 | "VIP" | 클럽 전체 무료, 음료·투어 도슨트 무료, 전용 라운지, 비밀의 방 |
**전환 장치(제안 — 일부는 코드 작업 필요)**
1. **잠금 미리보기**: 유료 전용 공간(클럽 모임방, 패트론 라운지, 월별 살롱 모임)은 Angel에게 제목·일부만 보이고 본문/쓰기는 "Alice(또는 Patron)로 올리면 참여할 수 있어요" 안내 + 가입 링크(현재 쓰기 거부 메시지만 있음).
2. **절약 계산기**: "이번 달 클럽 3회·도슨트 2건 이용 → Patron이면 N원 절약"을 마이페이지에 표시(활동 기록으로 계산).
3. **첫 달 체험가/연간 플랜**: 스텝페이 가격 플랜(첫 결제 할인, 12개월 결제 시 1~2개월 무료)으로 진입 장벽을 낮춤.
4. **가입 직후 온보딩**: 웰컴 포인트와 첫 글/첫 댓글 유도, 포인트를 유료 첫 달 결제에 일부 사용하도록 연결.
5. **퍼널 측정**: 가입→첫 활동→7일 내 재방문→유료 전환 이벤트 기록(Event Telemetry, PROJECT_ARCHITECTURE §Stage 2 후보).
**주의**: 무료 등급의 혜택을 줄이면 유입이 줄 수 있으므로, "기존 무료 기능을 빼기"보다 "유료 전용 공간을 눈에 보이게 하고 잠그기"를 우선한다.
