// EPIC-168: Owner(최상위 등급) + "등급 체험". 클라이언트/서버 공용 상수(next/server를 import하지 않아 어디서든 쓸 수 있다).
//
// · Owner = membership_rank 100. 관리자 권한(is_admin)을 항상 함께 갖고, 모든 `rank >= N` 게이팅을 통과한다. 공개 요금제·멤버십 캐러셀에는 나오지 않는다.
// · 등급 체험 = Owner가 다른 등급의 화면·권한을 그 등급 회원처럼 써 보는 기능. 선택한 등급은 쿠키(silo_preview_rank)로 저장돼
//   ① 브라우저(AuthProvider)가 member의 등급/이름/관리자 여부를 그 등급으로 덮어 보이고, ② 서버(getRequestMember)도 같은 쿠키를 읽어 API 판정을 그 등급으로 한다.
//   쿠키가 있어도 "진짜 등급이 Owner일 때만" 효과가 있어 다른 회원이 값을 흉내 내도 권한이 올라가지 않는다(체험은 낮추기만 가능).
//   한계: DB의 RLS 정책은 실제 계정(Owner)으로 평가되므로 RLS로만 막는 일부 조회(예: 패트론 게시판 목록)는 체험 중에도 열려 있을 수 있다.
export const OWNER_RANK = 100;
export const PREVIEW_COOKIE = "silo_preview_rank";
export const PREVIEW_RANKS = [0, 1, 2, 3, 4, 99] as const;
export const TIER_NAMES: Record<number, string> = { 0: "Silo Angel", 1: "Alice", 2: "Great Gatsby", 3: "Patron", 4: "Lautrec", 99: "Artist", 100: "Owner" };

export function isPreviewRank(n: number): boolean {
  return (PREVIEW_RANKS as readonly number[]).includes(n);
}
