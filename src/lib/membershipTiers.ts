// EPIC-088: RANK_OPTIONS는 원래 admin/BoardForm.tsx 하나에서만 쓰이던 상수라
// 거기 정의돼 있었다 — 이제 공개 Navbar/LeftSidebar/RightSidebar에서도(모든
// 방문자에게 항상 렌더링되는 GatedNavLink.tsx) 등급 라벨이 필요해졌는데,
// BoardForm.tsx는 BoardRenderer/드래그앤드롭 카테고리 선택기 등을 잔뜩 끌고
// 오는 무거운 관리자 전용 클라이언트 컴포넌트라 공개 번들에 그대로 끼워
// 넣을 수 없다 — 의존성이 가벼운 이 파일로 뽑아내고, BoardForm.tsx는 이
// 값을 그대로 재노출(re-export)해 기존 관리자 화면 호출부는 안 바뀐다.
export const RANK_OPTIONS: { rank: number; label: string }[] = [
  { rank: 0, label: "Silo Angel" },
  { rank: 1, label: "Alice" },
  { rank: 2, label: "Great Gatsby" },
  { rank: 3, label: "Patron" },
  { rank: 4, label: "Lautrec" },
  { rank: 99, label: "Artist" },
];
