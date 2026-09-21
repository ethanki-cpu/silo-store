// EPIC-158: 사일로 상점(실물 상품) 계좌이체 안내 — 공식 입금 계좌는 환경 변수로만 관리한다
// (코드/문서에 계좌번호를 박아두지 않음). 예: NEXT_PUBLIC_SILO_BANK_ACCOUNT="○○은행 000-0000-0000-00 (예금주: 사일로)"
export const SILO_BANK_ACCOUNT = process.env.NEXT_PUBLIC_SILO_BANK_ACCOUNT ?? "";

// 2026-09-21: 멤버십(살롱데상) 계좌이체 접수용 입금 계좌 — 사일로 상점(위 SILO_BANK_ACCOUNT)과 판매 주체/계좌가 다르다.
// 예: NEXT_PUBLIC_SALON_BANK_ACCOUNT="IBK기업은행 000-000000-00-000 (예금주: ○○○)"
export const SALON_BANK_ACCOUNT = process.env.NEXT_PUBLIC_SALON_BANK_ACCOUNT ?? "";

// 카드 정기결제 UI 노출 스위치 — 2026-09-21 토스페이먼츠 폐기(가입비 선결제)로 기본값을 끔으로 바꿨다. 스텝페이(EPIC-159) 연동 전까지는
// 카드 결제 버튼을 숨기고 계좌이체 접수만 보여준다. 이전 토스 코드를 시험하려면 NEXT_PUBLIC_TOSS_MEMBERSHIP_ENABLED=true.
export const TOSS_MEMBERSHIP_ENABLED = process.env.NEXT_PUBLIC_TOSS_MEMBERSHIP_ENABLED === "true";
