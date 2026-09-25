"use client";

import { useMemo, type CSSProperties } from "react";
import type { DepthEffect } from "@/lib/membershipContentDefaults";
import { FEATHERS, STAR_VARIANTS } from "@/lib/depthShapes";

// EPIC-163.5: 깊이(Depth)마다 화면 전체에 깔리는 분위기 효과 — 별/깃털/반딧불/기포/불씨/먼지/꽃잎.
// 위치·속도는 시드 기반 의사난수라 서버/클라이언트 렌더가 항상 같다(하이드레이션 안전). 애니메이션은 전부 CSS(transform/opacity)만 써서 가볍다.
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

const KEYFRAMES = `
@keyframes silo-fx-twinkle{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.25)}}
@keyframes silo-fx-fall{0%{transform:translate3d(0,-12vh,0) rotate(0deg)}25%{transform:translate3d(var(--sway),22vh,0) rotate(60deg)}50%{transform:translate3d(calc(var(--sway) * -1),50vh,0) rotate(150deg)}75%{transform:translate3d(var(--sway),78vh,0) rotate(230deg)}100%{transform:translate3d(0,112vh,0) rotate(320deg)}}
@keyframes silo-fx-float{0%{transform:translate3d(0,-14vh,0) rotate(-18deg)}20%{transform:translate3d(var(--sway),18vh,0) rotate(16deg)}40%{transform:translate3d(calc(var(--sway) * -.8),42vh,0) rotate(-14deg)}60%{transform:translate3d(calc(var(--sway) * .9),66vh,0) rotate(20deg)}80%{transform:translate3d(calc(var(--sway) * -.5),90vh,0) rotate(-12deg)}100%{transform:translate3d(0,114vh,0) rotate(10deg)}}
@keyframes silo-fx-rise{0%{transform:translate3d(0,112vh,0);opacity:0}10%{opacity:.9}80%{opacity:.7}100%{transform:translate3d(var(--sway),-12vh,0);opacity:0}}
@keyframes silo-fx-wander{0%,100%{transform:translate3d(0,0,0);opacity:.2}25%{transform:translate3d(var(--sway),-30px,0);opacity:1}50%{transform:translate3d(calc(var(--sway) * -.6),-8px,0);opacity:.35}75%{transform:translate3d(calc(var(--sway) * .5),24px,0);opacity:1}}
`;

type Particle = { left: number; top: number; size: number; dur: number; delay: number; sway: number; rot: number; img: number };

function makeParticles(count: number, seed: number, sizeMin: number, sizeMax: number, durMin: number, durMax: number, imgCount = 1): Particle[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({
    left: r() * 100,
    top: r() * 100,
    size: sizeMin + r() * (sizeMax - sizeMin),
    dur: durMin + r() * (durMax - durMin),
    delay: -r() * durMax,
    sway: (r() * 2 - 1) * 90,
    rot: r() * 360,
    img: Math.floor(r() * imgCount),
  }));
}

function FeatherSvg({ index, color }: { index: number; color: string }) {
  const f = FEATHERS[index % FEATHERS.length];
  return (
    <svg viewBox={f.viewBox} className="h-full w-full" aria-hidden style={{ filter: "drop-shadow(0 2px 6px rgba(120,100,40,.35))" }}>
      <path d={f.d} fill={color} fillOpacity=".95" />
    </svg>
  );
}

function StarSvg({ variant }: { variant: number }) {
  const v = STAR_VARIANTS[variant % STAR_VARIANTS.length];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill="currentColor" aria-hidden>
      <path d={v.d} />
      {v.extra && <path d={v.extra} />}
    </svg>
  );
}

export function DepthEffects({ effects, effectImages, accent, seed }: { effects: DepthEffect[]; effectImages: string[]; accent: string; seed: number }) {
  const has = (e: DepthEffect) => effects.includes(e);
  const stars = useMemo(() => makeParticles(30, seed * 7 + 1, 6, 16, 2.2, 5), [seed]);
  const feathers = useMemo(() => makeParticles(18, seed * 7 + 2, 30, 70, 16, 30, Math.max(1, effectImages.length)), [seed, effectImages.length]);
  const fireflies = useMemo(() => makeParticles(24, seed * 7 + 3, 4, 9, 6, 12), [seed]);
  const bubbles = useMemo(() => makeParticles(22, seed * 7 + 4, 8, 30, 9, 18), [seed]);
  const embers = useMemo(() => makeParticles(30, seed * 7 + 5, 3, 7, 6, 13), [seed]);
  const dust = useMemo(() => makeParticles(46, seed * 7 + 6, 2, 5, 8, 16), [seed]);
  const petals = useMemo(() => makeParticles(16, seed * 7 + 7, 12, 26, 12, 22), [seed]);

  const abs = (p: Particle): CSSProperties => ({ position: "absolute", left: `${p.left}%`, top: 0, ["--sway" as string]: `${p.sway}px` });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{KEYFRAMES}</style>

      {has("stars") &&
        stars.map((p, i) => (
          <span
            key={`s${i}`}
            className="absolute"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size * (i % 3 === 2 ? 1.6 : 1), height: p.size * (i % 3 === 2 ? 1.6 : 1.7), color: accent, animation: `silo-fx-twinkle ${p.dur}s ease-in-out ${p.delay}s infinite`, filter: `drop-shadow(0 0 6px ${accent})` }}
          >
            <StarSvg variant={i % 3} />
          </span>
        ))}

      {has("feathers") &&
        feathers.map((p, i) => (
          <span key={`f${i}`} style={{ ...abs(p), width: p.size, height: p.size * (effectImages.length ? 1 : FEATHERS[i % FEATHERS.length].aspect), animation: `silo-fx-float ${p.dur}s linear ${p.delay}s infinite` }}>
            <span className="block h-full w-full" style={{ transform: `rotate(${(p.rot % 60) - 30}deg)`, opacity: 0.92 }}>
              {effectImages.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={effectImages[p.img % effectImages.length]} alt="" className="h-full w-full object-contain" />
              ) : (
                <FeatherSvg index={i} color="#fffdf5" />
              )}
            </span>
          </span>
        ))}

      {has("fireflies") &&
        fireflies.map((p, i) => (
          <span
            key={`w${i}`}
            className="absolute rounded-full"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, background: accent, boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${accent}88`, ["--sway" as string]: `${p.sway}px`, animation: `silo-fx-wander ${p.dur}s ease-in-out ${p.delay}s infinite` }}
          />
        ))}

      {has("bubbles") &&
        bubbles.map((p, i) => (
          <span
            key={`b${i}`}
            className="absolute rounded-full border"
            style={{ ...abs(p), width: p.size, height: p.size, borderColor: `${accent}cc`, background: `radial-gradient(circle at 30% 30%, #ffffffaa, ${accent}22)`, animation: `silo-fx-rise ${p.dur}s ease-in ${p.delay}s infinite` }}
          />
        ))}

      {has("embers") &&
        embers.map((p, i) => (
          <span
            key={`e${i}`}
            className="absolute rounded-full"
            style={{ ...abs(p), width: p.size, height: p.size, background: accent, boxShadow: `0 0 ${p.size * 2.5}px ${accent}`, animation: `silo-fx-rise ${p.dur}s ease-out ${p.delay}s infinite` }}
          />
        ))}

      {has("dust") &&
        dust.map((p, i) => (
          <span
            key={`d${i}`}
            className="absolute rounded-full"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, background: accent, opacity: 0.6, ["--sway" as string]: `${p.sway * 0.6}px`, animation: `silo-fx-wander ${p.dur}s ease-in-out ${p.delay}s infinite` }}
          />
        ))}

      {has("petals") &&
        petals.map((p, i) => (
          <span
            key={`p${i}`}
            className="absolute"
            style={{ ...abs(p), width: p.size, height: p.size * 1.4, borderRadius: "80% 0 80% 0", background: `linear-gradient(135deg, ${accent}, #ffffff99)`, opacity: 0.85, animation: `silo-fx-fall ${p.dur}s linear ${p.delay}s infinite` }}
          />
        ))}
    </div>
  );
}
