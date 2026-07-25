# Navigation Blueprint

> 이 문서는 `src/lib/navConfig.ts` + `src/components/Navbar.tsx` + `src/app` 하위 실제 라우트를 기준으로 작성된
> **Navigation 구조의 공식 설계 문서(Single Source of Truth)**입니다.
> Navigation을 변경/추가할 때는 이 문서를 먼저 확인하고, 변경 시 이 문서도 함께 갱신합니다.
> 최종 확인: 2026-07-26 (EPIC-019 반영, 코드 기준).

## 1. 구조 개요

Top-level 탭은 4개(`NAV_TABS`, `src/lib/navConfig.ts`)이며, 각 탭은 `type` 필드로 상호작용 방식이 결정됩니다.
`Navbar.tsx`는 `NAV_TABS`를 순회하며 `type`에 따라 렌더링 방식만 분기할 뿐, 탭 라벨/링크/그룹 구성을 하드코딩하지 않습니다 — `navConfig.ts`가 유일한 SSoT입니다.

| key | label | `type` | UI 패턴 | 기본 target |
|---|---|---|---|---|
| `silostore` | 사일로상점 | `sidebar-left` | 좌측 Sidebar (hover/click로 열림) | 없음 (사이드바 오픈 전용) |
| `salon` | 살롱데상 | `sidebar-right` | 우측 Sidebar (hover/click로 열림) | 없음 (사이드바 오픈 전용) |
| `space_inquiry` | 스튜디오 | `dropdown` | 플로팅 드롭다운 | 없음 (드롭다운 오픈 전용) |
| `mypage` | 마이페이지 | `link` | 일반 `<Link>` | `/mypage` |

DOM 순서: 사일로상점 → 살롱데상 → 스튜디오 → 마이페이지 (하나의 `<nav>` 행, **`justify-center`로 화면 중앙 정렬** — EPIC-018).
로고("사일로 스토어", 좌측)와 계정 영역(우측, §6 참고)은 이 탭 행과 별개의 상단 행이며 기존 위치 그대로 유지된다.

> ⚠️ **EPIC-018 (2026-07-26)**: 기존 4번째 탭이었던 `rental`("스튜디오 대관")은 제거되었다. 그 기능(1층/2층 스튜디오 대관 예약)은 URL을 그대로 유지한 채 `space_inquiry` 탭으로 통합되었다(§4 참고). 대신 기존에는 Navbar 우측 "계정 영역"에만 있던 마이페이지 링크가 `mypage`라는 이름의 정식 4번째 상단 탭으로 추가되었다 — 계정 영역의 기존 마이페이지 링크(§6)는 그대로 남아있어 두 진입점이 공존한다.
>
> ⚠️ **EPIC-019 (2026-07-26)**: `space_inquiry` 탭의 사용자 노출 라벨이 "공간 문의" → **"스튜디오"**로 변경되었다. `key`(`space_inquiry`)·URL(`/space-inquiry/*`, `/rental?floor=*`)·드롭다운 항목·상호작용 방식(`type: "dropdown"`)은 전혀 바뀌지 않았고, `navConfig.ts`의 `label` 문자열 한 줄만 수정되었다.

## 2. 좌측 Sidebar — 사일로상점 (silostore)

- 트리거: `사일로상점` 탭 hover/click, 또는 사이드바가 닫혀 있을 때 좌측에 고정 표시되는 🔑 풀탭(`fixed left-0 top-1/2`).
- 배경 `bg-green-800`, `-translate-x-full` ↔ `translate-x-0`로 슬라이드.
- `Navbar.tsx`는 `NAV_TABS.find(t => t.type === "sidebar-left")`로 이 탭을 찾아 그리므로, `key`가 바뀌어도 동작한다.

**그룹: 사일로 보물들**
- 보물 목록 → `/shop`
- 분양 후기 → `/boards`

**그룹: 온라인 도슨트 라이브러리** (11개 시대, 전부 `/docent/collections#era-<key>` 앵커)
- Renaissance / Baroque / Rococo / NeoClassicism / Regency / Victoria / Art Nouveau / Art Deco / Beat Generation / CounterCulture / Digital

**그룹: 사일로 Heritage**
- 할머니 → `/shop/heritage/grandma` (placeholder)
- 할아버지 → `/shop/heritage/grandpa` (placeholder)

> ⚠️ `/shop` 자체는 `?category=`가 아니라 **`?era=`** 쿼리 파라미터를 사용하며, 자체 필터 pill은 8개 Time Slip 시대만 지원(11개 중 beat_generation/counter_culture/digital 제외). `?category=`는 `/docent`와 `getActiveNavTabKey`에서만 쓰인다.

## 3. 우측 Sidebar — 살롱데상 (salon)

- 트리거: `살롱데상` 탭 hover/click, 또는 우측 고정 🚪 풀탭(`fixed right-0 top-1/2`).
- 동일한 `bg-green-800` 스타일, `translate-x-full` ↔ `translate-x-0`.
- `Navbar.tsx`는 `NAV_TABS.find(t => t.type === "sidebar-right")`로 이 탭을 찾아 그린다.

**그룹: Community**
- 출석체크 → `/attendance`
- 자유게시판 → `/boards`
- 주제별 소통 게시판 → `/boards` (자유게시판과 동일 href)
- Mon ~ Sun 클럽모임 → `/clubs`
- 월별 모임 [패트론의 살롱] → `/salon/monthly-events` (placeholder)
- 설문 [우리들 맴] → `/polls`
- Q&A → `/boards`
- 이벤트 공지 → `/salon/event-notices` (placeholder)

**그룹: Membership**
- 패트론 게시판 → `/boards`
- 한문장 소설 프로젝트 → `/salon/one-sentence-novel` (placeholder)
- 마음일기 → `/salon/mind-diary` (placeholder)
- 나의 보물 이야기 → `/salon/my-treasure-story` (placeholder)
- 비밀의 방 도슨트 → `/salon/secret-room` (placeholder)
- 나의 아티스트 소개 → `/salon/artist-intro` (placeholder)

**그룹: Gallery** (5개 전부 placeholder)
- 시상식 → `/salon/gallery/awards`
- 공연들 → `/salon/gallery/performances`
- 파티 → `/salon/gallery/parties`
- 운명의 방문자들 → `/salon/gallery/visitors`
- 패트론들 → `/salon/gallery/patrons`

**그룹: Library**
- 소개지 → `/downloads`
- 포스터 → `/downloads` (소개지와 동일 href)

> ⚠️ `/salon/checkin`, `/salon/docent-tour`, `/salon/drinks`는 **어느 사이드바에도 연결되어 있지 않은 orphan 라우트**입니다. 직접 URL로만 접근 가능합니다.

## 4. 스튜디오 (space_inquiry) — 드롭다운

`Navbar.tsx`는 `type === "dropdown"`인 탭을 클릭/hover하면, 클릭된 버튼의 위치를 기준으로 플로팅 드롭다운을 연다(범용 `openDropdown(tab, event)` 핸들러 — 탭별 전용 ref 불필요).

- **공간 촬영 대관 (1층 사일로상점)** → `/rental?floor=1f_silostore` **[구현됨]** — EPIC-018에서 실제 예약 페이지로 교체(과거 `/space-inquiry/shoot-rental` placeholder 대신).
- **공간 촬영 대관 (2층 살롱데상)** → `/rental?floor=2f_salon` **[구현됨]** — EPIC-018에서 신규 추가된 항목.
- **물품 대여** → `/space-inquiry/item-rental` **[placeholder]**
- **공간 스타일링** → `/space-inquiry/styling` **[placeholder]** — ⚠️ EPIC-016(`/shop/projects*`)와 개념이 겹치지만 서로 연결되어 있지 않음(§9 참고).

> ⚠️ **URL은 EPIC-018에서 전혀 바뀌지 않았다.** `/rental?floor=1f_silostore`·`/rental?floor=2f_salon`·`/rental/[rentalTypeId]` 페이지 자체와 그 구현은 그대로이며, 오직 이 페이지들을 가리키는 **nav 진입점(탭 배치)**만 옛 `rental` 탭에서 `space_inquiry` 드롭다운으로 옮겨졌다.

## 5. 마이페이지 (mypage) — 일반 링크

- `href: "/mypage"`인 `type: "link"` 탭. 사이드바/드롭다운 없이 클릭 시 바로 이동.
- 로그인하지 않은 상태에서 접근하면 `/mypage` 페이지 자체의 클라이언트 가드가 `/login`으로 리다이렉트한다(기존 동작 그대로, nav 추가로 인한 신규 로직 없음).

## 6. Account 영역 (Navbar 상단 우측, 4-탭 구조 밖)

`navConfig.ts`가 아니라 `Navbar.tsx`에 직접 렌더링됨. **EPIC-018 이후에도 위치/구성 변경 없음** — "마이페이지" 상단 탭이 별도로 추가되었을 뿐, 이 영역은 그대로 유지된다.

- **관리자** → `/admin/payments` (`session && member?.is_admin`일 때만 노출)
- **회원 배지 → `/mypage`** (`${member.name}님 · ${member.tier_name}`) — 상단 `마이페이지` 탭과 같은 목적지이나 별개의 링크로 공존.
- **로그아웃** — `supabase.auth.signOut()` → `router.push("/")` + `router.refresh()`
- **로그인** → `/login` (비로그인 시)

내부 링크로만 도달하는 계정 관련 페이지 (Navbar/navConfig에 직접 링크 없음):
- `/settings` — `/mypage`에서 "설정" 링크로 진입
- `/me`, `/me/write` — 마이피드(개인 글) 작성/조회, `/mypage`와는 별개 라우트(§ content-blueprint 참고)
- `/u/[memberId]` — 타 회원 마이피드 조회
- `/admin/payments` — 관리자 결제 확인
- `/admin/projects/new` — EPIC-016 스타일링 프로젝트 등록. **Navbar/navConfig에 링크 없음**, 직접 URL로만 접근, 비관리자는 `/`로 리다이렉트.

## 7. 전체 URL 목록 (섹션별, 구현 여부 표기)

범례: **[구현됨]** = 실제 Supabase 연동, **[placeholder]** = `<ComingSoon>` 렌더링만.

### 사일로상점
- `/shop` [구현됨] — `?era=` 필터, `WishlistButton` 포함
- `/shop/[id]` [구현됨]
- `/shop/heritage/grandma` [placeholder]
- `/shop/heritage/grandpa` [placeholder]
- `/shop/projects` [구현됨] — EPIC-016, `?industry=` 필터. **네비게이션에 연결 안 됨(orphan)**
- `/shop/projects/[id]` [구현됨]
- `/docent/collections` [구현됨] — era별 앵커 섹션
- `/docent/[id]` [구현됨]
- `/docent` [구현됨] — `?category=silostore|salon`
- `/docent/library` [구현됨]
- `/boards`, `/boards/[id]`, `/boards/[id]/write`, `/boards/[id]/[postId]` [구현됨]

### 살롱데상
- `/attendance` [구현됨]
- `/clubs`, `/clubs/[id]` [구현됨]
- `/salon/monthly-events` [placeholder]
- `/polls` [구현됨]
- `/salon/event-notices` [placeholder]
- `/salon/one-sentence-novel` [placeholder]
- `/salon/mind-diary` [placeholder]
- `/salon/my-treasure-story` [placeholder]
- `/salon/secret-room` [placeholder]
- `/salon/artist-intro` [placeholder]
- `/salon/gallery/awards|performances|parties|visitors|patrons` [placeholder] (5개 전부)
- `/downloads` [구현됨]
- `/salon/checkin` [구현됨] — **orphan** (nav 미연결)
- `/salon/docent-tour` [placeholder] — orphan
- `/salon/drinks` [placeholder] — orphan

### 스튜디오 (구 "공간 문의", 구 스튜디오 대관 포함)
- `/rental?floor=1f_silostore|2f_salon`, `/rental/[rentalTypeId]` [구현됨] — `스튜디오` 드롭다운의 "공간 촬영 대관" 2개 항목이 가리킴(EPIC-018, 라벨은 EPIC-019에서 "공간 문의"→"스튜디오"로 변경)
- `/space-inquiry/item-rental|styling` [placeholder]

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
3. `/shop/*`는 `startsWith` 매칭이므로 `/shop` 하위에 새 라우트를 추가해도 자동으로 `silostore`가 하이라이트된다.
4. `salon`의 `startsWith` 목록에 `/salon` 자체가 포함되므로, nav에 연결되지 않은 `/salon/checkin`·`/salon/docent-tour`·`/salon/drinks`도 직접 방문 시 살롱데상 탭이 하이라이트된다.
5. **(EPIC-018)** `/rental`은 이제 `/space-inquiry`와 같은 분기로 묶여 `space_inquiry` 탭을 하이라이트한다(과거에는 별도 `rental` 탭을 반환했음). `?floor=`는 여전히 활성 탭 판정에 영향을 주지 않는다.
6. **(EPIC-018)** `/mypage`로 시작하는 경로는 새로 추가된 `mypage` 탭을 하이라이트한다. `/me`, `/settings`, `/admin/*`, `/u/[memberId]`는 여전히 어떤 분기에도 걸리지 않아 `null`(탭 미하이라이트)을 반환한다.

## 9. 알아둘 구조적 특이사항

- 4개 탭에 3가지 다른 UI 패턴(sidebar / dropdown / plain link)이 쓰인다 — 새 탭 추가 시 `NavTabType`(`sidebar-left`/`sidebar-right`/`dropdown`/`link`) 중 하나를 정해야 한다. `sidebar-left`/`sidebar-right` 타입은 각각 하나씩만 존재해야 한다(Navbar가 `find()`로 첫 번째 일치 탭만 사용).
- 여러 사이드바 항목이 동일한 href로 수렴한다(자유게시판/주제별 소통 게시판/Q&A/패트론 게시판 → 전부 `/boards`; 소개지/포스터 → 전부 `/downloads`). 실제 필터링은 아직 없음.
- EPIC-016(`/shop/projects*`)은 완전히 구현되었지만 nav에 진입점이 없고, 반대로 `/space-inquiry/styling`은 nav에 연결되어 있지만 placeholder다 — 같은 개념("공간 스타일링")이 두 개의 분리된 표면으로 존재한다.
- EPIC-017(위시리스트)은 전용 페이지 없이 `/shop`, `/shop/[id]`, `/mypage`에 임베드된 `WishlistButton`으로만 존재한다.
- **(EPIC-018)** "마이페이지"는 이제 상단 탭(`type: "link"`)과 계정 영역 링크 두 곳에 동시에 존재한다 — 의도적인 중복(계정 영역은 "기존 위치 유지" 요구사항으로 남겨둠).
- 홈(`/`)은 아직 실제 랜딩 페이지가 아니다.
