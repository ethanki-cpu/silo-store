// EPIC-163.1(사용자 지시 — 확정된 멤버십별 3색 컬러 팔레트): Base(바탕) / Highlight(강조·글로우) / Depth(깊이·글자) 3색.
// 같은 값이 globals.css의 CSS 변수(--tier-<key>-base/highlight/depth)에도 등록돼 있다(스타일시트에서 쓰는 용도).
export type TierPaletteKey = "guest" | "angel" | "alice" | "gatsby" | "patron" | "lautrec";
export type TierPalette = { base: string; highlight: string; depth: string };

export const TIER_PALETTE: Record<TierPaletteKey, TierPalette> = {
  guest: { base: "#E8E8E9", highlight: "#D1D1D6", depth: "#8E8E93" },
  angel: { base: "#FDFBF7", highlight: "#F2E6D8", depth: "#D4C9C1" },
  alice: { base: "#EAEAF2", highlight: "#D2C4DF", depth: "#5B5678" },
  gatsby: { base: "#F4F0E6", highlight: "#D4AF37", depth: "#1A3C34" },
  patron: { base: "#EBE5DF", highlight: "#C5A059", depth: "#6B2D31" },
  lautrec: { base: "#EFEBE3", highlight: "#B65E47", depth: "#5A6B5D" },
};

export const TIER_PALETTE_ORDER: TierPaletteKey[] = ["guest", "angel", "alice", "gatsby", "patron", "lautrec"];

// membership_rank → 팔레트 키. Artist(99)는 Lautrec와 같은 열/색을 쓴다(표의 "Lautrec & Artist").
export function paletteKeyForRank(rank: number | null | undefined): TierPaletteKey {
  if (rank == null || rank < 0) return "guest";
  if (rank >= 4) return "lautrec";
  return (["angel", "alice", "gatsby", "patron"] as const)[rank] ?? "angel";
}
