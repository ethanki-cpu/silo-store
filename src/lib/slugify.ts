// EPIC-079-PHASE-2: docs/sql/epic-079-phase-2-slug.sql의 slugify() SQL
// 함수와 동일한 규칙(소문자화 + 라틴 알파벳/숫자 이외는 '-'로 치환 +
// 앞뒤 '-' 제거)을 애플리케이션 쪽에서도 써야 하는 곳(게시글/게시판 생성
// API)을 위한 TS 버전. 한글 등 라틴 알파벳/숫자가 전혀 없는 입력은 빈
// 문자열을 반환하므로, 호출부에서 폴백(예: id 앞 8자리)을 따로 준비해야
// 한다 — SQL 쪽 백필 로직과 동일한 계약.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// slugify(input)가 빈 문자열이면(한글 제목 등) id 앞 8자리로 폴백한다 —
// SQL 백필 로직과 동일한 계약.
export function slugifyWithFallback(input: string, fallbackId: string): string {
  return slugify(input) || fallbackId.slice(0, 8);
}
