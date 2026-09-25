"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { ExperienceRow } from "@/lib/membershipContentDefaults";
import { useActiveMembershipRank } from "@/lib/membershipActiveStore";
import { TIER_PALETTE, paletteKeyForRank, type TierPaletteKey } from "@/lib/tierPalette";

// EPIC-163 / 163.1: 세계관을 담은 감성적 권한 표(Warm Permissions Table) — O/X 없이 이모지와 은유적 문구로 7단계 경험을 비교한다.
// 텍스트는 위젯 설정(rows)에서 관리자가 고친다. "🔒"로 시작하는 칸은 반투명 블러 위에 자물쇠로 막힌 곳을 보여준다.
const COLUMNS: { key: TierPaletteKey; title: string; sub?: string }[] = [
  { key: "guest", title: "👁️ 비회원 (Guest)" },
  { key: "angel", title: "👼 Silo Angel (무료)" },
  { key: "alice", title: "🫖 Alice" },
  { key: "gatsby", title: "🥂 Great Gatsby" },
  { key: "patron", title: "🏛️ Patron" },
  { key: "lautrec", title: "🎨 Lautrec & 🌟 Artist" },
];

function Cell({ text }: { text: string }) {
  const locked = text.trim().startsWith("🔒");
  if (!locked) {
    const dash = text.trim() === "-";
    return <span className={dash ? "text-gray-300" : "text-gray-800"}>{text}</span>;
  }
  const rest = text.replace("🔒", "").trim();
  return (
    <span className="relative inline-flex min-h-8 min-w-24 items-center justify-center overflow-hidden rounded-md bg-white/40 px-2 py-1 backdrop-blur-md">
      <span aria-hidden className="select-none whitespace-nowrap text-gray-500 opacity-30 blur-[3px]">
        {rest || "굳게 닫힌 문"}
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-lg" role="img" aria-label={rest ? `잠김: ${rest}` : "잠김"}>
        🔒
      </span>
    </span>
  );
}

export function MembershipExperienceTable({ heading, subtitle, rows }: { heading: string; subtitle: string; rows: ExperienceRow[] }) {
  const activeKey = paletteKeyForRank(useActiveMembershipRank());
  const glow = TIER_PALETTE[activeKey].highlight;

  const colStyle = (key: TierPaletteKey, isHead: boolean, isLast: boolean): CSSProperties | undefined => {
    if (key !== activeKey) return undefined;
    return {
      background: `${glow}26`,
      boxShadow: `inset 2px 0 0 ${glow}, inset -2px 0 0 ${glow}${isHead ? `, inset 0 2px 0 ${glow}, 0 -6px 26px ${glow}88` : ""}${isLast ? `, inset 0 -2px 0 ${glow}, 0 8px 26px ${glow}88` : ""}`,
      transition: "background .8s ease, box-shadow .8s ease",
    };
  };

  return (
    <motion.section
      className="mb-12"
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {(heading || subtitle) && (
        <div className="mb-5 text-center">
          {heading && <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-sm [scroll-snap-type:x_proximity]">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[9.5rem] border-b border-black/5 bg-white/90 px-4 py-4 text-sm font-semibold text-gray-800 backdrop-blur">🌌 사일로에서의 경험</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="border-b border-black/5 px-3 py-4 text-sm font-semibold text-gray-800 [scroll-snap-align:start]" style={colStyle(c.key, true, false)}>
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.label}>
                <th scope="row" className="sticky left-0 z-10 border-b border-black/5 bg-white/90 px-4 py-4 align-top backdrop-blur">
                  <span className="block font-bold text-gray-900">{r.label}</span>
                  <span className="mt-1 block text-xs font-normal text-gray-500">{r.sub}</span>
                </th>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="border-b border-black/5 px-3 py-4 align-top" style={colStyle(c.key, false, ri === rows.length - 1)}>
                    <Cell text={r[c.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-500 sm:hidden">옆으로 밀어서 자리마다 열리는 세계를 비교해 보세요 →</p>
    </motion.section>
  );
}
