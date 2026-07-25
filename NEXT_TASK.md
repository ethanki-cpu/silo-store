# NEXT_TASK

## 진행 중
- 없음 (대기 중 — 다음 지시 대기)

## 다음 작업
- 없음 (사용자 지시 대기)

## 보류 중인 P2 이슈 (Error Triage Policy, CLAUDE.md 참고 — 사용자 지시 전까지 미수정)
- `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`에 `/rest/v1/` 접미사가 남아 있어 Supabase 요청이 "Invalid path specified in request URL"로 실패 중(사용자가 값을 직접 정리할 예정).
- `npm run lint`가 프로젝트 전반(예: `AuthProvider.tsx`, `WishlistButton.tsx`, `admin/payments`, `attendance`, `clubs/[id]`, `docent/[id]`, `boards/[id]/[postId]` 등 다수 파일)에서 `react-hooks/set-state-in-effect` 규칙 위반으로 실패 중 — EPIC-018 작업 범위 밖의 기존(pre-existing) 상태이며, 프로젝트 전체를 훑는 별도 작업이 필요.
