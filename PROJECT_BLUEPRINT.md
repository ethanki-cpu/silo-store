# PROJECT BLUEPRINT

> 이 문서는 사람과 AI(ChatGPT, Claude)가 함께 참고하는 프로젝트 개요/아키텍처 문서입니다.
> 구현 상세가 아니라 "이 프로젝트가 무엇으로 이루어져 있는가"를 설명합니다.
> 실제 코드와 폴더 구조를 기준으로 작성했으며, 코드만으로 단정할 수 없는 내용은 마지막 "TODO / 확인 필요" 섹션에 모아뒀습니다.

## 1. 프로젝트 개요

- **프로젝트 목적**: "사일로 스토어" — 멤버십 기반 커뮤니티 플랫폼. 물품 소매/대여(사일로상점), 클럽 모임·게시판·살롱 공간(살롱데상), 공간 대관(스튜디오 대관) 세 축으로 구성되며, 멤버십 등급(`membership_tiers`)에 따라 콘텐츠 열람 범위와 가격이 달라진다.
- **사용 기술 스택**: Next.js(App Router) + React + TypeScript + Tailwind CSS, 백엔드는 별도 서버 없이 Next.js Route Handler + Supabase(Postgres + Auth)로 구성.
- **전체 아키텍처**: 단일 Next.js 앱. 브라우저(Client Component)와 Route Handler 양쪽 모두 동일한 `@supabase/supabase-js` 클라이언트(anon key)로 Supabase에 직접 접근한다. 별도의 Express/Node 백엔드나 서비스 롤 키는 존재하지 않는다. 인증된 요청은 클라이언트가 `Authorization: Bearer <access_token>`을 Route Handler에 직접 전달하는 방식으로 신원을 넘긴다.

```
[Browser: React Client Components] --Authorization: Bearer--> [Next.js Route Handlers] --anon key--> [Supabase Postgres/Auth]
[Server Components (읽기 전용 목록)] ------------------------------------------------> [Supabase Postgres]
```

## 2. 기술 스택

`package.json` 기준 실제 의존성:

- **Next.js** `16.2.11` (App Router, Turbopack dev)
- **React** `19.2.4` / **react-dom** `19.2.4`
- **TypeScript** `^5`
- **Supabase**: `@supabase/supabase-js` `^2.110.8`
- **Tailwind CSS** `^4` (`@tailwindcss/postcss`)
- **ESLint** `^9` + `eslint-config-next`
- 그 외 별도 상태관리 라이브러리(Redux/Zustand 등), UI 컴포넌트 라이브러리, 테스트 러너는 사용하지 않음 (`package.json`에 존재하지 않음).

## 3. 프로젝트 구조

```
silo-store/
├── docs/
│   └── database-schema.sql     # DB 스키마 문서 (마지막 동기화: 2026-07-23, 아래 참고)
├── public/                     # 정적 에셋 (기본 Next.js 아이콘류)
├── src/
│   ├── app/                    # App Router 라우트 전체 (페이지 + API)
│   │   ├── api/                 # Route Handlers ("백엔드" 역할, 5번 참고)
│   │   ├── (각 기능별 폴더)/page.tsx  # 화면
│   │   └── layout.tsx           # 루트 레이아웃 (AuthProvider + Navbar 마운트)
│   ├── components/              # 공통 UI 컴포넌트 (7번 참고)
│   └── lib/                     # 인증/설정/Supabase 클라이언트 등 공용 로직 (6번 참고)
├── CLAUDE.md / AGENTS.md        # AI 에이전트용 프로젝트 규칙 문서
├── NEXT_TASK.md / CHANGELOG.md  # 작업 추적 문서 (9번 참고)
└── package.json
```

> **DB 문서 동기화 기준**: `docs/database-schema.sql`은 **2026-07-23**에 Supabase Management API로
> `information_schema.columns` / `pg_constraint`를 직접 조회하여 실제 운영 DB 기준으로 재작성됨
> (테이블 31개 전수 확인). 그 이후 스키마가 바뀌었는데 이 파일이 갱신되지 않았다면 다시 드리프트된 상태이니,
> 스키마 변경 작업을 할 때마다 이 파일도 함께 갱신할 것 (기존 규칙: "구조 변경 시 PROJECT_BLUEPRINT.md도 갱신").
>
> **Database schema documentation is maintained only in `docs/database-schema.sql`.**
> 프로젝트 밖에 있던 `silostore_schema.sql`은 2026-07-23부로 더 이상 관리하지 않는
> 참고용 사본이며, 이 프로젝트의 공식 DB 스키마 문서(Single Source of Truth)가 아님.

## 4. 주요 기능

`src/app` 아래 실제 존재하는 페이지/라우트를 기준으로 구현 여부를 확인함.

### 구현되어 화면까지 동작하는 기능

| 기능 | 경로 | 비고 |
|---|---|---|
| 로그인 | `/login` | 이메일/비밀번호 + Google/Kakao OAuth |
| 회원가입 | `/signup` | 이메일/비밀번호 가입 후 `members.name` 갱신 |
| 사일로상점(물품 목록/상세) | `/shop`, `/shop/[id]` | 시대(Time Slip) 필터, 등급별 큐레이션 4단계 공개, 이전 주인 캐릭터(persona) 표시 |
| 물품 구매/대여 주문 | `/shop/[id]` → `POST /api/orders` | 등급별 할인/적립 서버 계산 |
| 클럽모임 목록/상세 | `/clubs`, `/clubs/[id]` | 요일별 클럽, 세션 예약 |
| 게시판(소통 게시판) | `/boards`, `/boards/[id]`, `/boards/[id]/write`, `/boards/[id]/[postId]` | 자유/클럽주제/모임별/패트론/아티스트홍보/After Adoption/자료게시판/Q&A 등 `board_type`별 열람·쓰기 권한 분기 |
| 개인 페이지(마이피드) | `/me`, `/me/write`, `/u/[memberId]` | 공개범위(public/private/friends) 있는 개인 글 |
| 온라인 도슨트 콘텐츠 | `/docent`, `/docent/[id]`, `/docent/library` | 사일로상점/살롱 카테고리, 인물(figure_name)별 그룹 보기, 구매 라이브러리 |
| 살롱 출입(체크인) | `/salon/checkin` → `POST /api/salon-checkins` | 등급별 무료/유료 |
| 공간 대관(스튜디오) | `/rental`, `/rental/[rentalTypeId]` | 1층/2층, 사진/영상 촬영 유형 |
| 마이페이지 | `/mypage` | 회원 정보, 누적 포인트, "Your Treasures"(구매 확정 물품), 등급 비교 |
| 관리자 결제 확인 | `/admin/payments` | `orders`/`reservations`/`rental_bookings`/`docent_purchases` 통합 확인 화면, `is_admin` 전용 |
| 자료 다운로드 | `/downloads` | 목록 공개, 업로드는 관리자 전용 |
| 출석체크 | `/attendance` | 하루 1회 체크인 + 포인트 적립 + 이번 달 캘린더 |
| 설문조사 | `/polls` | 관리자 설문 생성, 회원당 1표, 결과 비율 표시 |

### DB 스키마(테이블)는 존재하지만 화면이 "준비 중" placeholder인 기능

`src/components/ComingSoon.tsx`를 그대로 렌더링하는 페이지들:

- `/salon/monthly-events` (월별 모임)
- `/salon/secret-room` (비밀의 방)
- `/salon/drinks` (음료 주문)
- `/salon/docent-tour` (투어 도슨트 프로그램)

> `docs/database-schema.sql`에는 이 기능들에 대응하는 테이블(`salon_events`, `salon_rooms`, `drink_menu`, `docent_tours` 등)이 정의되어 있으나, 실제 화면/Route Handler 구현은 없음(코드 기준 확인됨).

### 실시간 채팅(회원채팅)

- 코드베이스 어디에도 구현되어 있지 않음(보류 상태로 명시적으로 스킵된 기능).

## 5. API 구조

`src/app/api` 기준 각 폴더의 역할:

| 경로 | 역할 |
|---|---|
| `api/orders` | 물품 구매/대여 주문 생성 (등급별 가격/포인트 서버 계산) |
| `api/items/[id]` | 물품 상세 조회, 등급별 큐레이션 필드 잠금/해제 + persona 포함 |
| `api/boards`, `api/boards/[id]/posts`, `api/boards/[id]/posts/[postId]`, `.../comments`, `.../like` | 게시판 목록/글 목록/글 상세/댓글/좋아요 |
| `api/posts` | 개인 페이지(마이피드) 글 작성 |
| `api/members/[memberId]/posts` | 특정 회원의 마이피드 글 조회(본인/타인) |
| `api/docent-contents/[id]` | 도슨트 콘텐츠 상세(등급별 열람 가능 여부 판단 포함 — 상세 로직은 파일 확인 필요) |
| `api/docent-purchases` | 도슨트 콘텐츠 건별 구매(월 무료 횟수/할인 적용) |
| `api/reservations` | 클럽모임 세션 예약 |
| `api/rental-bookings` | 공간 대관 예약 |
| `api/salon-checkins` | 살롱 출입 체크인 |
| `api/attendance` | 출석체크 (조회/등록 + 포인트 적립) |
| `api/downloads` | 자료 목록 조회(공개) / 업로드(관리자 전용) |
| `api/polls`, `api/polls/[id]/votes` | 설문 목록·생성(관리자)/투표 |
| `api/admin/payments`, `api/admin/payments/confirm` | 관리자용 결제 대기 목록 조회/확정 (4개 결제 테이블 통합) |
| `api/test-supabase` | Supabase 연결 확인용(개발/디버그 목적으로 추정 — 용도 TODO) |

## 6. 인증 구조

- **Supabase Auth** 기반 이메일/비밀번호 + Google/Kakao OAuth. 세션은 브라우저 `localStorage`에 저장되는 클라이언트 세션이며, 쿠키 기반 SSR 인증이 아니다.
- **`AuthProvider`** (`src/lib/AuthProvider.tsx`): 앱 전역 React Context. `session`(Supabase 세션), `member`(id/name/membership_rank/tier_name/is_admin), `loading`(세션 로딩), `memberLoading`(회원 row 로딩)을 제공. `src/app/layout.tsx`에서 앱 전체를 감싼다.
- **`serverAuth`** (`src/lib/serverAuth.ts`): Route Handler 쪽 공용 인증 헬퍼.
  - `getRequestMember(request)`: `Authorization` 헤더의 액세스 토큰을 검증하고, 호출자 토큰이 주입된 `scopedClient`와 `member` 정보를 반환.
  - `getTier(rank)`: 등급별 혜택/가격 플래그(`membership_tiers`) 조회.
  - `canReadBoard` / `canWriteToBoard`: 게시판 타입별 열람/쓰기 권한 판정.
- **Route 보호 방식**: 미들웨어 기반 보호는 없음. 각 페이지가 클라이언트에서 `useAuth()`의 `session`/`member`/`is_admin` 등을 `useEffect`로 확인한 뒤 `router.replace("/login")` 또는 `router.replace("/")`로 리다이렉트하는 방식(페이지별 개별 가드).
- 가격·열람 권한처럼 위조 방지가 필요한 값은 클라이언트가 아니라 Route Handler가 `getRequestMember`/`getTier`로 서버에서 재계산한다(사용자가 API를 직접 호출해도 신뢰할 수 있는 값만 응답).

## 7. 공통 컴포넌트

`src/components` 기준 실제 존재하는 컴포넌트:

- **`Navbar.tsx`**: 3개 상단 탭(사일로상점/살롱데상/스튜디오 대관) + 계정 영역(로그인 상태 표시, 마이페이지 링크, 로그아웃) 렌더링. `navConfig.ts`의 `NAV_TABS`/`getActiveNavTabKey`를 사용해 현재 경로에 맞는 탭을 하이라이트.
- **`ComingSoon.tsx`**: `title`을 받아 "준비 중입니다" 안내만 보여주는 placeholder 컴포넌트. 4번 섹션의 미구현 살롱 기능들에서 사용.

그 외 공용 UI 라이브러리(버튼/모달/폼 등 디자인 시스템)는 없음 — 각 페이지가 Tailwind 클래스를 인라인으로 직접 사용.

## 8. 프로젝트 규칙

코드에서 실제로 확인되는 규칙:

- **App Router** 사용 (`src/app`, `page.tsx`/`route.ts` 파일 컨벤션).
- **TypeScript** 전면 사용, `strict` 여부 등 세부 설정은 `tsconfig.json` 참고.
- **Supabase**: 서비스 롤 키 없이 anon key만 사용. 모든 테이블에 RLS(Row Level Security) 적용(정책 상세는 "TODO / 확인 필요" 참고).
- **Server Component / Client Component 사용 방식**:
  - 인증이 필요 없는 단순 목록/조회 페이지(`/shop`, `/clubs`, `/rental` 등)는 `async` Server Component + `export const dynamic = "force-dynamic"`로 매 요청 최신 데이터를 가져옴.
  - 현재 로그인 사용자 정보가 필요한 페이지(`/mypage`, `/me`, `/shop/[id]`, `/boards/**`, `/attendance`, `/downloads`, `/polls` 등)는 `"use client"` + `useAuth()`/`useParams()`를 쓰는 Client Component.
  - `useSearchParams()`를 쓰는 페이지(`/docent`, 루트 레이아웃의 `Navbar`)는 자체 `<Suspense>` 경계로 감싼다.
- **가격/권한 계산은 서버(Route Handler)에서만** 수행하고 클라이언트 값은 신뢰하지 않는다(6번 참고).
- 별도 테스트 러너, CI 설정 없음 (`package.json`/`CLAUDE.md` 기준).

## 9. 개발 워크플로우

현재 이 저장소(및 AI 협업 세션)에서 실제로 적용 중인 절차:

```
작업 지시 (지정 범위)
        ↓
관련 파일만 확인 (전체 재분석 금지)
        ↓
코드 수정
        ↓
npm run type-check
        ↓
npm run lint
        ↓
(필요 시) localhost 개발 서버로 화면/API 동작 확인
        ↓
git diff 확인 → git commit (타입 접두사: feat/fix/refactor/style/docs/chore)
        ↓
CHANGELOG.md 업데이트
        ↓
NEXT_TASK.md 업데이트
        ↓
결과 보고 (변경 파일 목록 / git diff 요약 / type-check 결과 / lint 결과 / 두 문서 업데이트 내용)
```

- DB 스키마 변경은 Supabase 마이그레이션 파일이 아니라 Supabase Management API를 통한 ad-hoc DDL 실행으로 관리됨(`CLAUDE.md` 참고).
- `silo-store`는 `C:\Users\김재학` 루트에 있던 상위 git 저장소와는 별개로, 자체 `.git`을 가진 독립 저장소로 분리되어 있음.

## TODO / 확인 필요

추측하지 않고 남겨둔 항목. 코드/DB 조회만으로는 확정할 수 없거나, 이 문서(개요 문서)에 상세를 옮기지 않기로 한 내용.

- **membership_tiers 정책**: `docs/database-schema.sql`에 컬럼 구조와 rank/name/price(6개 행)는 라이브 DB로 재확인했지만, 등급별 20여 개 혜택 플래그(할인율/적립률/큐레이션 레벨/살롱 출입료 등)의 **현재 값**은 이번 동기화에서 재검증하지 않음 — 확인 필요.
- **RLS 정책**: 31개 테이블 전부 RLS가 걸려 있다는 사실은 확인했으나, 테이블별 정확한 정책 조건(select/insert/update 각각 누구에게 허용되는지)은 이 문서에 옮기지 않음 — Supabase `pg_policies` 직접 조회 확인 필요.
- **`api/test-supabase` API 용도**: 코드상 존재는 확인했으나, 실제 용도(연결 테스트/디버그 전용/제거 대상 여부)는 확인 필요.
- **docent-contents 등급별 접근 정책**: `api/docent-contents/[id]`가 존재하고 등급별 열람 가능 여부를 판단한다는 것은 확인했으나, 정확한 조건 분기 로직은 파일을 다시 읽고 확인 필요.
- **향후 로드맵**: 보류 중인 "Live Chat(회원채팅)" 외에 추가로 계획된 기능이 있는지는 이 저장소 코드만으로 알 수 없음 — 확인 필요 (`NEXT_TASK.md` 참고).
- **테스트 전략**: 현재 자동화 테스트가 전혀 없음(`package.json`에 테스트 러너 없음). 도입 여부/범위는 확인 필요.
