# Content Blueprint

> 이 문서는 게시판/갤러리/자료실/도슨트/상점/마이페이지 콘텐츠 모델과 그 연결 구조를 정리한
> **콘텐츠 시스템의 공식 설계 문서(SSoT)**입니다. 새 콘텐츠 타입을 추가하거나 기존 콘텐츠 간 연결을
> 바꿀 때는 이 문서를 먼저 확인하고, 변경 시 이 문서도 함께 갱신합니다.
> 최종 확인: 2026-07-27 (코드 기준).

## 1. 게시판 (Boards)

**목적**: 8개 `board_type` 그룹(자유/클럽주제/모임별/패트론/아티스트홍보/After Adoption/자료게시판/Q&A)으로 구분된 커뮤니티 토론 시스템 + Board Definition System(EPIC-047)으로 생성한 개별 게시판들 — EPIC-048(Silo Store 영역), EPIC-049(Community 영역, 기존 DB 재분류 포함), EPIC-050(Membership/Gallery/Archive 영역), EPIC-051(Studio/공간 문의 영역, 예약·문의는 기존 페이지로 링크). 등급 게이팅은 [membership-blueprint.md](membership-blueprint.md) 참고.

- 라우트: `/boards`(hub — 최신글/인기글/추천글 종합 + "게시판 허브" 바로가기(최상위 hub만) + 8개 그룹 게시판 디렉토리) · `/boards/[id]`(일반 게시판은 글 목록, hub 게시판은 하위 게시판 피드+카드로 자동 분기) · `/boards/[id]/write`(글쓰기 — `adoption_story` 보드는 본인의 `confirmed` 주문을 드롭다운으로 선택해야 함, 태그 입력 가능, hub 게시판은 글쓰기 자체가 막힘) · `/boards/[id]/[postId]`(상세, 댓글, 좋아요, 북마크, 공유)
- **개별 게시판(EPIC-048/049/050/051)**: `boards.board_type` CHECK 제약을 넓히지 않고 기존 `'topic'`(또는 EPIC-049의 클럽/모임방처럼 기존 `'group'`)을 재사용, `category` 컬럼에 게시판 slug를 담아 `src/lib/boardLayout.ts`의 `INDIVIDUAL_BOARD_DEFINITIONS`가 이 slug로 정의를 찾는다(`resolveBoardDefinition()`이 개별 slug를 그룹 로직보다 먼저 확인). hub는 `boardType:"hub"`로 `allowPosting:false`이고 다른 hub의 자식일 수도 있다(EPIC-049/050/051). `BoardDefinition.accessLevel`(EPIC-050, `"patron"`|`"secret_room"`)은 개별 게시판에 `board_type`과 무관한 커스텀 등급 게이팅을 걸 수 있는 필드 — `"patron"`만 `src/lib/serverAuth.ts`의 `canReadBoard`/`canWriteToBoard`에 실제로 연결돼 있고(패트론 게시판), `"secret_room"`은 아직 표시용 메타데이터일 뿐 실제 인가 로직은 없다. `BoardDefinition.ctas`(EPIC-051, `{label, href}[]`)는 "문의하기"/"예약하기" 같은 액션 버튼을 기존 실제 페이지(`/rental?floor=...`, `/space-inquiry/*`, `/shop/projects`)로 연결 — `BoardHeader`가 그대로 렌더링하며 새 예약 시스템은 만들지 않는다(Studio 영역에서 사용).
- **디자인(EPIC-046) + Board Definition System(EPIC-047)**: 모든 게시판이 "Editorial Magazine" 디자인 언어 + 공통 렌더링 엔진을 공유 — 상세 규칙은 [design-system.md §10](design-system.md#10-editorial-board-디자인-시스템--board-engine-게시판-전용-epic-046047), 공용 컴포넌트는 `src/components/boards/{BoardHeader,BoardRenderer,Pagination,PostDetailHeader,PostTags,PostActions,CommentSection}.tsx`. `board_type`(8종)은 `src/lib/boardLayout.ts`의 `BOARD_DEFINITIONS` config 레지스트리 + `resolveBoardDefinition({board_type, category})`로 화면 레이아웃(`community`/`story`/`gallery`/`hub`/`timeline`, EPIC-050에서 5종으로 확장)뿐 아니라 검색/정렬/페이지네이션 가능 여부, 좋아요/댓글/북마크/태그 노출 여부, 기본 정렬, 페이지 크기까지 전부 결정 — 새 게시판 "종류"는 DB 시드 행 + 이 레지스트리에 정의 추가만으로 생성되고 페이지/컴포넌트 코드는 바꾸지 않는다(판단 근거는 CHANGELOG EPIC-047 Part 2 참고). `timeline`은 `BoardRenderer.tsx` 내부의 `TimelineView`+`groupPostsByYearMonth`("Timeline Engine")가 연/월/일로 묶어 보여준다 — 향후 마이페이지 타임라인 탭도 재사용 가능하도록 범용 필드에만 의존(EPIC-050, 아직 mypage 쪽 연동은 안 함).
- API: `GET /api/boards` · `GET/POST /api/boards/[id]/posts`(GET은 `?page=&sort=&q=` 지원 — 정렬 5종: latest/popular/views/comments/oldest, 검색 대상: 제목/내용/작성자/태그, 페이지당 10개) · `GET /api/boards/[id]/posts/[postId]`(응답에 `post.photo_url`/`post.tags`/`post.view_count`/`post.updated_at`/`post.post_number`/`bookmarkedByMe` 포함, 조회 시마다 `view_count` 1 증가) · `POST .../comments` · `POST .../like` · `POST .../bookmark`(토글) · `GET /api/boards/feed`(hub용 최신글/인기글/추천글 집계, 등급 게이팅 반영)
- 필드: `boards(id, name, category, board_type, min_rank_to_write)` / `posts(id, board_id, author_id, title, body, is_docent_post, visibility, like_count, is_best, photo_url, tags, view_count, updated_at, order_id, created_at)` / `post_bookmarks(id, member_id, post_id, created_at)` — `tags`/`view_count`/`updated_at`/`post_bookmarks`는 EPIC-047 신규(라이브 미적용, 관련 API는 컬럼 없을 때 레거시 필드로 자동 폴백). `post_number`(글 번호)와 "추천글"(`is_best` 재해석)은 저장 컬럼이 아니라 API가 매 요청마다 계산하는 파생값. `updated_at`은 게시글 수정 기능 자체가 아직 없어 항상 `created_at`과 동일.
- 포인트: 글 작성 5P, 댓글 1P, 좋아요 받음 2P/개, `like_count >= 10` 도달 시 `is_best=true` 승격 + 50P

**연결**: `posts.order_id → orders.id` — After Adoption 글은 반드시 `orders.payment_status='confirmed'`인 본인 주문을 참조해야 작성 가능(서버에서 검증).

## 2. 갤러리 (`/salon/gallery/*`)

**상태: 화면(`/salon/gallery/*`)은 EPIC-054A에서 Title/Subtitle/Breadcrumb/Description만 있는 정적 페이지로 전환됐지만(게시판 연결은 이번 EPIC 범위 밖), 같은 주제의 실제 콘텐츠는 Board Definition System의 `Gallery` hub로 옮겨가 구현됨(EPIC-050)** — `awards`/`performances`/`parties`/`gallery-visitors`/`patrons` 5개 게시판(`/boards/[id]`, story 레이아웃)이 좋아요/댓글/태그/검색 등 실제 서비스 가능한 형태로 존재한다. `/salon/gallery/*` 정적 페이지를 이 게시판으로 연결(리다이렉트 또는 안내)할지는 아직 결정되지 않음(NEXT_TASK.md 참고).

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
  - `/shop/heritage/grandma`, `/shop/heritage/grandpa` — **정적 페이지**(EPIC-054A, `PageHeader`). `item_personas` 데이터(68명: 할머니 51 / 할아버지 17)는 이미 존재하지만 이 화면에서 실제로 조회/표시하지는 않음(게시판·데이터 연결은 범위 밖).
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
| 갤러리(5개) | 정적 페이지만 구현(EPIC-054A) — 실제 콘텐츠는 Board Definition `Gallery` hub가 대신 담당 |
| 자료실 | 완전 구현 |
| 온라인 도슨트 | 완전 구현 |
| 상점 — 물품 목록/상세/큐레이션 | 완전 구현 |
| 상점 — Heritage(할머니/할아버지) | 정적 페이지만 구현(EPIC-054A, `item_personas` 데이터는 존재하나 미연동) |
| 상점 — 스타일링 프로젝트(EPIC-016) | 완전 구현 (nav 미연결, §navigation-blueprint 참고) |
| 마이페이지 | 11개 탭 중 6개(나의 컬렉션/위시리스트/팔로우/받은 배지/내가 쓴 댓글/방문자 기록) 완전 구현, 5개(나의 살롱/도슨트 수료증/공간/전시회/타임라인)는 Placeholder |
| 마이피드 | 완전 구현 |
| Wishlist(EPIC-017) | 완전 구현, 아이템 전용 |
