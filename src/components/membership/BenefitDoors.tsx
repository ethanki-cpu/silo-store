"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BENEFIT_DOORS, type BenefitDoor } from "@/lib/membershipContentDefaults";

export { DEFAULT_BENEFIT_DOORS };
export type { BenefitDoor };

// EPIC-164 Phase 1: "Door-Opening" 캐러셀 — 장황한 혜택 설명 대신 핵심 카테고리 3~4장의 '문'으로 압축한다.
// 카드를 누르면 ① 카메라가 그 문으로 줌인하고 ② 문짝이 힌지를 축으로 3D로 열리며 ③ 문틈으로 빛이 새고
// ④ 문이 다 열린 뒤에야 짧고 강렬한 문구가 시네마틱하게 떠오른다.
// 3D 라이브러리 없이 framer-motion의 transform(scale/translate/rotateY)·opacity와 CSS box-shadow/backdrop-filter만 쓴다.
const DOOR_RADIUS = "50% 50% 14px 14px / 22% 22% 14px 14px";
const EASE = [0.16, 1, 0.3, 1] as const;

function DoorCard({
  door,
  index,
  open,
  dim,
  revealed,
  onToggle,
  onOpened,
  reduce,
  cardRef,
}: {
  door: BenefitDoor;
  index: number;
  open: boolean;
  dim: boolean;
  revealed: boolean;
  onToggle: () => void;
  onOpened: () => void;
  reduce: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const a = door.accent;
  const lines = door.lines.split("\n").filter(Boolean);
  return (
    <motion.div
      ref={cardRef}
      className="relative aspect-[3/5] w-full"
      style={{ perspective: 1100, zIndex: open ? 20 : 1 }}
      animate={{ opacity: dim ? 0.18 : 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* 문 너머의 방: 문이 열려야 보인다. 열린 뒤 문구가 떠오른다. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 text-center text-white"
        style={{ borderRadius: DOOR_RADIUS, background: `radial-gradient(ellipse at 12% 55%, ${a}ee 0%, ${a}55 34%, #171021 78%)`, boxShadow: open ? `0 0 90px ${a}66, inset 0 0 50px ${a}44` : "none" }}
      >
        {revealed && (
          <>
            <motion.h3
              className="mb-3 break-keep text-[15px] font-semibold leading-snug sm:text-base"
              style={{ fontFamily: '"Noto Serif KR","Nanum Myeongjo",Georgia,serif', textShadow: "0 2px 16px rgba(0,0,0,.8)" }}
              initial={{ opacity: 0, y: 26, filter: "blur(10px)", letterSpacing: "0.25em" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "0em" }}
              transition={{ duration: 1.2, ease: EASE }}
            >
              {door.headline}
            </motion.h3>
            {lines.map((l, i) => (
              <motion.p
                key={i}
                className="break-keep text-[11px] leading-relaxed text-white/90"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,.8)" }}
                initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: EASE, delay: 0.35 + i * 0.28 }}
              >
                {l}
              </motion.p>
            ))}
          </>
        )}
      </div>

      {/* 문짝: 왼쪽 힌지를 축으로 열린다(rotateY). 앞면만 보이게 backface 숨김. */}
      <motion.button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${door.title} 문 ${open ? "닫기" : "열기"}`}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 border-2 px-2 text-center text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{
          borderRadius: DOOR_RADIUS,
          borderColor: `${a}cc`,
          transformOrigin: "left center",
          backfaceVisibility: "hidden",
          background: `linear-gradient(160deg, #2b2142 0%, #120c1e 100%)`,
          boxShadow: `inset 0 0 40px ${a}22, 0 10px 30px rgba(0,0,0,.35)`,
          pointerEvents: open ? "none" : "auto",
        }}
        animate={reduce ? { opacity: open ? 0 : 1 } : { rotateY: open ? -112 : 0 }}
        transition={{ duration: reduce ? 0.4 : 1.15, ease: EASE }}
        onAnimationComplete={() => {
          if (open) onOpened();
        }}
        whileHover={open ? undefined : { y: -4 }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-2" style={{ borderRadius: DOOR_RADIUS, border: `1px solid ${a}66` }} />
        <span className="text-3xl drop-shadow-lg sm:text-4xl">{door.icon}</span>
        <span className="break-keep text-sm font-semibold sm:text-base" style={{ fontFamily: '"Noto Serif KR","Nanum Myeongjo",Georgia,serif' }}>
          {door.title}
        </span>
        <span className="break-keep px-1 text-[10px] text-white/60 sm:text-[11px]">{door.tagline}</span>
        <span aria-hidden className="absolute right-3 top-1/2 h-3 w-3 rounded-full" style={{ background: a, boxShadow: `0 0 12px ${a}` }} />
        <span aria-hidden className="mt-2 text-[10px] tracking-[0.3em] text-white/40">
          {String(index + 1).padStart(2, "0")}
        </span>
      </motion.button>

      {/* 문틈으로 새는 빛: 박스 섀도우 + backdrop-filter 글로우 — 열리기 시작할 때 번쩍 밝아졌다 잦아든다. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -left-0.5 top-[10%] h-[86%] w-2 rounded-full"
        style={{ background: `${a}`, boxShadow: `0 0 26px 12px ${a}, 0 0 90px 36px ${a}88`, backdropFilter: "blur(10px) brightness(1.6)", WebkitBackdropFilter: "blur(10px) brightness(1.6)" }}
        initial={false}
        animate={{ opacity: open ? [0, 1, 0.45] : 0, scaleX: open ? [0.4, 2.4, 1.2] : 0.4 }}
        transition={{ duration: 1.3, ease: "easeOut" }}
      />
    </motion.div>
  );
}

export function BenefitDoors({ heading, subtitle, doors }: { heading: string; subtitle: string; doors: BenefitDoor[] }) {
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);
  const [cam, setCam] = useState({ x: 0, y: 0, scale: 1, ox: 0, oy: 0 });

  const close = useCallback(() => {
    setOpenIdx(null);
    setRevealedIdx(null);
    setCam((c) => ({ ...c, x: 0, y: 0, scale: 1 }));
  }, []);

  const open = (i: number) => {
    if (openIdx === i) return close();
    const grid = gridRef.current;
    const card = cardEls.current[i];
    if (grid && card) {
      const g = grid.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      // 카메라 줌인: 그 카드 중심을 축으로 확대하고, 카드 중심이 그리드 중앙으로 오게 평행이동한다.
      const scale = Math.max(1, Math.min(2.2, (g.width * 0.78) / c.width, (window.innerHeight * 0.78) / c.height));
      const ox = c.left - g.left + c.width / 2;
      const oy = c.top - g.top + c.height / 2;
      setCam({ ox, oy, scale: reduce ? 1 : scale, x: reduce ? 0 : g.width / 2 - ox, y: 0 });
      sectionRef.current?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
    setRevealedIdx(null);
    setOpenIdx(i);
  };

  useEffect(() => {
    if (openIdx == null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close]);

  if (doors.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative mb-12 py-6" aria-label={heading || "멤버십 혜택의 문"}>
      {(heading || subtitle) && (
        <motion.div className="mb-6 text-center" animate={{ opacity: openIdx == null ? 1 : 0 }} transition={{ duration: 0.5 }}>
          {heading && <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </motion.div>
      )}
      <motion.div
        ref={gridRef}
        className={`grid gap-3 sm:gap-5 ${doors.length >= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}
        style={{ transformOrigin: `${cam.ox}px ${cam.oy}px` }}
        animate={{ x: cam.x, y: cam.y, scale: cam.scale }}
        transition={{ duration: reduce ? 0.2 : 1, ease: EASE }}
      >
        {doors.map((d, i) => (
          <DoorCard
            key={`${d.title}-${i}`}
            door={d}
            index={i}
            open={openIdx === i}
            dim={openIdx != null && openIdx !== i}
            revealed={revealedIdx === i}
            onToggle={() => open(i)}
            onOpened={() => setRevealedIdx(i)}
            reduce={reduce}
            cardRef={(el) => {
              cardEls.current[i] = el;
            }}
          />
        ))}
      </motion.div>
      <AnimatePresence>
        {openIdx != null && (
          <motion.button
            type="button"
            onClick={close}
            className="mx-auto mt-6 block rounded-full border border-gray-300 bg-white/80 px-4 py-1.5 text-xs text-gray-600 backdrop-blur hover:bg-white"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            문 닫기 ✕
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
