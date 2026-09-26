"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthProvider";
import type { ConditionRow } from "@/lib/tierAccess";
import type { TierCategoryAccess } from "@/lib/tierCategoryAccess";

// EPIC-165(사용자 지시 — "내 등급 시뮬레이터"): 등급을 바꿔 보면 그 등급에서 열리는 문(게시판·페이지·기능)이 몇 개인지, 내 등급 대비 얼마나 늘어나는지,
// 아직 잠긴 문은 무엇인지를 실제 권한 설정(/api/membership/plans — 게시판·페이지 권한에서 계산한 값)으로 보여준다.
// 어디서든(상단 등급 팝오버, 멤버십 페이지의 스킬 트리) window 이벤트로 열 수 있다.
type Plan = { rank: number; name: string; price: number; honorary?: boolean; categories: TierCategoryAccess | null };
const OPEN_EVENT = "silo:open-simulator";
export const openTierSimulator = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_EVENT));
};

const keyOf = (root: string, title: string) => `${root}/${title}`;

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = shown;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{shown}</>;
}

function Simulator({ onClose }: { onClose: () => void }) {
  const { member } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/membership/plans")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((j: { plans?: Plan[]; conditionRows?: ConditionRow[] }) => {
        setPlans(j.plans ?? []);
        setConditions(j.conditionRows ?? []);
      })
      .catch(() => setPlans([]));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const myRank = member?.membership_rank ?? null;
  const myPlanRank = myRank == null ? null : myRank >= 99 ? plans?.[plans.length - 1]?.rank ?? myRank : myRank;
  const current = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    const rank = sel ?? myPlanRank ?? plans[0].rank;
    return plans.find((p) => p.rank === rank) ?? plans[0];
  }, [plans, sel, myPlanRank]);
  const mine = useMemo(() => (plans ?? []).find((p) => p.rank === myPlanRank) ?? null, [plans, myPlanRank]);
  const top = plans && plans.length > 0 ? plans[plans.length - 1] : null;

  const view = useMemo(() => {
    if (!current || !top) return null;
    const have = new Set<string>();
    current.categories?.groups.forEach((g) => g.items.forEach((i) => have.add(keyOf(g.title, i.name))));
    const locked: { root: string; title: string; names: string[] }[] = [];
    top.categories?.groups.forEach((g) => {
      const names = g.items.filter((i) => !have.has(keyOf(g.title, i.name))).map((i) => i.name);
      if (names.length > 0) locked.push({ root: g.root, title: g.title, names });
    });
    const lockedCount = locked.reduce((n, g) => n + g.names.length, 0);
    return { locked, lockedCount };
  }, [current, top]);

  return createPortal(
    <motion.div className="fixed inset-0 z-[96] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-label="내 등급 시뮬레이터" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-[#14101c] text-white shadow-2xl" initial={{ y: 30, scale: 0.97 }} animate={{ y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <h3 className="text-base font-semibold">🎛️ 내 등급 시뮬레이터</h3>
            <p className="text-xs text-white/50">등급을 눌러 보세요. 그 등급에서 열리는 문이 바로 보여요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full border border-white/30 px-3 py-1 text-sm hover:bg-white/10">
            닫기 ✕
          </button>
        </div>

        {!plans ? (
          <p className="py-16 text-center text-sm text-white/50">불러오는 중...</p>
        ) : !current ? (
          <p className="py-16 text-center text-sm text-white/50">등급 정보를 불러오지 못했어요.</p>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => {
                const on = p.rank === current.rank;
                const isMine = p.rank === myPlanRank;
                return (
                  <button key={p.rank} type="button" onClick={() => setSel(p.rank)} className={`relative rounded-full border px-4 py-1.5 text-sm transition ${on ? "border-amber-300 bg-amber-300 font-semibold text-black" : "border-white/25 bg-white/5 hover:bg-white/15"}`}>
                    {p.name}
                    {isMine && <span className="absolute -right-1 -top-2 rounded-full bg-emerald-400 px-1.5 text-[9px] font-bold text-black">내 등급</span>}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/50">열리는 문</p>
                <p className="text-3xl font-bold text-amber-300">
                  <CountUp value={current.categories?.total ?? 0} />
                  <span className="text-base text-white/60">개</span>
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/50">{mine && mine.rank !== current.rank ? `내 등급(${mine.name}) 대비` : "이 등급에서 새로"}</p>
                <p className="text-3xl font-bold text-emerald-300">
                  +<CountUp value={mine && mine.rank !== current.rank ? Math.max(0, (current.categories?.total ?? 0) - (mine.categories?.total ?? 0)) : current.categories?.newCount ?? 0} />
                  <span className="text-base text-white/60">개</span>
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/50">아직 잠긴 문</p>
                <p className="text-3xl font-bold text-white/70">
                  🔒 <CountUp value={view?.lockedCount ?? 0} />
                  <span className="text-base text-white/50">개</span>
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">열리는 문</p>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {current.categories?.groups.map((g) => (
                    <motion.div key={keyOf(g.root, g.title)} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="mb-1.5 text-xs text-white/50">
                        {g.root}
                        {g.root !== g.title && <span className="text-white/80"> · {g.title}</span>}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((i) => (
                          <span key={i.name} className={`rounded-full px-2.5 py-0.5 text-xs ${i.isNew ? "bg-amber-300/90 font-semibold text-black" : "bg-white/12 text-white/85"}`}>
                            {i.isNew && "✨ "}
                            {i.name}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {view && view.lockedCount > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">🔒 이 등급에서는 아직 잠겨 있어요</p>
                <div className="space-y-1.5 opacity-40" style={{ filter: "blur(0.6px)" }}>
                  {view.locked.map((g) => (
                    <p key={keyOf(g.root, g.title)} className="text-xs">
                      <span className="text-white/60">{g.title}</span> — {g.names.join(" · ")}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {conditions.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">이용 조건</p>
                <div className="divide-y divide-white/10 rounded-lg border border-white/10 text-xs">
                  {conditions.map((c) => {
                    const v = c.cells[current.rank];
                    return (
                      <div key={c.label} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-white/70">{c.label}</span>
                        {typeof v === "string" ? <span className="font-medium">{v}</span> : v ? <span>🗝️</span> : <span className="opacity-30">🔒</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-sm text-white/70">
                {current.honorary ? "초대받는 자리예요." : current.price === 0 ? "무료로 시작할 수 있어요." : `월 ${current.price.toLocaleString()}원`}
              </p>
              {myPlanRank !== current.rank && (
                <Link href="/membership" onClick={onClose} className="rounded-full bg-amber-300 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-200">
                  {current.name} 등급 가입하러 가기 →
                </Link>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// 전역에 한 번만 마운트하는 호스트 — Navbar가 렌더한다.
export function TierSimulatorHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, on);
    return () => window.removeEventListener(OPEN_EVENT, on);
  }, []);
  return <AnimatePresence>{open && <Simulator key="sim" onClose={() => setOpen(false)} />}</AnimatePresence>;
}
