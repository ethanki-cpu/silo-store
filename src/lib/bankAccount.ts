// EPIC-158: 사일로 상점(실물 상품) 계좌이체 안내 — 공식 입금 계좌는 환경 변수로만 관리한다
// (코드/문서에 계좌번호를 박아두지 않음). 예: NEXT_PUBLIC_SILO_BANK_ACCOUNT="○○은행 000-0000-0000-00 (예금주: 사일로)"
export const SILO_BANK_ACCOUNT = process.env.NEXT_PUBLIC_SILO_BANK_ACCOUNT ?? "";
