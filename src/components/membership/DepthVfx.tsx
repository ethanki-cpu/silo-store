"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

// EPIC-164 Phase 3: 6단계(등급별) 하이엔드 VFX.
// 원칙(EPIC-154 트래픽 교훈): .glb/영상 같은 무거운 에셋을 받지 않는다 — CSS/SVG(Angel·Patron·Lautrec)와
// 코드로 그리는 셰이더(Alice·Gatsby·Artist, DepthVfxGl)만 쓴다. WebGL은 화면에 보일 때(IntersectionObserver +
// 현재 깊이)만 캔버스를 만들고, 벗어나면 즉시 해제한다. 위치/속도는 시드 기반 의사난수라 서버·클라이언트가 같다.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 요소가 뷰포트에 들어와 있는 동안만 true — 화면 밖에서는 렌더링을 시작하지 않는다.
function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

const GlVfx = dynamic(() => import("./DepthVfxGl"), { ssr: false });
// HOTFIX-164.1: 깃털 낙하(Angel)와 커서 궤적 황금 가루(Patron)는 tsParticles — 화면에 보일 때만 청크를 불러온다.
const TsLayer = dynamic(() => import("./TsParticlesLayer"), { ssr: false });

const CSS = `
@keyframes silo-vfx-ray{0%,100%{opacity:.35;transform:translateX(-2%) skewX(-12deg)}50%{opacity:.75;transform:translateX(3%) skewX(-12deg)}}
@keyframes silo-vfx-flap{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.22)}}
@keyframes silo-vfx-fly{0%{offset-distance:0%;opacity:0}8%{opacity:1}92%{opacity:1}100%{offset-distance:100%;opacity:0}}
@keyframes silo-vfx-candle{0%,100%{opacity:.85;transform:translate(-50%,-50%) scale(1)}18%{opacity:.6;transform:translate(-50%,-50%) scale(.9)}37%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}61%{opacity:.7;transform:translate(-50%,-50%) scale(.95)}80%{opacity:.95;transform:translate(-50%,-50%) scale(1.04)}}
@keyframes silo-vfx-shadow{0%,100%{opacity:.55}30%{opacity:.75}55%{opacity:.5}78%{opacity:.68}}
@keyframes silo-vfx-spark{0%{transform:translate3d(0,0,0) scale(1);opacity:0}12%{opacity:1}100%{transform:translate3d(var(--dx),-60vh,0) scale(.2);opacity:0}}
@keyframes silo-vfx-mote{0%,100%{transform:translate3d(0,0,0);opacity:.2}50%{transform:translate3d(var(--dx),-26px,0);opacity:.85}}
@media (prefers-reduced-motion: reduce){.silo-vfx *{animation:none!important}}
`;

// ── 1. Silo Angel — 빛과 깃털: CSS 볼류메트릭 빛내림 + tsParticles 깃털 낙하 ─────────────────────────────
function AngelVfx({ accent }: { accent: string }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 70% at 50% -10%, #fffbe8cc 0%, ${accent}22 45%, transparent 75%)` }} />
      {[18, 38, 60, 80].map((x, i) => (
        <div
          key={x}
          className="absolute -top-[10%] h-[120%]"
          style={{
            left: `${x}%`,
            width: `${10 + (i % 2) * 6}%`,
            background: "linear-gradient(180deg, #fffbe6aa 0%, #fffbe622 55%, transparent 100%)",
            filter: "blur(18px)",
            transformOrigin: "top",
            animation: `silo-vfx-ray ${7 + i * 1.7}s ease-in-out ${-i * 2}s infinite`,
          }}
        />
      ))}
      <TsLayer kind="angel" accent={accent} />
    </>
  );
}

// ── 4. Patron — 나비와 먼지: 베지어 궤적(offset-path)을 따르는 SVG 나비 + tsParticles 커서 궤적 황금 가루 ─────────
// 0~100 좌표(화면 %)로 그린 베지어 — 실제 픽셀 크기에 맞춰 곱해서 offset-path에 넣는다.
const BUTTERFLY_PATHS = [
  [[-5, 70], [20, 20], [40, 90], [60, 45], [95, 15], [108, 30]],
  [[105, 82], [80, 50], [62, 96], [40, 62], [12, 40], [-6, 52]],
  [[20, 108], [30, 70], [62, 74], [54, 40], [70, 8], [92, -6]],
  [[-6, 30], [22, 60], [46, 8], [70, 40], [92, 86], [108, 64]],
];
function scaledPath(pts: number[][], w: number, h: number) {
  const f = (p: number[]) => `${Math.round((p[0] / 100) * w)} ${Math.round((p[1] / 100) * h)}`;
  return `M ${f(pts[0])} C ${f(pts[1])}, ${f(pts[2])}, ${f(pts[3])} S ${f(pts[4])}, ${f(pts[5])}`;
}

function Butterfly({ color, size }: { color: string; size: number }) {
  return (
    <svg viewBox="0 0 60 40" width={size} height={size * 0.67} aria-hidden style={{ overflow: "visible", filter: `drop-shadow(0 0 8px ${color})` }}>
      <g style={{ transformOrigin: "30px 20px", animation: "silo-vfx-flap .55s ease-in-out infinite" }}>
        <path d="M30 20 C 22 2, 4 0, 3 12 C 2 22, 18 26, 30 20Z" fill={color} fillOpacity=".85" />
        <path d="M30 20 C 38 2, 56 0, 57 12 C 58 22, 42 26, 30 20Z" fill={color} fillOpacity=".85" />
        <path d="M30 20 C 20 24, 10 38, 20 38 C 27 38, 30 28, 30 20Z" fill={color} fillOpacity=".6" />
        <path d="M30 20 C 40 24, 50 38, 40 38 C 33 38, 30 28, 30 20Z" fill={color} fillOpacity=".6" />
      </g>
      <rect x="29" y="12" width="2" height="18" rx="1" fill="#2a2140" />
    </svg>
  );
}

function PatronVfx({ accent }: { accent: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const motes = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: 34 }, () => ({ left: r() * 100, top: r() * 100, s: 2 + r() * 3, dur: 6 + r() * 8, delay: -r() * 10, dx: (r() * 2 - 1) * 30 }));
  }, []);
  const colors = ["#f7c6ff", "#9ad8ff", "#ffe08a", "#c9b8ff", "#ffb4c8"];
  return (
    <div ref={boxRef} className="absolute inset-0">
      {size.w > 0 && BUTTERFLY_PATHS.flatMap((pts, i) => [0, 1].map((k) => (
        <span
          key={`${i}-${k}`}
          className="absolute left-0 top-0"
          style={{
            width: 1,
            height: 1,
            offsetPath: `path("${scaledPath(pts, size.w, size.h)}")`,
            animation: `silo-vfx-fly ${16 + i * 3 + k * 5}s ease-in-out ${-(i * 4 + k * 9)}s infinite`,
          } as CSSProperties}
        >
          <Butterfly color={colors[(i + k * 2) % colors.length]} size={30 + k * 12} />
        </span>
      )))}
      {motes.map((m, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.s, height: m.s, background: accent, boxShadow: `0 0 8px ${accent}`, ["--dx" as string]: `${m.dx}px`, animation: `silo-vfx-mote ${m.dur}s ease-in-out ${m.delay}s infinite` } as CSSProperties} />
      ))}
      <TsLayer kind="patron" accent={accent} />
    </div>
  );
}

// ── 5. Lautrec — 촛불과 불티: radial-gradient 펄스 + CSS 불티 ───────────────────────────────────
function LautrecVfx({ accent }: { accent: string }) {
  const candles = [
    { x: 14, y: 64, s: 1 },
    { x: 86, y: 58, s: 0.85 },
    { x: 50, y: 78, s: 0.7 },
  ];
  const sparks = useMemo(() => {
    const r = rng(53);
    return Array.from({ length: 30 }, () => {
      const c = candles[Math.floor(r() * candles.length)];
      return { left: c.x + (r() * 2 - 1) * 5, top: c.y, s: 2 + r() * 3, dur: 4 + r() * 6, delay: -r() * 9, dx: (r() * 2 - 1) * 90 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {/* 촛불이 일렁이며 화면을 어둡게/밝게 만드는 그림자 */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 60%, transparent 30%, rgba(20,6,4,.75) 100%)", animation: "silo-vfx-shadow 3.2s ease-in-out infinite" }} />
      {candles.map((c, i) => (
        <div key={i} className="absolute" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
          <div className="absolute rounded-full" style={{ width: 460 * c.s, height: 460 * c.s, left: 0, top: 0, background: `radial-gradient(circle, ${accent}88 0%, ${accent}33 30%, transparent 68%)`, mixBlendMode: "screen", animation: `silo-vfx-candle ${2.3 + i * 0.7}s ease-in-out ${-i}s infinite` }} />
          <div className="absolute rounded-full" style={{ width: 70 * c.s, height: 110 * c.s, left: 0, top: 0, background: "radial-gradient(ellipse at 50% 65%, #fff7d0 0%, #ffb347 40%, transparent 72%)", mixBlendMode: "screen", animation: `silo-vfx-candle ${1.4 + i * 0.4}s ease-in-out ${-i * 0.6}s infinite` }} />
        </div>
      ))}
      {sparks.map((p, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.s, height: p.s, background: "#ffc27a", boxShadow: "0 0 8px #ff9a3c", ["--dx" as string]: `${p.dx}px`, animation: `silo-vfx-spark ${p.dur}s ease-out ${p.delay}s infinite` } as CSSProperties} />
      ))}
    </>
  );
}

export type VfxKind = "angel" | "alice" | "gatsby" | "patron" | "lautrec" | "artist";
export const VFX_BY_INDEX: VfxKind[] = ["angel", "alice", "gatsby", "patron", "lautrec", "artist"];

// active = 지금 이 깊이가 화면의 주인공인가(WebGL은 이때만 켠다). CSS 효과는 인접 깊이까지 미리 그려도 가볍다.
export function DepthVfx({
  kind,
  accent,
  color1,
  color2,
  imageUrl,
  imagePos,
  active,
}: {
  kind: VfxKind;
  accent: string;
  color1: string;
  color2: string;
  imageUrl?: string;
  imagePos?: string;
  active: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const gl = kind === "alice" || kind === "gatsby" || kind === "artist";
  return (
    <div ref={ref} aria-hidden className="silo-vfx pointer-events-none absolute inset-0 overflow-hidden">
      <style>{CSS}</style>
      {inView && kind === "angel" && <AngelVfx accent={accent} />}
      {inView && kind === "patron" && <PatronVfx accent={accent} />}
      {inView && kind === "lautrec" && <LautrecVfx accent={accent} />}
      {gl && inView && active && <GlVfx kind={kind} accent={accent} color1={color1} color2={color2} imageUrl={imageUrl} imagePos={imagePos} />}
    </div>
  );
}
