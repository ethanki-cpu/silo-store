"use client";

import { motion } from "framer-motion";
import { openTierSimulator } from "@/components/membership/TierSimulator";
import { useAuth } from "@/lib/AuthProvider";
import { SKILL_TIERS, type SkillBranch } from "@/lib/membershipContentDefaults";

// EPIC-165(사용자 지시 — "스킬 트리"): 등급이 오를 때마다 새 가지가 열리는 나무. 줄기(trunk) 위에 6개 등급 노드가 있고, 각 노드에서 그 등급에서
// 새로 열리는 권한(가지)이 좌우로 뻗는다. 내 등급까지는 불이 켜지고(글로우), 그 위는 자물쇠로 어둡게 보인다. 비회원은 전부 잠금 상태로 "가입하면 여기서 시작"을 보여준다.
export function MembershipSkillTree({ heading, subtitle, branches }: { heading: string; subtitle: string; branches: SkillBranch[] }) {
  const { member } = useAuth();
  const myRank = member ? member.membership_rank : null; // 99(Artist)는 rank >= N 비교에 그대로 최상위
  const lit = (rank: number) => myRank != null && myRank >= rank;
  const litCount = myRank == null ? 0 : SKILL_TIERS.filter((t) => myRank >= t.rank).length;

  return (
    <section className="relative mb-14 py-4" aria-label={heading || "스킬 트리"}>
      <div className="mb-8 text-center">
        {heading && <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>}
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <button type="button" onClick={openTierSimulator} className="mt-3 rounded-full border border-amber-500 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100">
          🎛️ 내 등급 시뮬레이터 열기
        </button>
        {myRank != null && (
          <p className="mt-2 text-xs text-gray-400">
            지금 내 자리: <b className="text-gray-700">{SKILL_TIERS.find((t) => t.rank === myRank)?.name ?? "회원"}</b> · 불 켜진 등급 {litCount}/{SKILL_TIERS.length}
          </p>
        )}
      </div>

      <div className="relative mx-auto max-w-2xl">
        {/* 줄기 */}
        <div className="absolute bottom-6 left-5 top-6 w-1 -translate-x-1/2 overflow-hidden rounded-full bg-gray-200 sm:left-1/2">
          <motion.div className="w-full origin-top rounded-full bg-gradient-to-b from-amber-300 via-emerald-400 to-fuchsia-400" style={{ height: `${myRank == null ? 0 : (litCount / SKILL_TIERS.length) * 100}%` }} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut" }} />
        </div>

        <div className="space-y-8">
          {SKILL_TIERS.map((tier, ti) => {
            const on = lit(tier.rank);
            const list = branches.filter((b) => b.rank === tier.rank);
            const left = ti % 2 === 1; // 홀수 등급은 왼쪽 가지(PC), 모바일은 전부 오른쪽
            return (
              <motion.div key={tier.rank} className="relative grid grid-cols-[2.5rem_1fr] items-start gap-3 sm:grid-cols-[1fr_3rem_1fr] sm:gap-0" initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.05 }}>
                {/* 노드 (모바일: 왼쪽 열 / PC: 가운데 열) */}
                <div className="order-1 flex justify-center sm:order-2 sm:col-start-2">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg font-bold" style={{ borderColor: on ? tier.color : "#d1d5db", background: on ? tier.color : "#f3f4f6", color: on ? "#111" : "#9ca3af", boxShadow: on ? `0 0 0 4px ${tier.color}33, 0 0 22px ${tier.color}` : "none" }} title={tier.name}>
                    {on ? "✓" : "🔒"}
                  </div>
                </div>
                {/* 등급 이름 + 가지들 */}
                <div className={`order-2 sm:row-start-1 ${left ? "sm:col-start-1 sm:pr-5 sm:text-right" : "sm:col-start-3 sm:pl-5"}`}>
                  <p className="text-sm font-bold" style={{ color: on ? "#111" : "#9ca3af" }}>
                    {tier.name}
                    {tier.rank === myRank && <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">내 등급</span>}
                  </p>
                  <div className={`mt-2 space-y-2 ${left ? "sm:flex sm:flex-col sm:items-end" : ""}`}>
                    {list.map((b, bi) => (
                      <motion.div key={b.title} className={`w-full rounded-lg border p-2.5 text-left sm:max-w-xs ${on ? "border-gray-200 bg-white shadow-sm" : "border-gray-200 bg-gray-50"}`} style={{ opacity: on ? 1 : 0.55, borderLeft: `4px solid ${on ? tier.color : "#d1d5db"}` }} initial={{ opacity: 0, x: left ? 16 : -16 }} whileInView={{ opacity: on ? 1 : 0.55, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 + bi * 0.08 }}>
                        <p className="text-[13px] font-semibold text-gray-800">
                          {b.icon} {b.title} {!on && <span aria-hidden>🔒</span>}
                        </p>
                        <p className="mt-0.5 text-xs leading-snug text-gray-500">{b.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
