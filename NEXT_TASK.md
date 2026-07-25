# NEXT_TASK

## 진행 중
- 없음 (대기 중 — 다음 지시 대기)

## 다음 작업
- 없음 (사용자 지시 대기)

## 사용자 확인 필요
- **EPIC-020 관련**: Google OAuth "버튼 클릭 → Google 실제 로그인 화면 리다이렉트"까지는 자동 검증 완료. 실제 계정으로 로그인 완료 → 세션 확인 → 로그아웃 → 마이페이지 접근까지는 실제 자격증명 입력이 필요해 에이전트가 대신 수행할 수 없음(정책상 금지) — 사용자가 직접 최종 확인 필요.

## 보류 중인 P2 이슈 (Error Triage Policy, CLAUDE.md 참고 — 사용자 지시 전까지 미수정)
- `npm run lint`가 프로젝트 전반(예: `AuthProvider.tsx`, `WishlistButton.tsx`, `admin/payments`, `attendance`, `clubs/[id]`, `docent/[id]`, `boards/[id]/[postId]` 등 다수 파일)에서 `react-hooks/set-state-in-effect` 규칙 위반으로 실패 중 — EPIC-018 작업 범위 밖의 기존(pre-existing) 상태이며, 프로젝트 전체를 훑는 별도 작업이 필요.
