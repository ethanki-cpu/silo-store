"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useWidgetPreview } from "@/lib/widgetPreviewContext";
import { DepthArt } from "@/components/membership/DepthArt";
import { DepthEffects } from "@/components/membership/DepthEffects";
import type { DepthScene } from "@/lib/membershipContentDefaults";

// EPIC-163 / 163.5: Scroll Storytelling "심연으로의 스크롤" — 스크롤할수록 사일로의 깊은 공간으로 줌인하며 깊이(Depth)마다
// ① 운영자가 올린 이미지가 화면 전체를 덮고 ② 그 위에 등장인물/장면 이미지가 자유 배치로 놓이고 ③ 깊이의 색·분위기 효과(별·깃털 등)가 깔리며
// ④ 가장 위 레이어의 아치문 안에 문구가 나타난다. 이미지 초점·배치는 관리자 편집기에서 드래그로 정한다.
const isHex = (c: string | undefined): c is string => !!c && /^#[0-9a-fA-F]{6}$/.test(c);
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const FALLBACK = [
  { c1: "#FBF6E6", c2: "#F4E58A", accent: "#E4C84B" },
  { c1: "#14532D", c2: "#2ECC8F", accent: "#9CF0C4" },
  { c1: "#0047AB", c2: "#0F52BA", accent: "#9FC1FF" },
  { c1: "#F6F1E7", c2: "#CFCBC2", accent: "#B9A77A" },
  { c1: "#E2412F", c2: "#1F2A5A", accent: "#F28C28" },
  { c1: "#3B1A66", c2: "#8E5BD1", accent: "#E0B5FF" },
];

function resolveTheme(scene: DepthScene, index: number) {
  const f = FALLBACK[index % FALLBACK.length];
  const c1 = isHex(scene.color1) ? scene.color1 : f.c1;
  const c2 = isHex(scene.color2) ? scene.color2 : f.c2;
  const accent = isHex(scene.accent) ? scene.accent : f.accent;
  const hasImage = !!scene.imageUrl;
  // 이미지가 있으면 그 위 글씨는 항상 밝은 색(어두운 유리 패널), 없으면 배경 밝기에 맞춘다.
  const dark = hasImage || (luminance(c1) + luminance(c2)) / 2 < 0.5;
  return { c1, c2, accent, dark, hasImage };
}

function parsePos(pos: string | undefined): [number, number] {
  const m = (pos ?? "50% 50%").match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
}

// 이미지·색·스프라이트까지의 "배경 레이어 묶음" — 실제 스크롤 무대와 정적(미리보기) 카드가 공유한다.
function SceneBackdrop({ scene, index }: { scene: DepthScene; index: number }) {
  const { c1, c2, accent, hasImage } = resolveTheme(scene, index);
  const [px, py] = parsePos(scene.imagePos);
  const zoom = Math.min(250, Math.max(100, scene.imageZoom ?? 100)) / 100;
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }} />
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scene.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${px}% ${py}%`, transform: `scale(${zoom})`, transformOrigin: `${px}% ${py}%` }}
        />
      )}
      {/* 깊이의 색 정체성 — 이미지 위에 색을 얇게 덮어 글씨가 읽히고 깊이마다 색이 분명해지게 */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${c1}${hasImage ? "66" : "00"} 0%, transparent 40%, ${c2}${hasImage ? "80" : "00"} 100%)` }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 45%, ${accent}33 100%)` }} />
      {(scene.sprites ?? []).map((sp) =>
        sp.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={sp.id}
            src={sp.url}
            alt=""
            className="pointer-events-none absolute object-contain drop-shadow-2xl"
            style={{ left: `${sp.x}%`, top: `${sp.y}%`, width: `${sp.w}%`, transform: "translate(-50%, -50%)" }}
          />
        ) : null,
      )}
    </>
  );
}

// EPIC-163.8(사용자 신고 — "문보다 부채처럼 보여, 좌우 넓이의 3/5 넓이로"): 아치문의 폭은 화면(무대) 좌우 폭의 3/5, 높이는 화면의 거의 전체로 늘리고
// 윗부분은 반원이 아니라 납작한 타원 곡선(가로 반지름 50%, 세로 반지름 작게)이라 부채꼴이 아니라 문처럼 보인다.
const DOOR_RADIUS = "50% 50% 16px 16px / 26% 26% 16px 16px";

function ArchText({ scene, index, variant = "stage" }: { scene: DepthScene; index: number; variant?: "stage" | "card" }) {
  const { accent, dark, hasImage } = resolveTheme(scene, index);
  const hasSprites = (scene.sprites ?? []).some((s) => s.url);
  const color = dark ? "#fdfbf7" : "#2b2740";
  return (
    <div
      className={`relative flex flex-col items-center justify-center border-2 text-center backdrop-blur-md ${"w-[88%] sm:w-[60%]"}`}
      style={{
        height: variant === "stage" ? "min(82vh, 880px)" : "480px",
        borderRadius: DOOR_RADIUS,
        borderColor: `${accent}cc`,
        background: dark ? "rgba(10,10,20,0.42)" : "rgba(255,255,255,0.5)",
        boxShadow: `0 0 70px ${accent}55, inset 0 0 44px ${accent}22`,
        color,
        padding: "8% 10%",
      }}
    >
      <div className="pointer-events-none absolute inset-3" style={{ borderRadius: DOOR_RADIUS, border: `1px solid ${accent}77` }} />
      {!hasImage && !hasSprites && (
        <div className="mx-auto mb-4 h-24 w-24" style={{ color }}>
          <DepthArt index={index} accent={accent} />
        </div>
      )}
      <p className="relative text-xs font-semibold uppercase tracking-[0.3em] opacity-80">{scene.title}</p>
      <p className="relative mt-5 max-w-[34rem] text-lg font-medium leading-8 sm:text-2xl sm:leading-[2.6rem]" style={{ fontFamily: '"Noto Serif KR","Nanum Myeongjo",Georgia,serif' }}>
        {scene.text}
      </p>
    </div>
  );
}

function Scene({ index, count, progress, scene, near }: { index: number; count: number; progress: MotionValue<number>; scene: DepthScene; near: boolean }) {
  const { accent } = resolveTheme(scene, index);
  const step = 1 / count;
  const center = (index + 0.5) * step;
  // 입력 구간은 0~1로 자르고(framer-motion은 0 미만/1 초과 오프셋을 허용하지 않는다), 첫/마지막 장면은 바깥쪽 끝에서 사라지지 않게 한다.
  const cl = (v: number) => Math.min(1, Math.max(0, v));
  const first = index === 0;
  const last = index === count - 1;
  const scale = useTransform(progress, [cl(center - step), cl(center), cl(center + step)], [first ? 1 : 0.7, 1, last ? 1 : 1.5]);
  const opacity = useTransform(progress, [cl(center - step), cl(center - step * 0.35), cl(center + step * 0.3), cl(center + step)], [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const textY = useTransform(progress, [cl(center - step * 0.5), cl(center), cl(center + step * 0.5)], [first ? 0 : 50, 0, last ? 0 : -50]);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ opacity, scale }}>
      <SceneBackdrop scene={scene} index={index} />
      {near && <DepthEffects effects={scene.effects ?? []} effectImages={(scene.effectImages ?? []).filter(Boolean)} accent={accent} seed={index + 1} />}
      <motion.div className="relative z-10 flex h-full items-center justify-center pb-4 pt-20" style={{ y: textY }}>
        <ArchText scene={scene} index={index} />
      </motion.div>
    </motion.div>
  );
}

export function MembershipDepths({ heading, scenes, sceneHeightVh }: { heading: string; scenes: DepthScene[]; sceneHeightVh: number }) {
  const reduce = useReducedMotion();
  const preview = useWidgetPreview();
  const ref = useRef<HTMLDivElement>(null);
  const scrollYProgress = useMotionValue(0);
  const [mode, setMode] = useState<"before" | "pinned" | "after">("before");
  const [activeIdx, setActiveIdx] = useState(0);
  const dot = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActiveIdx(Math.min(Math.max(0, scenes.length - 1), Math.floor(v * scenes.length))));

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

  // 관리자 미리보기(화면 전체를 fixed로 덮으면 안 됨)나 "움직임 줄이기"에서는 정적 카드로 — 이미지·배치·아치 문구는 그대로 보인다.
  if (reduce || preview) {
    return (
      <section className="mb-12 space-y-3">
        {heading && <h2 className="text-center text-xl font-semibold text-gray-900">{heading}</h2>}
        {scenes.map((s, i) => (
          <div key={`${s.title}-${i}`} className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl px-4 py-10">
            <SceneBackdrop scene={s} index={i} />
            <div className="relative z-10">
              <ArchText scene={s} index={i} variant="card" />
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="relative mb-12 -mx-6" aria-label={heading || "심연으로의 스크롤"}>
      {heading && <h2 className="mb-4 px-6 text-center text-xl font-semibold text-gray-900">{heading}</h2>}
      <div ref={ref} className="relative" style={{ height: `${scenes.length * sceneHeightVh}vh` }}>
        <div
          className={`h-screen overflow-hidden ${mode === "pinned" ? "fixed inset-x-0 top-0" : `absolute left-1/2 w-screen -translate-x-1/2 ${mode === "after" ? "bottom-0" : "top-0"}`}`}
          style={{ zIndex: 1 }}
        >
          {scenes.map((s, i) => (
            <Scene key={`${s.title}-${i}`} index={i} count={scenes.length} progress={scrollYProgress} scene={s} near={Math.abs(i - activeIdx) <= 1} />
          ))}
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 h-1 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-white/30">
            <motion.div className="h-full rounded-full bg-white/80" style={{ width: dot }} />
          </div>
          <p className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-[11px] tracking-[0.3em] text-white/70">SCROLL</p>
        </div>
      </div>
    </section>
  );
}
