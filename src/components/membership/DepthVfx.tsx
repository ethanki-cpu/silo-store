"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";

// EPIC-164 / HOTFIX-164.4: 등급별 하이엔드 VFX(CSS/SVG 부분). 추가 다운로드 0 — 전부 코드로 그린다.
// WebGL이 필요한 것(Alice 카드, Gatsby 기포·안개·연기·폭죽, Artist 물방울 파동)은 DepthVfxGl, 커서 궤적 황금 가루는 tsParticles.
// 각 효과는 화면에 보일 때(IntersectionObserver)만 그린다. 위치·속도는 시드 기반 의사난수라 서버/클라이언트가 같다.
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
const uid = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, "");

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
const TsLayer = dynamic(() => import("./TsParticlesLayer"), { ssr: false });

const CSS = `
@keyframes silo-vfx-ray{0%,100%{opacity:.4;transform:translateX(-2%) skewX(-12deg)}50%{opacity:.9;transform:translateX(3%) skewX(-12deg)}}
@keyframes silo-vfx-cloud{0%{transform:translateX(-6vw)}100%{transform:translateX(8vw)}}
@keyframes silo-vfx-wander{0%,100%{transform:translate3d(0,0,0)}25%{transform:translate3d(var(--dx),calc(var(--dy) * -1),0)}50%{transform:translate3d(calc(var(--dx) * -.6),calc(var(--dy) * .4),0)}75%{transform:translate3d(calc(var(--dx) * .5),var(--dy),0)}}
@keyframes silo-vfx-blink{0%,100%{opacity:.15}45%,55%{opacity:1}}
@keyframes silo-vfx-paint{0%,8%{clip-path:inset(100% 0 0 0);opacity:1}42%,80%{clip-path:inset(0 0 0 0);opacity:1}94%,100%{clip-path:inset(0 0 0 0);opacity:0}}
@keyframes silo-vfx-sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes silo-vfx-flap{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.16)}}
@keyframes silo-vfx-fly{0%{offset-distance:0%;opacity:0}8%{opacity:1}92%{opacity:1}100%{offset-distance:100%;opacity:0}}
@keyframes silo-vfx-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes silo-vfx-bloom{0%,4%{transform:scale(0) rotate(-40deg);opacity:0}14%{transform:scale(1.18) rotate(6deg);opacity:1}20%,86%{transform:scale(1) rotate(0);opacity:1}96%,100%{transform:scale(0) rotate(30deg);opacity:0}}
@keyframes silo-vfx-ignite{0%{transform:scale(0,0);opacity:0}60%{transform:scale(1.25,1.3);opacity:1}100%{transform:scale(1,1);opacity:1}}
@keyframes silo-vfx-flame{0%,100%{transform:scale(1,1) skewX(0)}12%{transform:scale(.93,1.1) skewX(-3deg)}27%{transform:scale(1.05,.9) skewX(2.5deg)}41%{transform:scale(.96,1.14) skewX(-1.5deg)}58%{transform:scale(1.04,.94) skewX(3deg)}73%{transform:scale(.94,1.08) skewX(-2.5deg)}88%{transform:scale(1.02,.97) skewX(1deg)}}
@keyframes silo-vfx-halo{0%,100%{opacity:.75;transform:translate(-50%,50%) scale(1)}20%{opacity:.5;transform:translate(-50%,50%) scale(.92)}45%{opacity:1;transform:translate(-50%,50%) scale(1.08)}70%{opacity:.62;transform:translate(-50%,50%) scale(.96)}}
@keyframes silo-vfx-window{0%,12%{opacity:0}18%{opacity:1}30%{opacity:.7}42%,100%{opacity:1}}
@keyframes silo-vfx-shadow{0%,100%{opacity:.5}30%{opacity:.75}55%{opacity:.45}78%{opacity:.68}}
@keyframes silo-vfx-spark{0%{transform:translate3d(0,0,0) scale(1);opacity:0}12%{opacity:1}100%{transform:translate3d(var(--dx),-55vh,0) scale(.2);opacity:0}}
@keyframes silo-vfx-mote{0%,100%{transform:translate3d(0,0,0);opacity:.2}50%{transform:translate3d(var(--dx),-26px,0);opacity:.9}}
@keyframes silo-vfx-petal{0%{transform:translate3d(var(--x0),var(--y0),0) rotate3d(1,.6,.2,0deg);opacity:0}5%{opacity:.96}25%{transform:translate3d(var(--x1),var(--y1),0) rotate3d(1,.6,.2,210deg)}50%{transform:translate3d(var(--x2),var(--y2),0) rotate3d(.4,1,.3,440deg)}75%{transform:translate3d(var(--x3),var(--y3),0) rotate3d(1,.2,.6,650deg)}95%{opacity:.96}100%{transform:translate3d(var(--x4),var(--y4),0) rotate3d(1,.5,.3,860deg);opacity:0}}
@media (prefers-reduced-motion: reduce){.silo-vfx *{animation:none!important}}
`;

const Motes = ({ color, count, seed }: { color: string; count: number; seed: number }) => {
  const motes = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ left: r() * 100, top: r() * 100, s: 2 + r() * 3, dur: 6 + r() * 8, delay: -r() * 10, dx: (r() * 2 - 1) * 30 }));
  }, [count, seed]);
  return (
    <>
      {motes.map((m, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.s, height: m.s, background: color, boxShadow: `0 0 8px ${color}`, ["--dx" as string]: `${m.dx}px`, animation: `silo-vfx-mote ${m.dur}s ease-in-out ${m.delay}s infinite` } as CSSProperties} />
      ))}
    </>
  );
};

// ── 1. Silo Angel — 성스러운 빛이 위에서 내리쬐고, 구름이 흐른다(깃털은 관리자가 올린 이미지가 DepthEffects로 날린다) ──────────
function AngelVfx({ accent }: { accent: string }) {
  const clouds = useMemo(() => {
    const r = rng(23);
    return [
      { top: -4, left: -10, w: 60, h: 22 },
      { top: 6, left: 48, w: 58, h: 20 },
      { top: 62, left: -14, w: 62, h: 26 },
      { top: 74, left: 40, w: 66, h: 26 },
    ].map((c) => ({ ...c, dur: 40 + r() * 40, delay: -r() * 40, op: 0.5 + r() * 0.25 }));
  }, []);
  return (
    <>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 65% 75% at 50% -12%, #fffbe8f0 0%, #fff3c4aa 22%, ${accent}22 52%, transparent 78%)` }} />
      {[10, 26, 44, 62, 80].map((x, i) => (
        <div
          key={x}
          className="absolute -top-[10%] h-[125%]"
          style={{
            left: `${x}%`,
            width: `${9 + (i % 3) * 5}%`,
            background: "linear-gradient(180deg, #fffbe6cc 0%, #fffbe633 55%, transparent 100%)",
            filter: "blur(16px)",
            mixBlendMode: "screen",
            transformOrigin: "top",
            animation: `silo-vfx-ray ${6 + i * 1.5}s ease-in-out ${-i * 2}s infinite`,
          }}
        />
      ))}
      {clouds.map((c, i) => (
        <div key={i} className="absolute rounded-full" style={{ top: `${c.top}%`, left: `${c.left}%`, width: `${c.w}%`, height: `${c.h}%`, background: "radial-gradient(ellipse at 50% 55%, #ffffff 0%, #ffffffcc 30%, #ffffff55 55%, transparent 72%)", filter: "blur(22px)", opacity: c.op, animation: `silo-vfx-cloud ${c.dur}s ease-in-out ${c.delay}s infinite alternate` }} />
      ))}
      <Motes color="#fff3b0" count={26} seed={12} />
    </>
  );
}

// ── 2. Alice — 반딧불이 + 하얀 장미가 빨갛게 칠해진다(카드 낙하는 WebGL) ───────────────────────────
const PETAL = "M0 0 C -20 -8 -27 -38 0 -46 C 27 -38 20 -8 0 0Z";
function RoseSvg({ red }: { red: boolean }) {
  const id = uid(useId());
  const g = red ? ["#ff7b7b", "#c1121f", "#5a0511"] : ["#ffffff", "#f1ebe0", "#cbc1ae"];
  const layers: [number[], number][] = [
    [[0, 72, 144, 216, 288], 1],
    [[36, 108, 180, 252, 324], 0.72],
    [[0, 90, 180, 270], 0.48],
  ];
  return (
    <svg viewBox="-50 -50 100 100" width="100%" height="100%" aria-hidden style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={id} cx="50%" cy="62%" r="68%">
          <stop offset="0" stopColor={g[0]} />
          <stop offset=".62" stopColor={g[1]} />
          <stop offset="1" stopColor={g[2]} />
        </radialGradient>
      </defs>
      {layers.map(([angles, s]) => angles.map((a) => <path key={`${s}-${a}`} d={PETAL} transform={`rotate(${a}) scale(${s})`} fill={`url(#${id})`} stroke={g[2]} strokeOpacity=".55" strokeWidth=".9" />))}
      <circle r="6.5" fill={g[1]} />
      <path d="M-4 0 a4 4 0 1 1 4 4 a2.4 2.4 0 1 1 -2.4 -2.4" fill="none" stroke={g[2]} strokeWidth="1.2" />
    </svg>
  );
}

function PaintedRose({ size, delay }: { size: number; delay: number }) {
  return (
    <div className="relative" style={{ width: size, height: size, filter: "drop-shadow(0 6px 10px rgba(0,0,0,.35))" }}>
      <div className="absolute inset-0">
        <RoseSvg red={false} />
      </div>
      <div className="absolute inset-0" style={{ animation: `silo-vfx-paint 11s ease-in-out ${delay}s infinite` }}>
        <RoseSvg red />
      </div>
    </div>
  );
}

function RoseBush({ side }: { side: "left" | "right" }) {
  const leaves = useMemo(() => {
    const r = rng(side === "left" ? 5 : 6);
    return Array.from({ length: 22 }, () => ({ x: 20 + r() * 260, y: 30 + r() * 120, rot: r() * 360, s: 0.7 + r() * 0.8, tone: r() }));
  }, [side]);
  const roses = [
    { x: 16, y: 34, s: 30, d: 0 },
    { x: 42, y: 14, s: 36, d: 2.2 },
    { x: 70, y: 34, s: 30, d: 4.1 },
    { x: 30, y: 58, s: 26, d: 6 },
    { x: 58, y: 56, s: 28, d: 1.4 },
  ];
  return (
    <div className="absolute bottom-0" style={{ [side]: "-2%", width: "clamp(230px,34vw,500px)", aspectRatio: "300 / 170", transform: side === "right" ? "scaleX(-1)" : undefined, transformOrigin: "bottom center", animation: "silo-vfx-sway 7s ease-in-out infinite" } as CSSProperties}>
      <svg viewBox="0 0 300 170" className="absolute inset-0 h-full w-full" aria-hidden>
        {leaves.map((l, i) => (
          <path key={i} d="M0 0 C 10 -12 34 -12 46 0 C 34 12 10 12 0 0Z" transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.s})`} fill={l.tone > 0.5 ? "#2f6b34" : "#1d4a26"} stroke="#12331a" strokeWidth=".8" />
        ))}
      </svg>
      {roses.map((r, i) => (
        <div key={i} className="absolute" style={{ left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%,-50%)" }}>
          <PaintedRose size={Math.round(r.s * 4.6)} delay={r.d} />
        </div>
      ))}
    </div>
  );
}

function AliceVfx() {
  const flies = useMemo(() => {
    const r = rng(31);
    return Array.from({ length: 34 }, () => ({ left: r() * 100, top: 8 + r() * 86, s: 3 + r() * 5, dur: 8 + r() * 10, delay: -r() * 14, dx: (r() * 2 - 1) * 90, dy: 30 + r() * 70, blink: 1.8 + r() * 2.8 }));
  }, []);
  return (
    <>
      <RoseBush side="left" />
      <RoseBush side="right" />
      {flies.map((f, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${f.left}%`, top: `${f.top}%`, width: f.s, height: f.s, background: "#f4ffb0", boxShadow: "0 0 10px 4px #d4ff5acc, 0 0 26px 9px #a8ff3a55", ["--dx" as string]: `${f.dx}px`, ["--dy" as string]: `${f.dy}px`, animation: `silo-vfx-wander ${f.dur}s ease-in-out ${f.delay}s infinite, silo-vfx-blink ${f.blink}s ease-in-out ${f.delay}s infinite` } as CSSProperties} />
      ))}
    </>
  );
}

// ── 3. Gatsby — 화면 전체가 샴페인 잔: 황금빛 액체 톤 + 빛기둥(기포·안개·연기·폭죽은 WebGL) ──────────────
function GatsbyVfx({ accent }: { accent: string }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(255,170,50,.42) 0%, rgba(255,205,110,.18) 46%, rgba(255,236,170,.06) 100%)", mixBlendMode: "screen" }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 55% at 50% 108%, ${accent}66 0%, transparent 70%)` }} />
      {[16, 42, 70].map((x, i) => (
        <div key={x} className="absolute -top-[10%] h-[125%]" style={{ left: `${x}%`, width: "11%", background: "linear-gradient(180deg, #ffe9a8aa 0%, #ffe9a822 60%, transparent 100%)", filter: "blur(20px)", mixBlendMode: "screen", animation: `silo-vfx-ray ${8 + i * 2}s ease-in-out ${-i * 3}s infinite` }} />
      ))}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 120px 30px rgba(255,190,80,.28)" }} />
    </>
  );
}

// ── 4. Patron — 푸른 모르포 나비 + 피어나는 꽃 + 금빛 먼지 + 커서 황금 가루 ─────────────────────────
const BUTTERFLY_PATHS = [
  [[-5, 70], [20, 20], [40, 90], [60, 45], [95, 15], [108, 30]],
  [[105, 82], [80, 50], [62, 96], [40, 62], [12, 40], [-6, 52]],
  [[20, 108], [30, 70], [62, 74], [54, 40], [70, 8], [92, -6]],
  [[-6, 30], [22, 60], [46, 8], [70, 40], [92, 86], [108, 64]],
  [[50, 108], [46, 70], [20, 60], [30, 30], [70, 26], [108, 8]],
];
function scaledPath(pts: number[][], w: number, h: number) {
  const f = (p: number[]) => `${Math.round((p[0] / 100) * w)} ${Math.round((p[1] / 100) * h)}`;
  return `M ${f(pts[0])} C ${f(pts[1])}, ${f(pts[2])}, ${f(pts[3])} S ${f(pts[4])}, ${f(pts[5])}`;
}

function Butterfly({ c1, c2, size, speed }: { c1: string; c2: string; size: number; speed: number }) {
  const id = uid(useId());
  const wing = (
    <>
      <path d="M60 40 C 50 6, 8 -4, 2 20 C -4 42, 32 48, 60 42Z" fill={`url(#${id})`} stroke="#0a1030" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M60 44 C 40 46, 8 58, 20 74 C 34 88, 58 64, 60 48Z" fill={`url(#${id})`} fillOpacity=".92" stroke="#0a1030" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M60 40 L 14 18 M60 41 L 10 34 M60 45 L 22 68 M60 43 L 30 52" stroke="#ffffff" strokeOpacity=".32" strokeWidth=".9" fill="none" />
      {[[12, 20, 2.2], [20, 12, 1.8], [8, 32, 1.6], [24, 68, 2], [16, 60, 1.6], [34, 76, 1.4]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" fillOpacity=".9" />
      ))}
    </>
  );
  const flap: CSSProperties = { transformBox: "fill-box", transformOrigin: "100% 50%", animation: `silo-vfx-flap ${speed}s ease-in-out infinite` };
  return (
    <svg viewBox="0 0 120 90" width={size} height={size * 0.75} aria-hidden style={{ overflow: "visible", filter: `drop-shadow(0 0 12px ${c1}aa)` }}>
      <defs>
        <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset=".55" stopColor={c2} />
          <stop offset="1" stopColor="#0b1a6a" />
        </linearGradient>
      </defs>
      <g style={flap}>{wing}</g>
      <g transform="translate(120 0) scale(-1 1)">
        <g style={flap}>{wing}</g>
      </g>
      <ellipse cx="60" cy="46" rx="3.2" ry="20" fill="#1a1230" />
      <path d="M60 28 C 56 14, 50 8, 44 6 M60 28 C 64 14, 70 8, 76 6" stroke="#1a1230" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

function Flower({ color, center, size, delay, petals }: { color: string; center: string; size: number; delay: number; petals: number }) {
  const id = uid(useId());
  return (
    <div style={{ width: size, height: size, animation: `silo-vfx-bloom 15s cubic-bezier(.2,1.4,.4,1) ${delay}s infinite`, transformOrigin: "50% 100%" }}>
      <svg viewBox="-50 -50 100 100" width="100%" height="100%" aria-hidden style={{ overflow: "visible", filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))", animation: "silo-vfx-sway 6s ease-in-out infinite" }}>
        <defs>
          <radialGradient id={id} cx="50%" cy="80%" r="80%">
            <stop offset="0" stopColor={center} />
            <stop offset=".35" stopColor={color} />
            <stop offset="1" stopColor="#ffffff" />
          </radialGradient>
        </defs>
        {Array.from({ length: petals }, (_, i) => (
          <ellipse key={i} cx="0" cy="-22" rx="11" ry="24" transform={`rotate(${(360 / petals) * i})`} fill={`url(#${id})`} stroke={color} strokeOpacity=".5" strokeWidth=".8" />
        ))}
        <circle r="9" fill={center} />
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={i} cx={Math.cos((i / 8) * 6.283) * 5} cy={Math.sin((i / 8) * 6.283) * 5} r="1.2" fill="#8a5a00" fillOpacity=".7" />
        ))}
      </svg>
    </div>
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
  const palette: [string, string][] = [["#5ee0ff", "#1f5be0"], ["#ffb3d9", "#c23a9a"], ["#ffe27a", "#e08a00"], ["#c9b8ff", "#6a4ae0"], ["#9dffd0", "#149a78"]];
  const flowers = useMemo(() => {
    const r = rng(77);
    const cols: [string, string][] = [["#ff9ec0", "#ffd166"], ["#ffffff", "#ffd166"], ["#c9a8ff", "#fff1a0"], ["#ffd166", "#b3541e"], ["#ff8a7a", "#ffe08a"]];
    return Array.from({ length: 13 }, (_, i) => {
      const c = cols[i % cols.length];
      return { left: 2 + (i / 12) * 94 + (r() - 0.5) * 3, bottom: 1 + r() * 11, size: 42 + r() * 40, delay: i * 0.55 - r() * 2, petals: 5 + Math.floor(r() * 4), color: c[0], center: c[1] };
    });
  }, []);
  return (
    <div ref={boxRef} className="absolute inset-0">
      {flowers.map((f, i) => (
        <div key={i} className="absolute flex flex-col items-center" style={{ left: `${f.left}%`, bottom: `${f.bottom}%`, transform: "translateX(-50%)" }}>
          <Flower color={f.color} center={f.center} size={f.size} delay={f.delay} petals={f.petals} />
          <span aria-hidden style={{ width: 3, height: `${6 + (i % 4) * 2}vh`, background: "linear-gradient(180deg,#6da95a,#274e24)", borderRadius: 2, marginTop: -4 }} />
        </div>
      ))}
      {size.w > 0 &&
        BUTTERFLY_PATHS.flatMap((pts, i) =>
          [0, 1].map((k) => {
            const [c1, c2] = palette[(i + k * 2) % palette.length];
            return (
              <span
                key={`${i}-${k}`}
                className="absolute left-0 top-0"
                style={{ width: 1, height: 1, offsetPath: `path("${scaledPath(pts, size.w, size.h)}")`, offsetRotate: "auto 90deg", animation: `silo-vfx-fly ${17 + i * 3 + k * 6}s ease-in-out ${-(i * 4 + k * 9)}s infinite` } as CSSProperties}
              >
                <span className="block" style={{ animation: "silo-vfx-bob 1.6s ease-in-out infinite" }}>
                  <Butterfly c1={c1} c2={c2} size={54 + ((i + k) % 3) * 22} speed={0.42 + ((i * 3 + k) % 4) * 0.08} />
                </span>
              </span>
            );
          })
        )}
      <Motes color={accent} count={30} seed={41} />
      <TsLayer kind="patron" accent={accent} />
    </div>
  );
}

// ── 5. Lautrec — 곳곳에 촛불이 하나씩 켜지고, 성의 창문에 불이 들어오고, 먼지가 날린다 ─────────────────
function Candle({ x, h, delay, tone }: { x: number; h: number; delay: number; tone: number }) {
  const id = uid(useId());
  const dur = 1.1 + tone * 0.9;
  return (
    <div className="absolute bottom-0" style={{ left: `${x}%`, width: 24, height: h + 66, transform: "translateX(-50%)" }}>
      <div className="absolute rounded-full" style={{ left: "50%", bottom: h + 30, width: 420, height: 420, background: "radial-gradient(circle, rgba(255,190,90,.55) 0%, rgba(255,150,60,.2) 34%, transparent 66%)", mixBlendMode: "screen", opacity: 0, animation: `silo-vfx-halo ${dur + 0.6}s ease-in-out ${delay + 0.6}s infinite` }} />
      <svg viewBox="0 0 40 80" className="absolute" width="24" height="48" style={{ left: 0, bottom: h + 2, overflow: "visible", transformOrigin: "50% 100%", animation: `silo-vfx-ignite .9s ease-out ${delay}s both, silo-vfx-flame ${dur}s ease-in-out ${delay + 0.9}s infinite` }} aria-hidden>
        <defs>
          <radialGradient id={id} cx="50%" cy="82%" r="70%">
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset=".28" stopColor="#ffe27a" />
            <stop offset=".6" stopColor="#ff9a2e" />
            <stop offset="1" stopColor="#ff5a10" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M20 2 C 30 24, 39 40, 34 58 C 32 74, 8 74, 6 58 C 2 40, 14 26, 20 2Z" fill={`url(#${id})`} style={{ filter: "drop-shadow(0 0 10px #ff9a2e)" }} />
        <ellipse cx="20" cy="62" rx="5" ry="9" fill="#5aa6ff" fillOpacity=".55" />
      </svg>
      <span className="absolute left-1/2 -translate-x-1/2" style={{ bottom: h, width: 2, height: 8, background: "#1a1010" }} />
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t" style={{ width: 18, height: h, background: "linear-gradient(90deg,#d8c79a 0%,#fff3d2 45%,#cbb689 100%)", boxShadow: "inset 0 -6px 8px rgba(0,0,0,.25)" }} />
    </div>
  );
}

const CASTLE_WINDOWS: [number, number][] = [[55, 150], [150, 110], [90, 176], [300, 125], [190, 176], [470, 120], [400, 178], [540, 178], [640, 140], [720, 172], [800, 105], [880, 176], [975, 142], [640, 165]];
function LautrecVfx({ accent }: { accent: string }) {
  const candles = useMemo(() => {
    const r = rng(61);
    return [7, 19, 31, 44, 58, 71, 83, 94].map((x, i) => ({ x, h: 34 + Math.round(r() * 46), delay: 0.4 + i * 0.8 + r() * 0.5, tone: r() }));
  }, []);
  const sparks = useMemo(() => {
    const r = rng(53);
    return Array.from({ length: 34 }, () => {
      const c = candles[Math.floor(r() * candles.length)];
      return { left: c.x + (r() * 2 - 1) * 3, s: 2 + r() * 3, dur: 4 + r() * 6, delay: -r() * 9, dx: (r() * 2 - 1) * 90 };
    });
  }, [candles]);
  return (
    <>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 70%, transparent 25%, rgba(18,6,4,.72) 100%)", animation: "silo-vfx-shadow 3.2s ease-in-out infinite" }} />
      <svg viewBox="0 0 1000 220" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-[22vh] w-full" aria-hidden>
        <path d="M0 220 V170 H40 V150 L55 130 L70 150 V170 H120 V120 H135 V100 L150 80 L165 100 V120 H180 V170 H260 V140 H280 V120 L300 95 L320 120 V140 H340 V175 H430 V130 H450 V110 L470 88 L490 110 V130 H510 V175 H600 V150 H620 V130 L640 105 L660 130 V150 H680 V170 H760 V125 H780 V95 L800 70 L820 95 V125 H840 V170 H930 V150 H960 V135 L975 118 L990 135 V150 H1000 V220Z" fill="#0a0610" fillOpacity=".9" />
        {CASTLE_WINDOWS.map(([x, y], i) => (
          <rect key={i} x={x - 4} y={y - 7} width="8" height="14" rx="3" fill="#ffc45a" style={{ filter: "drop-shadow(0 0 6px #ff9a2e)", opacity: 0, animation: `silo-vfx-window ${9 + (i % 4)}s ease-in-out ${1 + i * 0.7}s infinite` }} />
        ))}
      </svg>
      {candles.map((c, i) => (
        <Candle key={i} x={c.x} h={c.h} delay={c.delay} tone={c.tone} />
      ))}
      {sparks.map((p, i) => (
        <span key={i} className="absolute bottom-[8%] rounded-full" style={{ left: `${p.left}%`, width: p.s, height: p.s, background: "#ffc27a", boxShadow: "0 0 8px #ff9a3c", ["--dx" as string]: `${p.dx}px`, animation: `silo-vfx-spark ${p.dur}s ease-out ${p.delay}s infinite` } as CSSProperties} />
      ))}
      <Motes color={accent} count={40} seed={19} />
    </>
  );
}

// ── 6. Artist — 수많은 꽃잎이 강하게 무작위로 휘날린다(물방울 파동은 WebGL + 배경 왜곡) ─────────────────
function ArtistVfx() {
  const id = uid(useId());
  const petals = useMemo(() => {
    const r = rng(83);
    return Array.from({ length: 54 }, (_, i) => {
      const dir = r() < 0.7 ? 1 : -1;
      const x0 = dir > 0 ? -10 - r() * 20 : 110 + r() * 20;
      const y0 = -15 + r() * 60;
      const step = () => (r() * 34 - 6) * dir;
      const xs = [x0];
      const ys = [y0];
      for (let k = 0; k < 4; k++) {
        xs.push(xs[k] + step() + 22 * dir);
        ys.push(ys[k] + 12 + r() * 30 + (r() < 0.25 ? -18 : 0));
      }
      return { xs, ys, s: 14 + r() * 26, dur: 7 + r() * 9, delay: -r() * 14, tone: i % 3 };
    });
  }, []);
  const fills = [`url(#${id}a)`, `url(#${id}b)`, `url(#${id}c)`];
  return (
    <>
      <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
        <defs>
          <linearGradient id={`${id}a`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#ff8fb3" />
            <stop offset="1" stopColor="#fff0f5" />
          </linearGradient>
          <linearGradient id={`${id}b`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#ffb3c7" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id={`${id}c`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#e86a9a" />
            <stop offset="1" stopColor="#ffd9e6" />
          </linearGradient>
        </defs>
      </svg>
      {petals.map((p, i) => (
        <span
          key={i}
          className="absolute left-0 top-0"
          style={{ width: p.s, height: p.s * 1.4, ["--x0" as string]: `${p.xs[0]}vw`, ["--y0" as string]: `${p.ys[0]}vh`, ["--x1" as string]: `${p.xs[1]}vw`, ["--y1" as string]: `${p.ys[1]}vh`, ["--x2" as string]: `${p.xs[2]}vw`, ["--y2" as string]: `${p.ys[2]}vh`, ["--x3" as string]: `${p.xs[3]}vw`, ["--y3" as string]: `${p.ys[3]}vh`, ["--x4" as string]: `${p.xs[4]}vw`, ["--y4" as string]: `${p.ys[4]}vh`, opacity: 0, animation: `silo-vfx-petal ${p.dur}s cubic-bezier(.45,.05,.55,.95) ${p.delay}s infinite`, filter: "drop-shadow(0 3px 5px rgba(0,0,0,.25))" } as CSSProperties}
        >
          <svg viewBox="-20 -36 40 40" width="100%" height="100%" aria-hidden>
            <path d="M0 0 C 12 -8 20 -24 0 -35 C -20 -24 -12 -8 0 0Z" fill={fills[p.tone]} stroke="#d94b7f" strokeOpacity=".4" strokeWidth=".8" />
            <path d="M0 -2 C 1 -14 1 -22 0 -32" stroke="#d94b7f" strokeOpacity=".35" strokeWidth=".7" fill="none" />
          </svg>
        </span>
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
      {inView && kind === "alice" && <AliceVfx />}
      {inView && kind === "gatsby" && <GatsbyVfx accent={accent} />}
      {inView && kind === "patron" && <PatronVfx accent={accent} />}
      {inView && kind === "lautrec" && <LautrecVfx accent={accent} />}
      {inView && kind === "artist" && <ArtistVfx />}
      {gl && inView && active && <GlVfx kind={kind} accent={accent} color1={color1} color2={color2} imageUrl={imageUrl} imagePos={imagePos} />}
    </div>
  );
}
