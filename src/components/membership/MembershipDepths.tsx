"use client";

import { motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { DepthScene } from "@/lib/membershipContentDefaults";
import { TIER_PALETTE, type TierPaletteKey } from "@/lib/tierPalette";

// EPIC-163: Scroll Storytelling "심연으로의 스크롤" — 스크롤할수록 사일로의 깊은 공간(문 앞 광장 → 살롱의 서재 → 무도회장 → 비밀의 방)으로
// 3D 줌인(Z축 이동)하며 깊이마다 이야기가 나타난다. 위젯 설정(depths)에서 문구를 고칠 수 있다.
const SCENE_TIERS: TierPaletteKey[] = ["angel", "alice", "gatsby", "patron"];
const DARK = new Set<TierPaletteKey>(["gatsby", "patron"]);

function Scene({ index, count, progress, scene }: { index: number; count: number; progress: MotionValue<number>; scene: DepthScene }) {
  const key = SCENE_TIERS[index % SCENE_TIERS.length];
  const c = TIER_PALETTE[key];
  const dark = DARK.has(key);
  const step = 1 / count;
  const center = (index + 0.5) * step;
  // 입력 구간은 0~1로 자르고(framer-motion은 0 미만/1 초과 오프셋을 허용하지 않는다), 첫/마지막 장면은 바깥쪽 끝에서 사라지지 않게 한다.
  const cl = (v: number) => Math.min(1, Math.max(0, v));
  const first = index === 0;
  const last = index === count - 1;
  const scale = useTransform(progress, [cl(center - step), cl(center), cl(center + step)], [first ? 1 : 0.6, 1, last ? 1 : 1.7]);
  const opacity = useTransform(progress, [cl(center - step), cl(center - step * 0.35), cl(center + step * 0.3), cl(center + step)], [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const textY = useTransform(progress, [cl(center - step * 0.5), cl(center), cl(center + step * 0.5)], [first ? 0 : 40, 0, last ? 0 : -40]);
  const textColor = dark ? "#fdfbf7" : c.depth === "#D4C9C1" ? "#5a4d44" : "#2b2740";

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity, scale }}>
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${c.base} 0%, ${c.highlight} 55%, ${c.depth} 130%)` }}
      />
      {/* 문틀/아치가 겹겹이 이어지는 복도 — 줌인할수록 안쪽으로 들어가는 느낌 */}
      {[0, 1, 2].map((n) => (
        <div
          key={n}
          className="absolute rounded-t-[999px] border"
          style={{
            width: `${72 - n * 16}%`,
            height: `${78 - n * 14}%`,
            bottom: `${6 + n * 5}%`,
            borderColor: `${dark ? c.highlight : c.depth}${n === 0 ? "88" : "55"}`,
            boxShadow: `inset 0 0 60px ${dark ? "#00000066" : c.highlight + "88"}`,
          }}
        />
      ))}
      <motion.div className="relative z-10 mx-auto max-w-xl px-8 text-center" style={{ y: textY, color: textColor }}>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-70">{scene.title}</p>
        <p className="mt-5 text-xl font-medium leading-9 sm:text-2xl sm:leading-10" style={{ fontFamily: '"Noto Serif KR","Nanum Myeongjo",Georgia,serif' }}>
          {scene.text}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function MembershipDepths({ heading, scenes, sceneHeightVh }: { heading: string; scenes: DepthScene[]; sceneHeightVh: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const scrollYProgress = useMotionValue(0);
  const [mode, setMode] = useState<"before" | "pinned" | "after">("before");
  const dot = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // body가 overflow-x:hidden(=스크롤 컨테이너)라 CSS sticky가 먹지 않아, 스크롤 위치로 직접 고정(fixed)/해제한다.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = Math.max(1, r.height - vh);
      scrollYProgress.set(Math.min(1, Math.max(0, -r.top / total)));
      setMode(r.top > 0 ? "before" : r.bottom <= vh ? "after" : "pinned");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollYProgress, scenes.length]);

  if (scenes.length === 0) return null;

  if (reduce) {
    return (
      <section className="mb-12 space-y-3">
        {heading && <h2 className="text-center text-xl font-semibold text-gray-900">{heading}</h2>}
        {scenes.map((s, i) => {
          const c = TIER_PALETTE[SCENE_TIERS[i % SCENE_TIERS.length]];
          return (
            <div key={s.title} className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(160deg, ${c.base}, ${c.highlight})`, color: DARK.has(SCENE_TIERS[i % SCENE_TIERS.length]) ? "#fff" : "#2b2740" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-70">{s.title}</p>
              <p className="mt-3 text-lg leading-8">{s.text}</p>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className="relative mb-12 -mx-6" aria-label={heading || "심연으로의 스크롤"}>
      {heading && <h2 className="mb-4 px-6 text-center text-xl font-semibold text-gray-900">{heading}</h2>}
      <div ref={ref} className="relative" style={{ height: `${scenes.length * sceneHeightVh}vh` }}>
        <div
          className={`inset-x-0 h-screen overflow-hidden ${mode === "pinned" ? "fixed top-0" : mode === "after" ? "absolute bottom-0" : "absolute top-0"}`}
          style={{ zIndex: 1 }}
        >
          {scenes.map((s, i) => (
            <Scene key={s.title} index={i} count={scenes.length} progress={scrollYProgress} scene={s} />
          ))}
          <div className="pointer-events-none absolute bottom-6 left-1/2 h-1 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-black/10">
            <motion.div className="h-full rounded-full bg-black/40" style={{ width: dot }} />
          </div>
          <p className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.3em] text-black/40">SCROLL</p>
        </div>
      </div>
    </section>
  );
}
