"use client";

import { motion } from "framer-motion";
import { TIER_PALETTE, TIER_PALETTE_ORDER, paletteKeyForRank } from "@/lib/tierPalette";

// EPIC-163.1: 활성 등급이 바뀔 때마다 페이지 전체 배경이 해당 등급의 3색(Base→Highlight→Depth) 그라데이션으로 부드럽게 크로스페이드.
// 단색이 아니라 radial-gradient 여러 겹 + 종이 결(feTurbulence 노이즈)로 빈티지한 레이어드 질감을 낸다.
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function TierBackdrop({ rank }: { rank: number }) {
  const activeKey = paletteKeyForRank(rank);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {TIER_PALETTE_ORDER.filter((k) => k !== "guest").map((key) => {
        const c = TIER_PALETTE[key];
        return (
          <motion.div
            key={key}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: key === activeKey ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              background: [
                `radial-gradient(ellipse 70% 55% at 12% 8%, ${c.highlight}cc 0%, transparent 62%)`,
                `radial-gradient(ellipse 65% 60% at 92% 92%, ${c.depth}55 0%, transparent 66%)`,
                `radial-gradient(circle at 50% 45%, ${c.base} 0%, ${c.highlight}55 70%, ${c.depth}33 100%)`,
                `linear-gradient(165deg, ${c.base} 0%, ${c.highlight}66 55%, ${c.depth}44 100%)`,
              ].join(", "),
            }}
          />
        );
      })}
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 160px rgba(60,40,20,0.18)" }} />
    </div>
  );
}
