# Navigation Blueprint

> 이 문서는 `src/lib/navConfig.ts` + `src/components/Navbar.tsx` + `src/app` 하위 실제 라우트를 기준으로 작성된
> **Navigation 구조의 공식 설계 문서(Single Source of Truth)**입니다.
> Navigation을 변경/추가할 때는 이 문서를 먼저 확인하고, 변경 시 이 문서도 함께 갱신합니다.
> 최종 확인: 2026-07-26 (코드 기준).

## 1. 구조 개요

Top-level 탭은 4개(`NAV_TABS`, `src/lib/navConfig.ts`)이며, 각각 다른 UI 패턴을 사용합니다.

| key | label | UI 패턴 | 기본 target |
|---|---|---|---|
| `silostore` | 사일로상점 | **좌측 Sidebar** (hover/click로 열림) | 없음 (사이드바 오픈 전용) |
| `salon` | 살롱데상 | **우측 Sidebar** (hover/click로 열림) | 없음 (사이드바 오픈 전용) |
| `rental` | 스튜디오 대관 | 일반 `<Link>` | `/rental?floor=1f_silostore` |
| `space_inquiry` | 공간 문의 | **플로팅 드롭다운** (사이드바 아님) | 없음 (드롭다운 오픈 전용) |

DOM 순서: 사일로상점 → 살롱데상 → 스튜디오 대관 → 공간 문의 (가로 스크롤 가능한 하나의 `<nav>` 행).

## 2. 좌측 Sidebar — 사일로상점 (silostore)

- 트리거: `사일로상점` 탭 hover/click, 또는 사이드바가 닫혀 있을 때 좌측에 고정 표시되는 🔑 풀탭(`fixed left-0 top-1/2`).
- 배경 `bg-green-800`, `-translate-x-full` ↔ `translate-x-0`로 슬라이드.

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

> ⚠️ `/rental?floor=2f_salon`(2층 살롱 대관), `/salon/checkin`, `/salon/docent-tour`, `/salon/drinks`는
> **어느 사이드바에도 연결되어 있지 않은 orphan 라우트**입니다. 직접 URL로만 접근 가능합니다.

## 4. 스튜디오 대관 (rental)

- `/rental?floor=1f_silostore` [구현됨]
- `/rental?floor=2f_salon` [구현됨] — 사이드바 미연결, `스튜디오 대관` 탭의 target에도 없음(target은 1F 고정)
- `/rental/[rentalTypeId]` [구현됨]

## 5. 공간 문의 (space_inquiry) — 드롭다운

- `/space-inquiry/shoot-rental` [placeholder]
- `/space-inquiry/item-rental` [placeholder]
- `/space-inquiry/styling` [placeholder] — ⚠️ EPIC-016(`/shop/projects*`)와 개념이 겹치지만 서로 연결되어 있지 않음(아래 6번 참고).

## 6. Account 영역 (Navbar 상단 우측, 3-탭 구조 밖)

`navConfig.ts`가 아니라 `Navbar.tsx`에 직접 렌더링됨.

- **관리자** → `/admin/payments` (`session && member?.is_admin`일 때만 노출)
- **회원 배지 → `/mypage`** (`${member.name}님 · ${member.tier_name}`)
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

### 스튜디오 대관 / 공간 문의
- `/rental?floor=1f_silostore|2f_salon`, `/rental/[rentalTypeId]` [구현됨]
- `/space-inquiry/shoot-rental|item-rental|styling` [placeholder] (3개 전부)

### 계정 / 인증 / 관리자
- `/login`, `/signup` [구현됨]
- `/mypage` [구현됨]
- `/settings` [구현됨]
- `/me`, `/me/write`, `/u/[memberId]` [구현됨]
- `/admin/payments` [구현됨]
- `/admin/projects/new` [구현됨] — orphan (nav 미연결)
- `/` [placeholder] — **여전히 create-next-app 기본 스캐폴드**, 실제 랜딩 페이지 아님

## 8. `getActiveNavTabKey()` 로직 (정확 로직, `src/lib/navConfig.ts:113-139`)

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

  if (pathname.startsWith("/rental")) return "rental";
  if (pathname.startsWith("/space-inquiry")) return "space_inquiry";

  if (pathname === "/docent") {
    return categoryParam === "salon" ? "salon" : "silostore";
  }

  return null;
}
```

핵심 주의사항:
1. **`/docent`(정확히 일치)만 쿼리 파라미터(`?category=`)로 활성 탭이 갈린다.** `Navbar.tsx`가 `getActiveNavTabKey(pathname, searchParams.get("category"))`로 호출.
2. `/docent/collections`는 `/docent`의 `category` 분기와 **무관하게 항상 `silostore`**로 고정된다(별도 `startsWith` 분기가 먼저 매칭).
3. `/shop/*`는 `startsWith` 매칭이므로 `/shop` 하위에 새 라우트를 추가해도 자동으로 `silostore`가 하이라이트된다.
4. `salon`의 `startsWith` 목록에 `/salon` 자체가 포함되므로, nav에 연결되지 않은 `/salon/checkin`·`/salon/docent-tour`·`/salon/drinks`도 직접 방문 시 살롱데상 탭이 하이라이트된다.
5. `/rental`은 `?floor=`가 활성 탭 판정에 영향을 주지 않는다(둘 다 `rental` 탭 유지).
6. 위 분기에 안 걸리는 경로(`/`, `/login`, `/mypage`, `/settings`, `/me`, `/u/[memberId]`, `/admin/*`)는 `null` — 어떤 탭도 하이라이트되지 않는다.

## 9. 알아둘 구조적 특이사항

- 4개 탭에 3가지 다른 UI 패턴(sidebar / plain link / dropdown)이 쓰인다 — 새 탭 추가 시 패턴을 먼저 정해야 한다.
- 여러 사이드바 항목이 동일한 href로 수렴한다(자유게시판/주제별 소통 게시판/Q&A/패트론 게시판 → 전부 `/boards`; 소개지/포스터 → 전부 `/downloads`). 실제 필터링은 아직 없음.
- EPIC-016(`/shop/projects*`)은 완전히 구현되었지만 nav에 진입점이 없고, 반대로 `/space-inquiry/styling`은 nav에 연결되어 있지만 placeholder다 — 같은 개념("공간 스타일링")이 두 개의 분리된 표면으로 존재한다.
- EPIC-017(위시리스트)은 전용 페이지 없이 `/shop`, `/shop/[id]`, `/mypage`에 임베드된 `WishlistButton`으로만 존재한다.
- 홈(`/`)은 아직 실제 랜딩 페이지가 아니다.
