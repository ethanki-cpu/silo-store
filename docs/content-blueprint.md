# Content Blueprint

> 이 문서는 게시판/갤러리/자료실/도슨트/상점/마이페이지 콘텐츠 모델과 그 연결 구조를 정리한
> **콘텐츠 시스템의 공식 설계 문서(SSoT)**입니다. 새 콘텐츠 타입을 추가하거나 기존 콘텐츠 간 연결을
> 바꿀 때는 이 문서를 먼저 확인하고, 변경 시 이 문서도 함께 갱신합니다.
> 최종 확인: 2026-07-27 (코드 기준).

## 1. 게시판 (Boards)

**목적**: 8개 `board_type`으로 구분된 커뮤니티 토론 시스템, 등급 게이팅은 [membership-blueprint.md](membership-blueprint.md) 참고.

- 라우트: `/boards`(목록, 8개 그룹으로 클라이언트 분류) · `/boards/[id]`(글 목록, `개념글`/`도슨트`/`답변완료`·`답변대기` 배지) · `/boards/[id]/write`(글쓰기 — `adoption_story` 보드는 본인의 `confirmed` 주문을 드롭다운으로 선택해야 함) · `/boards/[id]/[postId]`(상세, 댓글, 좋아요)
- **디자인(EPIC-046)**: 모든 게시판이 "Editorial Magazine" 디자인 언어를 공유 — 상세 규칙은 [design-system.md §10](design-system.md#10-editorial-board-디자인-시스템-게시판-전용-epic-046), 공용 컴포넌트는 `src/components/boards/{BoardHeader,PostDetailHeader,PostTags,CommentSection}.tsx`.
- API: `GET /api/boards` · `GET/POST /api/boards/[id]/posts` · `GET /api/boards/[id]/posts/[postId]`(응답에 `post.photo_url`/`post.post_number` 포함 — `post_number`는 저장 컬럼이 아니라 같은 게시판 내 작성 순서를 매 요청마다 계산한 파생값) · `POST .../comments` · `POST .../like`
- 필드: `boards(id, name, category, board_type, min_rank_to_write)` / `posts(id, board_id, author_id, title, body, is_docent_post, visibility, like_count, is_best, photo_url, order_id, created_at)` — 태그 전용 컬럼은 없고, 게시판 카테고리/도슨트·개념글 여부를 태그처럼 파생 표시(EPIC-046)
- 포인트: 글 작성 5P, 댓글 1P, 좋아요 받음 2P/개, `like_count >= 10` 도달 시 `is_best=true` 승격 + 50P

**연결**: `posts.order_id → orders.id` — After Adoption 글은 반드시 `orders.payment_status='confirmed'`인 본인 주문을 참조해야 작성 가능(서버에서 검증).

## 2. 갤러리 (`/salon/gallery/*`)

**상태: 전부 미구현.** `awards` / `parties` / `patrons` / `performances` / `visitors` 5개 서브페이지 모두 `<ComingSoon>`만 렌더링. 대응 테이블 없음.

## 3. 자료실 (Downloads)

**목적**: 관리자 업로드 파일의 공개 다운로드 목록.

- 라우트: `/downloads` — 목록은 전체 공개, 업로드 폼은 `member?.is_admin`일 때만 노출
- API: `GET /api/downloads`(공개) · `POST /api/downloads`(관리자 전용, `is_admin` 체크)
- 필드: `downloads(id, title, description, file_url, uploaded_by, created_at)`
- 다른 콘텐츠와의 연결 없음(독립 콘텐츠).

## 4. 온라인 도슨트 (Docent)

**목적**: `category`(`silostore`/`salon`)로 구분되고, `figure_name`(인물) 또는 `era`(시대)로 그룹핑 가능한 유료/무료 콘텐츠.

- 라우트:
  - `/docent` — `?category=silostore|salon` 필터, "전체"/"인물로 보기"(`figure_name` 기준 클라이언트 그룹핑) 토글
  - `/docent/[id]` — 상세 + 구매(`/api/docent-purchases` 호출, 가격/할인/월 무료/동의 안내 표시)
  - `/docent/library` — "내 서재": `confirmed` `docent_purchases` → `docent_contents` 조인, category 탭
  - `/docent/collections` (EPIC-017) — `era` 기준 최신글/인기글(top 5, `docent_content_popularity` 뷰)/시대별 서브보드(top 3). 대부분 `era = null` 상태라 실제 데이터가 채워지기 전까지는 다수 섹션이 빌 수 있음.
- API: `GET /api/docent-contents/[id]`(무료거나 `confirmed` 구매 시에만 `body_url` 노출) · `POST /api/docent-purchases`(가격 로직은 membership-blueprint.md §4 참고)
- 필드: `docent_contents(id, title, keywords, is_free, price, body_url, cover_image, category, figure_name, era, created_at)` / `docent_purchases(id, member_id, content_id, price_charged, discount_applied_pct, is_monthly_free, payment_status, purchased_at)` / 뷰 `docent_content_popularity(content_id, purchase_count)`

## 5. 상점 콘텐츠 (Shop)

**목적**: Time Slip(8개 시대) 물품 소매/대여 + 이전 주인 캐릭터 큐레이션 + 별도 스타일링 포트폴리오(EPIC-016).

- 라우트:
  - `/shop` — `?era=` 필터(8개 Time Slip 시대), `status='available'` 물품 그리드, 카드마다 `WishlistButton`
  - `/shop/[id]` — 상세, 구매/대여(`/api/orders`), 4단계 잠금 큐레이션 필드(`era_info`/`era_context`/`maker_info`/`previous_owner_story`) — 등급 게이팅은 membership-blueprint.md §4 참고. `previous_owner_story` 해제 시 `item_personas` 캐릭터(이름+사진, 할머니/할아버지) 노출.
  - `/shop/heritage/grandma`, `/shop/heritage/grandpa` — **미구현**(`ComingSoon`). `item_personas` 데이터(68명: 할머니 51 / 할아버지 17)는 이미 존재하지만 전용 화면 없음.
  - `/shop/projects`(EPIC-016) — `?industry=` 필터(photo_studio/perfume_shop/doll_shop/pizza_shop/other), `styling_projects` 직접 조회
  - `/shop/projects/[id]` — 상세: 커버, 컨셉, 미디어 갤러리(`styling_project_media`, 사진/영상), "사용 물품"(`styling_project_items` → `items`, `/shop/[id]`로 역링크)
- API: `GET /api/items/[id]`(큐레이션 잠금 계산 + `item_personas` 조인) · `GET/POST /api/styling-projects`, `GET/PATCH/DELETE /api/styling-projects/[id]`(관리자 전용 쓰기, `is_admin` 체크 — 등급 무관)
- 필드: `items(id, name, photo_url, price, rental_price_per_day[생성 컬럼=price*0.3], category, era_info, era_context, maker_info, previous_owner_story, persona_id, status)` / `item_personas(id, name, type: grandma|grandpa, bio, photo_url)` / `styling_projects(id, client_name, industry, industry_other_label, concept, location, cover_image, project_date)` / `styling_project_media(id, project_id, media_type, media_url, caption, sort_order)` / `styling_project_items(id, project_id, item_id ON DELETE SET NULL)`

## 6. 마이페이지 콘텐츠 (Mypage)

`/mypage`는 EPIC-022(11개 탭 도입)·EPIC-045(라우트 분리)를 거쳐 현재 **허브 + 11개 독립 라우트** 구조다.

- `src/app/mypage/layout.tsx` — 로그인 게이트, 등급/포인트 요약 조회, `MyPageNav`(Link 기반, `usePathname()`으로 활성 탭 판단) 렌더링, `MyPageProvider`로 하위 라우트에 `memberId` 전달.
- `src/app/mypage/page.tsx` — 허브("작은 박물관 입구"), 11개 섹션을 카드 그리드로 안내.
- 11개 탭(순서 고정, `src/components/mypage/mypageConfig.ts`의 `MYPAGE_TABS`가 SSoT):
  1. **나의 컬렉션** (`/mypage/collections/[category]`) — 9개 서브카테고리: 나의 보물(`treasure`, `orders` 재사용)/나를 만든 책(`book`)/영화(`movie`)/음악(`music`)/좋아하는 예술가(`artist`)/장소(`place`)/향기(`scent`)/브랜드(`brand`)/시대(`era`). `treasure`는 `orders`(`payment_status='confirmed'`) 조회, 나머지 8개는 `member_collections.category` 조회 + `CollectionModal.tsx`로 등록/수정, `CollectionCategoryPanel.tsx`가 렌더링 담당.
  2. **나의 위시리스트** (`/mypage/wishlist`) — `WishlistPanel`, `wishlists → items` 조인(§8 참고).
  3. **팔로우** (`/mypage/follow`) — `FollowPanel`, `member_follows` 기준 팔로잉/팔로워 목록.
  4. **나의 살롱** (`/mypage/salon`) — `PlaceholderPanel`, 데이터 소스 미지정.
  5. **나의 도슨트 수료증** (`/mypage/docent-certificate`) — `PlaceholderPanel`, 데이터 소스 미지정.
  6. **나의 공간** (`/mypage/space`) — `PlaceholderPanel`, 데이터 소스 미지정.
  7. **나의 전시회** (`/mypage/exhibition`) — `PlaceholderPanel`, 데이터 소스 미지정.
  8. **받은 배지** (`/mypage/badges`) — `BadgesPanel`, `member_badges` 조회.
  9. **내가 쓴 댓글** (`/mypage/comments`) — `CommentsPanel`, 최근 30개, `comments → posts → boards` 조인.
  10. **타임라인** (`/mypage/timeline`) — `PlaceholderPanel`, 데이터 소스 미지정.
  11. **방문자 기록** (`/mypage/visitors`) — `VisitorsPanel`, `member_visitors` + `public_profiles` 조인.
- EPIC-022 이전의 "갤러리/오늘의 영감/일반 글/내가 소유한 물품/사일로상점 구매 물품" 5섹션 구성은 완전히 대체됨 — 개인 글(`posts.board_id IS NULL`) 노출은 이제 마이페이지가 아니라 §7 마이피드(`/me`)에서만 담당.

## 7. 마이피드 (`/me`, `/me/write`, `/u/[memberId]`) — 마이페이지와 별개

- `/me` — 본인 글(`board_id IS NULL`) 전체를 공개범위(공개/비공개/친구공개) 표시와 함께 필터 없이 조회. mypage의 ①③ 섹션과 **동일한 API**(`/api/members/[memberId]/posts`)를 쓰지만 mypage는 photo_url 유무로 필터링된 부분집합만 보여준다.
- `/me/write` — `POST /api/posts` (`{body, photoUrl, visibility}`, `board_id` 없음, title 없음) — 이 방식으로 `posts.board_id = null` 행이 생성됨.
- `/u/[memberId]` — 타 회원의 마이피드 공개 조회.

**결론**: 마이피드와 마이페이지는 라우트/화면이 다르지만, 동일한 `posts` 테이블의 `board_id IS NULL` 슬라이스를 공유한다.

## 8. Wishlist (EPIC-017)

- `src/components/WishlistButton.tsx` — 🤍/❤️ 토글. 비로그인 시 `/login`으로 이동. 클릭 시 `POST /api/items/[id]/wishlist`. 마운트 시 `wishlists`를 직접 조회해 초기 상태 판단.
- API: 토글 방식(있으면 delete, 없으면 insert), `unique(member_id, item_id)` DB 제약.
- **아이템(`items`)에만 적용** — 도슨트 콘텐츠, 스타일링 프로젝트, 게시글에는 위시리스트 없음.
- 노출 위치: `/shop`(카드), `/shop/[id]`(상세), `/mypage`(찜 목록 섹션).

## 9. 콘텐츠 간 연결 구조 요약

| From | To | 연결 방식 |
|---|---|---|
| `posts.order_id` | `orders.id` | After Adoption 글은 `confirmed` 주문 참조 필수(서버 검증) |
| `docent_contents.figure_name` | (자체 그룹핑) | `/docent` "인물로 보기" — 별도 인물 테이블 없이 문자열 일치로 그룹핑 |
| `docent_contents.era` | `items.category` (동일 slug 집합) | Time Slip 시대 taxonomy 공유(FK 아님, 관례일 뿐) |
| `items.persona_id` | `item_personas.id` | "이전 주인" 캐릭터, Patron(rank≥3) 이상만 노출 |
| `styling_project_items.item_id` | `items.id` | 포트폴리오 ↔ 상점 아이템 링크(ON DELETE SET NULL), 프로젝트→아이템 단방향 링크(아이템→프로젝트 역링크 없음) |
| `wishlists.item_id` | `items.id` | 위시리스트는 상점 아이템 전용 |
| `points_ledger.related_id` | `posts.id`/`comments.id` (느슨한 uuid, FK 아님) | post 5P / comment 1P / like_received 2P / best_post 50P |
| `posts.board_id = null` + `photo_url` | mypage §1/§3 | `/me/write`로 생성된 개인 글이 mypage에서 필터링되어 재사용됨 |
| `orders.member_id` | mypage §4/§5, After Adoption 글쓰기 드롭다운 | 동일 `orders` 테이블을 두 곳에서 재사용 |

## 10. 구현 현황 한눈에 보기

| 콘텐츠 타입 | 상태 |
|---|---|
| 게시판 | 완전 구현 (등급 게이팅, After Adoption 연결 포함) |
| 갤러리(5개) | **미구현** (전부 ComingSoon) |
| 자료실 | 완전 구현 |
| 온라인 도슨트 | 완전 구현 |
| 상점 — 물품 목록/상세/큐레이션 | 완전 구현 |
| 상점 — Heritage(할머니/할아버지) | **미구현** (ComingSoon, `item_personas` 데이터는 존재) |
| 상점 — 스타일링 프로젝트(EPIC-016) | 완전 구현 (nav 미연결, §navigation-blueprint 참고) |
| 마이페이지 | 11개 탭 중 6개(나의 컬렉션/위시리스트/팔로우/받은 배지/내가 쓴 댓글/방문자 기록) 완전 구현, 5개(나의 살롱/도슨트 수료증/공간/전시회/타임라인)는 Placeholder |
| 마이피드 | 완전 구현 |
| Wishlist(EPIC-017) | 완전 구현, 아이템 전용 |
