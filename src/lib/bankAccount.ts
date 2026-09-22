// EPIC-158: 사일로 상점(실물 상품) 계좌이체 안내 — 공식 입금 계좌는 환경 변수로만 관리한다
// (코드/문서에 계좌번호를 박아두지 않음). 예: NEXT_PUBLIC_SILO_BANK_ACCOUNT="○○은행 000-0000-0000-00 (예금주: 사일로)"
export const SILO_BANK_ACCOUNT = process.env.NEXT_PUBLIC_SILO_BANK_ACCOUNT ?? "";

// 2026-09-21: 멤버십(살롱데상) 계좌이체 접수용 입금 계좌 — 사일로 상점(위 SILO_BANK_ACCOUNT)과 판매 주체/계좌가 다르다.
// 예: NEXT_PUBLIC_SALON_BANK_ACCOUNT="IBK기업은행 000-000000-00-000 (예금주: ○○○)"
export const SALON_BANK_ACCOUNT = process.env.NEXT_PUBLIC_SALON_BANK_ACCOUNT ?? "";

// EPIC-159: 스텝페이 정기구독 UI 노출 스위치 — 서버 설정(STEPPAY_*)이 없으면 서버가 알아서 숨기고, 이 값이 "false"면 강제로 숨긴다.
export const STEPPAY_UI_ENABLED = process.env.NEXT_PUBLIC_STEPPAY_ENABLED !== "false";
