# Navigation Blueprint

> 이 문서는 `src/lib/navConfig.ts` + `src/components/Navbar.tsx` + `src/app` 하위 실제 라우트를 기준으로 작성된
> **Navigation 구조의 공식 설계 문서(Single Source of Truth)**입니다.
> Navigation을 변경/추가할 때는 이 문서를 먼저 확인하고, 변경 시 이 문서도 함께 갱신합니다.
> 최종 확인: 2026-08-06 (EPIC-080, 라이브 `site_navigations` Management API 직접 조회 기준으로 전면 재작성).
>
> ⚠️ **(EPIC-080 이전 이력)** 이 문서는 오랫동안 EPIC-019 시절 하드코딩 스냅샷 기준으로 남아 있어 실제
> 라이브 구조와 어긋나 있었다 — `docs/database-schema.sql`이 드리프트했던 것과 같은 문제(§ CLAUDE.md 참고).
> 또한 `src/lib/navConfig.ts`의 `FALLBACK_NAV_TABS`(DB 조회 실패 시에만 쓰이는 코드 폴백)가 EPIC-044 때
> 라이브 DB와 전혀 다른 구조(`/heritage/grandma|grandpa/[name]`·`/community/club/[name]` 이름별 동적
> 라우트)로 재작성되면서 "코드 폴백 ≠ 라이브 DB"인 진짜 이중 구조(Dual-Nav, P0 기술부채)가 생겼다.
>
> **EPIC-080(2026-08-06)에서 확인/해소한 것**: Management API로 라이브 `site_navigations`(153행)을 직접
> 조회해 이 문서를 그 결과로 전면 재작성했다. 확인된 이름별 동적 라우트 불일치(헤리티지 할머니/할아버지
> 50+17개 이름, 주제별/요일별 클럽 20개 이름)는 `FALLBACK_NAV_TABS`를 라이브 DB와 동일한 구조로
> 고쳐 해소했고, 과거 dual-nav 혼선으로 생긴 그림자 정적 페이지 17개(§7에서 삭제 표기)를 삭제하고
> 실제 목적지로 301 리다이렉트했다(`next.config.ts`). 상세는 `CHANGELOG.md` EPIC-080 항목,
> `docs/sql/EPIC-080-nav-unification.sql` 참고.
>
> **남아있는 알려진 이슈(이번 범위 밖, §9 참고)**: (1) 여러 사이드바 항목이 같은 href로 수렴하는
> 것(소개지/포스터 → 둘 다 `/downloads`) — 실제 콘텐츠 차이가 없어 의도된 것인지 확인 필요.
> (2) `/mypage` 최상단 탭이 라이브 DB에서 `target_type='dropdown'`으로 13개 "My X" placeholder
> 하위 항목을 갖고 있는데, 이 프로젝트의 의도된 아키텍처(`CLAUDE.md`)는 "마이페이지는 단순
> 링크 탭"이다 — 실수로 dropdown이 된 것인지 의도적 변경인지 불명확, 사용자 확인 필요.
> (3) `site_navigations`에 아직 남아있는 "미분류 페이지" 버킷(약 23개 항목, `is_active=false`)에는
> 계정 페이지(로그인/설정 등, 의도적으로 nav 밖)와 상태 불명 스텁이 섞여 있음 — 개별 검토 필요.

## 1. 구조 개요

Top-level 탭은 라이브 DB 기준 5개다(`site_navigations`, `parent_id is null`, `is_active=true`), `Navbar.tsx`는 이를 `type` 필드로만 분기해 렌더링한다 — 탭 라벨/링크/그룹 구성을 하드코딩하지 않는다.

| key | label | `type` | UI 패턴 | 기본 target |
|---|---|---|---|---|
| (없음, DB 자동 id) | About Silo | `dropdown` | 플로팅 드롭다운 (하위 카테고리별 `/c/<uuid>` 링크) | 없음 |
| `silostore` | 사일로상점 | `sidebar-left` | 좌측 Sidebar (hover/click로 열림) | 없음 (사이드바 오픈 전용) |
| `salon` | 살롱데상 | `sidebar-right` | 우측 Sidebar (hover/click로 열림) | 없음 (사이드바 오픈 전용) |
| `space_inquiry` | 스튜디오 | `dropdown` | 플로팅 드롭다운 | 없음 (드롭다운 오픈 전용) |
| `mypage` | 마이 페이지 My Page | `dropdown`(라이브 상태, §ⓘ 위 경고 (2) 참고) | 플로팅 드롭다운(13개 "My X" 항목) 또는 단순 링크 | `/mypage` |

DOM 순서: About Silo → 사일로상점 → 살롱데상 → 스튜디오 → 마이 페이지 (하나의 `<nav>` 행, **`justify-center`로 화면 중앙 정렬** — EPIC-018).
로고("사일로 스토어", 좌측)와 계정 영역(우측, §6 참고)은 이 탭 행과 별개의 상단 행이며 기존 위치 그대로 유지된다.

`FALLBACK_NAV_TABS`(코드 폴백, `navConfig.ts`)는 About Silo와 mypage의 13개 하위 항목은 포함하지 않는다 — About Silo는 `/c/<uuid>` 형태의 DB 내부 카테고리 링크라 하드코딩하기에 적합하지 않고(카테고리가 삭제/재생성되면 깨짐), mypage 하위 13개는 CLAUDE.md가 문서화한 의도된 아키텍처(마이페이지 = 단순 링크)와 라이브 상태가 어긋나 있어(위 경고 (2)) 그대로 옮기지 않았다.

> ⚠️ **EPIC-018 (2026-07-26)**: 기존 4번째 탭이었던 `rental`("스튜디오 대관")은 제거되었다. 그 기능(1층/2층 스튜디오 대관 예약)은 URL을 그대로 유지한 채 `space_inquiry` 탭으로 통합되었다(§4 참고). 대신 기존에는 Navbar 우측 "계정 영역"에만 있던 마이페이지 링크가 `mypage`라는 이름의 정식 상단 탭으로 추가되었다 — 계정 영역의 기존 마이페이지 링크(§6)는 그대로 남아있어 두 진입점이 공존한다.
>
> ⚠️ **EPIC-019 (2026-07-26)**: `space_inquiry` 탭의 사용자 노출 라벨이 "공간 문의" → **"스튜디오"**로 변경되었다. `key`(`space_inquiry`)·URL(`/space-inquiry/*`, `/rental?floor=*`)·드롭다운 항목·상호작용 방식(`type: "dropdown"`)은 전혀 바뀌지 않았고, `navConfig.ts`의 `label` 문자열 한 줄만 수정되었다.

## 2. 좌측 Sidebar — 사일로상점 (silostore)

- 트리거: `사일로상점` 탭 hover/click, 또는 사이드바가 닫혀 있을 때 좌측에 고정 표시되는 🔑 풀탭(`fixed left-0 top-1/2`).
- 배경 `bg-green-800`, `-translate-x-full` ↔ `translate-x-0`로 슬라이드.
- `Navbar.tsx`는 `navTabs.find(t => t.type === "sidebar-left")`로 이 탭을 찾아 그리므로, `key`가 바뀌어도 동작한다.

**그룹: 사일로 보물들** (href `/treasures`)
- 보물 목록 collection → `/shop` [구현됨]
- 입양신청서 라이브러리 → `/shop-adoption-library`
- 분양 후기 → `/shop/reviews` [구현됨]
- After Adoption → `/shop-reviews`

**그룹: 온라인 도슨트 Online Docent** (href `/docent`, 12개 시대)
- BC 1100~146 그리스 Greek → `/c/9238ace9-c444-471f-ac9e-0067075c001d`(카테고리 페이지, era 아님)
- 1350~1600 르네상스 / 1600~1750 바로크 / 1715~1780 로코코 / 1750~1850 신고전주의 / 1795~1837 리전시 / 1837~1901 빅토리아 / 1890~1920 아르누보 / 1920~1940 아르데코 / 1940~1960 비트 세대 / 1960~1980반문화 / 1960~1980 디지털 → 각각 `/docent/<era-slug>`

**그룹: 사일로 유산 Heritage** (href `/heritage`)
- 할머니 Grandmas → `/heritage/grandmas` **[EPIC-080 갱신]** — 이전엔 `/shop/heritage/grandma`("준비 중" 정적 페이지)였으나, 실제로는 이름별 콘텐츠가 아니라 전부 같은 `grandmas` 게시판(hero+quote+board+gallery Page Builder 페이지)에 연결되므로 그 실제 목적지로 href를 정정했다. 옛 URL은 301 리다이렉트됨.
- 할아버지 Grandpas → `/heritage/grandpas` **[EPIC-080 갱신]** — 위와 동일한 이유(`grandpas` 게시판).

> ⚠️ `/shop` 자체는 `?category=`가 아니라 **`?era=`** 쿼리 파라미터를 사용하며, 자체 필터 pill은 8개 Time Slip 시대만 지원(12개 중 일부 제외). `?category=`는 `/docent`와 `getActiveNavTabKey`에서만 쓰인다.

## 3. 우측 Sidebar — 살롱데상 (salon)

- 트리거: `살롱데상` 탭 hover/click, 또는 우측 고정 🚪 풀탭(`fixed right-0 top-1/2`).
- 동일한 `bg-green-800` 스타일, `translate-x-full` ↔ `translate-x-0`.
- `Navbar.tsx`는 `navTabs.find(t => t.type === "sidebar-right")`로 이 탭을 찾아 그린다.

**그룹: 커뮤니티 Community** (href `/community`)
- 출석체크 / 예술가의 달력 → `/attendance`
- 자유게시판 → `/community/general`
- 설문 [우리들 맴] → `/polls`
- 공연 / 전시회 소개 → `/community/events`
- 이벤트 공지 → `/salon/event-notices`
- Q&A → `/community/qna`

**그룹: 주제별 클럽 게시판** (href `/community/topics`, 13개 — Page Builder catch-all(`src/app/[...slug]/page.tsx`)로 서빙되는 고정 slug, 이름별 동적 세그먼트 아님)
- 예술 Art → `/community-topics-art`
- 심리 Psychology → `/community-topics-psychology`
- 문학 Literature → `/community-topics-literature`
- 영화 & 시리즈 Movies & Series → `/c/3ed6ae95-9044-4c4e-80a1-cb4d107f9d1f`(카테고리 페이지, 유일하게 flat slug가 아님)
- 세계역사 World History → `/community-topics-world-history`
- 과학 Science → `/community-topics-science`
- 정치 Politics → `/community-topics-politics`
- 경제 Economy → `/community-topics-economy`
- 건강 Health → `/community-topics-health`
- 스포츠 Sports → `/community-topics-sports`
- 코메디 Comedy → `/community-topics-comedy`
- 인간집사들 Human Butlers → `/community-topics-pet-owners`
- 따뜻한 세상 Warm World → `/community-topics-warm-world`

**그룹: 요일별 클럽 모임** (href `/community/weekday`, 7개 — 위와 동일하게 고정 slug)
- Mon 월요 반란클럽 → `/community-weekday-monday`
- Tue 낭송 북클럽 → `/community-weekday-book`
- Wed 행간의 조각가들 - 북클럽 → `/community-weekday-between-lines`
- Thurs 영어로 놀자 클럽 → `/community-weekday-english-play`
- Fri 비포 선라이즈 클럽 → `/community-weekday-before-sunrise`
- Sat '무슨일이든 가능' 클럽 → `/community-weekday-anything-can-happen`
- Sun '연극이 끝나고 난 뒤' 클럽 → `/community-weekday-after-the-play`

> **EPIC-080 갱신**: 위 두 그룹은 과거(EPIC-044) `FALLBACK_NAV_TABS`가 `/community/club/[name]` 이름별 동적 라우트로 링크를 걸도록 재작성됐던 부분이다 — 실제 라이브 DB는 처음부터 이 고정 slug 방식을 썼고, 아무도 `/community/club/[name]`을 실제로 링크한 적이 없다(코드 폴백에만 존재하던 죽은 라우트). 그 동적 라우트 파일(`src/app/community/club/[name]/page.tsx`)은 삭제했다.

**그룹: 멤버십 Membership** (href `/membership`)
- 나의 보물 이야기 → `/salon/my-treasure-story`
- 마음일기 → `/salon/mind-diary`
- 나의 아티스트 소개 → `/salon/artist-intro`
- 월별 모임 [패트론의 살롱] → `/salon/monthly-events`
- 패트론 게시판 → `/membership/patron` [구현됨] — 유일하게 `/salon/*`가 아니라 `/membership/*`를 그대로 쓰는 항목(진짜 게시판 기능이라 별도 정적 미러가 없었음).
- 한문장 소설 프로젝트 → `/salon/one-sentence-novel`
- 비밀의 방 도슨트 → `/salon/secret-room`

**그룹: 갤러리 Gallery** (href `/gallery`, 5개)
- 시상식 → `/salon/gallery/awards`
- 공연들 → `/salon/gallery/performances`
- 파티 → `/salon/gallery/parties`
- 운명의 방문자들 → `/salon/gallery/visitors`
- 패트론들 → `/salon/gallery/patrons`

**그룹: 아카이브 Archive** (href `/archive`)
- 매체 기사들 Public Articles → `/c/ee484ff9-2a82-49fe-804d-760243d21c18`(카테고리 페이지)
- 소개지 → `/downloads`
- 포스터 → `/downloads` (소개지와 동일 href — 실제 콘텐츠 차이 없음, 위 경고 (1) 참고)

> ⚠️ `/salon/checkin`, `/salon/docent-tour`, `/salon/drinks`는 여전히 **어느 사이드바에도 연결되어 있지 않은 orphan 라우트**다(이번 EPIC 범위 밖 — 삭제 대상이 아니라 "아직 nav에 안 걸린 기능"으로 판단해 손대지 않음). 직접 URL로만 접근 가능.

## 4. 스튜디오 (space_inquiry) — 드롭다운

`Navbar.tsx`는 `type === "dropdown"`인 탭을 클릭/hover하면, 클릭된 버튼의 위치를 기준으로 플로팅 드롭다운을 연다(범용 `openDropdown(tab, event)` 핸들러 — 탭별 전용 ref 불필요).

- **공간 촬영 대관 (1층 사일로상점)** → `/rental?floor=1f_silostore` **[구현됨]**
- **공간 촬영 대관 (2층 살롱데상)** → `/rental?floor=2f_salon` **[구현됨]**
- **물품 대여** → `/space-inquiry/item-rental` **[정적 페이지]**
- **공간 스타일링** → `/space-inquiry/styling` **[정적 페이지]** — ⚠️ EPIC-016(`/shop/projects*`)와 개념이 겹치지만 서로 연결되어 있지 않음(§9 참고).

## 5. 마이 페이지 (mypage)

- 라이브 DB 기준 `target_type='dropdown'`, href `/mypage` — 13개 "My X"(My Collections Category, My Wishlist, My Follow, My Salon, My Docent Certificate, My Space, My Exhibition, My Badges, My Comments, My Bucketlist, My Timeline, My Visitors, My Mind Diary) 하위 항목이 딸려 있다.
- 이 프로젝트의 의도된 아키텍처(`CLAUDE.md` Architecture 절)는 "마이페이지(`link`) — `/mypage` 직접 링크"다 — 라이브 상태가 이 의도와 어긋나 있을 가능성이 있다(위 경고 (2), 이번 EPIC 범위 밖이라 확인만 하고 변경하지 않음).
- 로그인하지 않은 상태에서 `/mypage`에 접근하면 페이지 자체의 클라이언트 가드가 `/login`으로 리다이렉트한다.

## 6. Account 영역 (Navbar 상단 우측, 상단 탭 구조 밖)

`navConfig.ts`가 아니라 `Navbar.tsx`에 직접 렌더링됨. **EPIC-018 이후에도 위치/구성 변경 없음** — "마이페이지" 상단 탭이 별도로 추가되었을 뿐, 이 영역은 그대로 유지된다.

- **관리자** → `/admin/payments` (`session && member?.is_admin`일 때만 노출)
- **회원 배지 → `/mypage`** (`${member.name}님 · ${member.tier_name}`) — 상단 `마이페이지` 탭과 같은 목적지이나 별개의 링크로 공존.
- **로그아웃** — `supabase.auth.signOut()` → `router.push("/")` + `router.refresh()`
- **로그인** → `/login` (비로그인 시)

내부 링크로만 도달하는 계정 관련 페이지 (Navbar/navConfig에 직접 링크 없음, 의도적으로 4-탭 구조 밖):
- `/settings` — `/mypage`에서 "설정" 링크로 진입
- `/me`, `/me/write` — 마이피드(개인 글) 작성/조회, `/mypage`와는 별개 라우트(§ content-blueprint 참고)
- `/u/[memberId]` — 타 회원 마이피드 조회
- `/admin/payments` — 관리자 결제 확인
- `/admin/projects/new` — EPIC-016 스타일링 프로젝트 등록. **Navbar/navConfig에 링크 없음**, 직접 URL로만 접근, 비관리자는 `/`로 리다이렉트.

## 7. 전체 URL 목록 (섹션별, 구현 여부 표기)

범례: **[구현됨]** = 실제 Supabase 연동, **[정적 페이지]** = Title/Subtitle/Breadcrumb/Description만 있는 `PageHeader` 렌더링, **[삭제됨 → 리다이렉트]** = EPIC-080에서 그림자 중복으로 판정해 파일 삭제 + `next.config.ts`의 301 리다이렉트로 대체.

### 사일로상점
- `/shop` [구현됨] — `?era=` 필터, `WishlistButton` 포함
- `/shop/[id]` [구현됨]
- ~~`/shop/heritage/grandma`~~ **[삭제됨 → `/heritage/grandmas`]**
- ~~`/shop/heritage/grandpa`~~ **[삭제됨 → `/heritage/grandpas`]**
- `/heritage/grandmas`, `/heritage/grandpas` [구현됨] — Page Builder 페이지(hero+quote+board+gallery), 각각 `grandmas`/`grandpas` 게시판에 연결. **[EPIC-080 갱신]** nav 실제 목적지.
- ~~`/heritage/grandma/[name]`~~, ~~`/heritage/grandpa/[name]`~~ **[EPIC-080에서 파일 삭제]** — 이름별로 실제 콘텐츠가 다른 게 아니라 전부 같은 게시판에 연결될 뿐이라 위 두 통합 페이지로 대체.
- `/shop/projects` [구현됨] — EPIC-016, `?industry=` 필터. **네비게이션에 연결 안 됨(orphan, 이번 범위 밖)**
- `/shop/projects/[id]` [구현됨]
- `/docent/collections` [구현됨] — era별 앵커 섹션
- `/docent/[id]` [구현됨]
- `/docent` [구현됨] — `?category=silostore|salon`
- `/docent/library` [구현됨]
- `/boards`, `/boards/[id]`, `/boards/[id]/write`, `/boards/[id]/[postId]` [구현됨]

### 살롱데상
- `/attendance` [구현됨]
- `/clubs`, `/clubs/[id]` [구현됨]
- `/community/general`, `/community/events`, `/community/qna` [구현됨]
- `/community-topics-*`(13개), `/community-weekday-*`(7개) [구현됨] — Page Builder catch-all
- ~~`/community/club/[name]`~~ **[EPIC-080에서 파일 삭제]** — nav가 실제로 링크한 적 없는 죽은 동적 라우트.
- `/salon/monthly-events` [정적 페이지]
- `/polls` [구현됨]
- `/salon/event-notices` [정적 페이지]
- `/salon/one-sentence-novel` [정적 페이지]
- `/salon/mind-diary` [정적 페이지]
- `/salon/my-treasure-story` [정적 페이지]
- `/salon/secret-room` [정적 페이지]
- `/salon/artist-intro` [정적 페이지]
- `/membership/patron` [구현됨] — 실제 게시판
- ~~`/membership/artist-intro`~~, ~~`/membership/mind-diary`~~, ~~`/membership/my-treasures`~~, ~~`/membership/one-sentence-novel`~~, ~~`/membership/secret-room`~~ **[삭제됨 → 각각 대응하는 `/salon/*`로 리다이렉트]** — nav가 가리키지 않던 그림자 중복.
- `/salon/gallery/awards|performances|parties|visitors|patrons` [정적 페이지] (5개 전부)
- ~~`/gallery/awards`~~, ~~`/gallery/parties`~~, ~~`/gallery/patrons`~~, ~~`/gallery/performance`~~, ~~`/gallery/visitors`~~ **[삭제됨 → 각각 대응하는 `/salon/gallery/*`로 리다이렉트]**
- `/downloads` [구현됨]
- ~~`/archive/brochure`~~, ~~`/archive/posters`~~ **[삭제됨 → `/downloads`로 리다이렉트]**
- `/salon/checkin` [구현됨] — orphan (nav 미연결, 이번 범위 밖)
- `/salon/docent-tour` [정적 페이지] — orphan
- `/salon/drinks` [정적 페이지] — orphan

### 스튜디오 (구 "공간 문의", 구 스튜디오 대관 포함)
- `/rental?floor=1f_silostore|2f_salon`, `/rental/[rentalTypeId]` [구현됨] — `스튜디오` 드롭다운의 "공간 촬영 대관" 2개 항목이 가리킴(EPIC-018, 라벨은 EPIC-019에서 "공간 문의"→"스튜디오"로 변경)
- `/space-inquiry/item-rental|styling` [정적 페이지]
- `/space-inquiry/shoot-rental` [정적 페이지] — orphan, `/rental`로 대체되어 nav 미연결(EPIC-018 이전 유물)

### 계정 / 인증 / 관리자
- `/login`, `/signup` [구현됨]
- `/mypage` [구현됨] — 상단 탭 + 계정 영역 두 곳에서 진입 가능(EPIC-018)
- `/settings` [구현됨]
- `/me`, `/me/write`, `/u/[memberId]` [구현됨]
- `/admin/payments` [구현됨]
- `/admin/projects/new` [구현됨] — orphan (nav 미연결)
- `/` [placeholder] — **여전히 create-next-app 기본 스캐폴드**, 실제 랜딩 페이지 아님

## 8. `getActiveNavTabKey()` 로직 (정확 로직, `src/lib/navConfig.ts`)

```ts
export function getActiveNavTabKey(
  pathname: string,
  categoryParam: string | null,
): string | null {
  if (pathname.startsWith("/shop")) return "silostore";
  if (pathname.startsWith("/docent/collections")) return "silostore";

  if (
    pathname.startsWith("/clubs") ||
    pathname.startsWith("/boards") ||
    pathname.startsWith("/salon") ||
    pathname.startsWith("/downloads") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/polls")
  ) {
    return "salon";
  }

  if (pathname.startsWith("/rental") || pathname.startsWith("/space-inquiry")) {
    return "space_inquiry";
  }

  if (pathname === "/docent") {
    return categoryParam === "salon" ? "salon" : "silostore";
  }

  if (pathname.startsWith("/mypage")) return "mypage";

  return null;
}
```

핵심 주의사항:
1. **`/docent`(정확히 일치)만 쿼리 파라미터(`?category=`)로 활성 탭이 갈린다.** `Navbar.tsx`가 `getActiveNavTabKey(pathname, searchParams.get("category"))`로 호출.
2. `/docent/collections`는 `/docent`의 `category` 분기와 **무관하게 항상 `silostore`**로 고정된다(별도 `startsWith` 분기가 먼저 매칭).
3. `/shop/*`는 `startsWith` 매칭이므로 `/shop` 하위에 새 라우트를 추가해도 자동으로 `silostore`가 하이라이트된다. `/heritage/*`는 이 목록에 없어(과거에도 없었음) 헤리티지 페이지 방문 시 어떤 탭도 하이라이트되지 않는다 — 이 함수 자체는 EPIC-080 범위에서 건드리지 않았다(nav href 정합성 문제와는 별개인 "활성 탭 하이라이트" 로직이라 별도 확인 필요, §9 참고).
4. `salon`의 `startsWith` 목록에 `/salon` 자체가 포함되므로, nav에 연결되지 않은 `/salon/checkin`·`/salon/docent-tour`·`/salon/drinks`도 직접 방문 시 살롱데상 탭이 하이라이트된다. `/community/*`, `/gallery/*`, `/membership/*`, `/archive/*`도 이 목록에 없어(단 `/salon` prefix라 `/salon/gallery/*`는 걸림) 하이라이트가 일관되지 않을 수 있다.
5. **(EPIC-018)** `/rental`은 `/space-inquiry`와 같은 분기로 묶여 `space_inquiry` 탭을 하이라이트한다. `?floor=`는 활성 탭 판정에 영향을 주지 않는다.
6. **(EPIC-018)** `/mypage`로 시작하는 경로는 `mypage` 탭을 하이라이트한다. `/me`, `/settings`, `/admin/*`, `/u/[memberId]`는 여전히 어떤 분기에도 걸리지 않아 `null`(탭 미하이라이트)을 반환한다.

## 9. 알아둘 구조적 특이사항 (이번 EPIC 범위 밖, 별도 확인/작업 필요)

- 4개 상단 탭 + About Silo에 sidebar / dropdown / plain link 여러 UI 패턴이 쓰인다 — 새 탭 추가 시 `NavTabType`(`sidebar-left`/`sidebar-right`/`dropdown`/`link`) 중 하나를 정해야 한다. `sidebar-left`/`sidebar-right` 타입은 각각 하나씩만 존재해야 한다(Navbar가 `find()`로 첫 번째 일치 탭만 사용).
- 소개지/포스터가 여전히 동일한 href(`/downloads`)로 수렴한다 — 실제 콘텐츠 차이가 없다면 의도된 것인지 확인 필요(위 경고 (1)).
- EPIC-016(`/shop/projects*`)은 완전히 구현되었지만 nav에 진입점이 없고, 반대로 `/space-inquiry/styling`은 nav에 연결되어 있지만 정적 페이지다(EPIC-054A) — 같은 개념("공간 스타일링")이 두 개의 분리된 표면으로 존재한다. **(EPIC-051)** Board Definition System의 `Studio → 공간 스타일링` 게시판(`/boards/[id]`)이 `ctas`로 두 표면을 모두 링크(대표 프로젝트→`/shop/projects`, 문의/신청→`/space-inquiry/styling`)해 이어주지만, nav 자체의 이 불일치를 근본적으로 해소한 것은 아니다.
- EPIC-017(위시리스트)은 전용 페이지 없이 `/shop`, `/shop/[id]`, `/mypage`에 임베드된 `WishlistButton`으로만 존재한다.
- **(EPIC-018)** "마이페이지"는 상단 탭과 계정 영역 링크 두 곳에 동시에 존재한다 — 의도적인 중복.
- `/mypage` 탭이 라이브 DB에서 `dropdown`(13개 하위 항목)으로 되어 있는 것이 의도적인지, 실수인지 확인 필요(§5, §1 경고 (2)).
- `site_navigations`의 "미분류 페이지" 버킷(약 23개, EPIC-080 조사 시점)에 남아있는 나머지 항목(Boards\*/Clubs\*/Rental\*/Studio\*/Shop\* 등)은 개별적으로 "의도적으로 nav 밖에 둔 페이지"인지 "추가로 정리해야 할 그림자 페이지"인지 검토가 안 됐다 — 이번 EPIC은 명백한 dual-nav 패턴(같은 기능이 두 URL로 존재)만 다뤘다.
- 홈(`/`)은 아직 실제 랜딩 페이지가 아니다.
