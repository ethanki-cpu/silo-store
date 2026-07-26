# NEXT_TASK

## 진행 중
- 없음 (대기 중 — 다음 지시 대기)

## 다음 작업
- **EPIC-022 후속**: `member_collections`는 anon key REST 조회(`200 []`)로 라이브에 실제로 존재함을 EPIC-029 작업 중 확인함 — `docs/database-schema.sql` 상단 동기화 노트("아직 라이브 미적용")가 이 테이블에 한해 stale함. `member_follows`/`member_badges`/`member_visitors` 3개는 미확인 상태이므로 여전히 Supabase SQL Editor에서 실제 적용 여부 점검 필요(에이전트는 Management API 토큰 없이는 직접 적용하지 않음 — CLAUDE.md 규칙). 문서 상단 노트 자체의 정정은 이번 EPIC 범위(수정 대상 파일 제한) 밖이라 별도 작업 필요.
- **EPIC-022 후속**: "나의 살롱"/"나의 도슨트 수료증"/"나의 공간"/"나의 전시회"/"타임라인" 5개 탭의 데이터 소스 결정 필요(현재 Empty State만 존재).
- **EPIC-022 후속**: `member_follows`(팔로우 버튼)/`member_visitors`(방문 기록 insert) 쓰기 경로 구현 필요 — 아마도 `/u/[memberId]` 페이지에 추가.
- **EPIC-023 후속**: `docs/database-schema.sql` §12의 `site_navigations`/`site_categories` Seed는 라이브 DB에 적용되어 있음(EPIC-027 검증 중 실제 탭 이름 수정→저장→새로고침→Navbar 반영까지 확인 완료).
- **EPIC-023 후속**: `site_categories`가 아직 실제 화면(`/shop` era 필터, `/docent` era 필터, `CollectionsPanel` 카테고리 탭 등)에는 연결되지 않음 — 이번 EPIC은 테이블/시드/관리자 CRUD까지만. 각 화면의 하드코딩된 카테고리 목록을 `site_categories` 조회로 바꾸는 작업은 별도 Epic 필요.
- **EPIC-026 후속**: `docs/database-schema.sql` §13에 정의된 `site_settings` DDL+Seed를 Supabase SQL Editor에서 실제로 실행해야 함 — 실행 전까지 `/admin/navigation/settings`는 조회 시 "Could not find the table" 에러 배너가 뜨지만 폼 자체는 기본값으로 정상 동작함.
- **EPIC-026 후속**: `main_logo`/`hero_slideshow`/`home_curation` 설정값이 아직 실제 화면(홈 `/`, Navbar 로고 등)에는 연결되지 않음 — 이번 EPIC은 저장 UI까지만. 실제 홈페이지에서 이 설정을 읽어와 반영하는 작업은 별도 Epic 필요.
- **EPIC-028 후속**: "숨기기"가 전용 관리자 노출 플래그 없이 기존 `posts.visibility='private'`를 재사용하는 임시 구현 — 작성자 본인이 글을 "비공개"로 설정한 것과 관리자가 숨긴 것이 현재 구분되지 않음. 필요하면 `is_hidden_by_admin` 같은 전용 컬럼을 추가하는 별도 Epic 검토.
- **EPIC-028 후속**: `admin/posts/salon`은 최신 200건만 조회(`FETCH_LIMIT`) — 페이지네이션은 아직 없음. 게시글이 많아지면 페이지네이션/검색 추가 필요.

## 사용자 확인 필요
- **EPIC-022**: `/mypage`가 로그인 필요 페이지라 에이전트가 실제 로그인 세션으로 탭 전환/데이터 조회를 시각적으로 검증하지 못함(정책상 실제 자격증명 입력 불가) — type-check/lint/컴파일 확인만 완료. 사용자가 직접 로그인 후 11개 탭 전환 확인 필요.
- **EPIC-029**: 같은 이유로 "나의 컬렉션" 8개 서브탭의 실제 등록/수정/삭제 CRUD 동작을 로그인 세션으로 직접 검증하지 못함(type-check/lint만 통과 확인) — 사용자가 직접 로그인 후 "+ 아이템 추가"로 신규 등록, 카드의 ✏️ 수정/🗑️ 삭제 버튼 동작을 확인 필요.

## 보류 중인 P2 이슈 (Error Triage Policy, CLAUDE.md 참고 — 사용자 지시 전까지 미수정)
- `npm run lint`가 프로젝트 전반(예: `AuthProvider.tsx`, `WishlistButton.tsx`, `attendance`, `clubs/[id]`, `docent/[id]`, `boards/[id]/[postId]`, `Navbar.tsx`(mounted 플래그), `admin/layout.tsx`(authorized 플래그), `admin/navigation/shared.tsx`(draft 재동기화 effect) 등 다수 파일)에서 `react-hooks/set-state-in-effect` 규칙 위반으로 실패 중 — EPIC-018 작업 범위 밖의 기존(pre-existing) 상태이며, 프로젝트 전체를 훑는 별도 작업이 필요.
