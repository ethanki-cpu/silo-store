"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { CustomEffect, DepthEffect, EffectConfig, EffectMotion } from "@/lib/membershipContentDefaults";
import { FEATHERS, STAR_VARIANTS } from "@/lib/depthShapes";

// EPIC-163.5 / HOTFIX-163.14: 깊이(Depth)마다 화면 전체에 깔리는 분위기 효과 — 내장(별/깃털/반딧불/기포/불씨/먼지/꽃잎) + 운영자가 올린 이미지 효과.
// 모든 효과는 같은 "입자 겹" 모델: 개수·크기·속도·모션·반짝임·glow·불투명도를 겹마다 따로 설정한다(비우면 그 효과의 기본값).
// 위치/속도는 시드 기반 의사난수라 서버/클라이언트가 같고, 애니메이션은 CSS transform/opacity만 써서 가볍다.
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
@keyframes silo-fx-twinkle{0%,100%{opacity:var(--tw-min,.15);transform:scale(.7)}50%{opacity:1;transform:scale(1.2)}}
@keyframes silo-fx-fall{0%{transform:translate3d(0,-12vh,0) rotate(0deg)}25%{transform:translate3d(var(--sway),22vh,0) rotate(60deg)}50%{transform:translate3d(calc(var(--sway) * -1),50vh,0) rotate(150deg)}75%{transform:translate3d(var(--sway),78vh,0) rotate(230deg)}100%{transform:translate3d(0,112vh,0) rotate(320deg)}}
@keyframes silo-fx-float{0%{transform:translate3d(0,-14vh,0) rotate(-18deg)}20%{transform:translate3d(var(--sway),18vh,0) rotate(16deg)}40%{transform:translate3d(calc(var(--sway) * -.8),42vh,0) rotate(-14deg)}60%{transform:translate3d(calc(var(--sway) * .9),66vh,0) rotate(20deg)}80%{transform:translate3d(calc(var(--sway) * -.5),90vh,0) rotate(-12deg)}100%{transform:translate3d(0,114vh,0) rotate(10deg)}}
@keyframes silo-fx-rise{0%{transform:translate3d(0,112vh,0);opacity:0}10%{opacity:.9}80%{opacity:.7}100%{transform:translate3d(var(--sway),-12vh,0);opacity:0}}
@keyframes silo-fx-wander{0%,100%{transform:translate3d(0,0,0)}25%{transform:translate3d(var(--sway),-30px,0)}50%{transform:translate3d(calc(var(--sway) * -.6),-8px,0)}75%{transform:translate3d(calc(var(--sway) * .5),24px,0)}}
`;

type Shape = "star" | "feather" | "dot" | "bubble" | "petal" | "image";
type Motion = Exclude<EffectMotion, "default">;
type Layer = {
  key: string;
  shape: Shape;
  count: number;
  sizeMin: number;
  sizeMax: number;
  dur: [number, number];
  motion: Motion;
  twinkle: number;
  glow: number;
  opacity: number;
  images?: string[];
};
type Base = Omit<Layer, "key" | "images">;

// 내장 효과의 기본값
const BASE: Record<DepthEffect, Base> = {
  stars: { shape: "star", count: 30, sizeMin: 6, sizeMax: 16, dur: [2.2, 5], motion: "static", twinkle: 100, glow: 6, opacity: 100 },
  feathers: { shape: "feather", count: 18, sizeMin: 30, sizeMax: 70, dur: [16, 30], motion: "float", twinkle: 0, glow: 0, opacity: 92 },
  fireflies: { shape: "dot", count: 24, sizeMin: 4, sizeMax: 9, dur: [6, 12], motion: "wander", twinkle: 70, glow: 14, opacity: 100 },
  bubbles: { shape: "bubble", count: 22, sizeMin: 8, sizeMax: 30, dur: [9, 18], motion: "rise", twinkle: 0, glow: 0, opacity: 100 },
  embers: { shape: "dot", count: 30, sizeMin: 3, sizeMax: 7, dur: [6, 13], motion: "rise", twinkle: 40, glow: 10, opacity: 100 },
  dust: { shape: "dot", count: 46, sizeMin: 2, sizeMax: 5, dur: [8, 16], motion: "wander", twinkle: 50, glow: 2, opacity: 60 },
  petals: { shape: "petal", count: 16, sizeMin: 12, sizeMax: 26, dur: [12, 22], motion: "fall", twinkle: 0, glow: 0, opacity: 85 },
};
// 편집기가 슬라이더 기본값으로 보여주려고 내보낸다.
export const EFFECT_DEFAULTS = BASE;
export const CUSTOM_EFFECT_DEFAULTS = { count: 14, motion: "float" as EffectMotion, twinkle: 0, glow: 0, opacity: 95 };
const CUSTOM_BASE: Base = { shape: "image", count: 14, sizeMin: 30, sizeMax: 70, dur: [14, 26], motion: "float", twinkle: 0, glow: 0, opacity: 95 };

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function layerFrom(key: string, base: Base, cfg: EffectConfig | undefined, images?: string[]): Layer {
  const size = num(cfg?.size, 100) / 100;
  const speed = Math.max(10, num(cfg?.speed, 100)) / 100;
  const motion: Motion = cfg?.motion && cfg.motion !== "default" ? cfg.motion : base.motion;
  return {
    key,
    shape: base.shape,
    count: Math.max(0, Math.min(80, Math.round(num(cfg?.count, base.count)))),
    sizeMin: base.sizeMin * size,
    sizeMax: base.sizeMax * size,
    dur: [base.dur[0] / speed, base.dur[1] / speed],
    motion,
    twinkle: Math.max(0, Math.min(100, num(cfg?.twinkle, base.twinkle))),
    glow: Math.max(0, Math.min(40, num(cfg?.glow, base.glow))),
    opacity: Math.max(0, Math.min(100, num(cfg?.opacity, base.opacity))),
    images,
  };
}

function FeatherSvg({ index, color }: { index: number; color: string }) {
  const f = FEATHERS[index % FEATHERS.length];
  return (
    <svg viewBox={f.viewBox} className="h-full w-full" aria-hidden>
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

const ANIM: Record<Exclude<Motion, "static">, string> = { fall: "silo-fx-fall", float: "silo-fx-float", rise: "silo-fx-rise", wander: "silo-fx-wander" };

function LayerView({ layer, accent, seed }: { layer: Layer; accent: string; seed: number }) {
  const items = useMemo(() => {
    const r = rng(seed * 131 + layer.key.length * 17 + layer.key.charCodeAt(layer.key.length - 1));
    return Array.from({ length: layer.count }, () => ({
      left: r() * 100,
      top: r() * 100,
      size: layer.sizeMin + r() * Math.max(0, layer.sizeMax - layer.sizeMin),
      dur: layer.dur[0] + r() * Math.max(0, layer.dur[1] - layer.dur[0]),
      delay: -r() * layer.dur[1],
      sway: (r() * 2 - 1) * 90,
      rot: r() * 360,
      pick: Math.floor(r() * 1000),
      tw: 2 + r() * 3,
    }));
  }, [layer, seed]);

  const moving = layer.motion === "fall" || layer.motion === "float" || layer.motion === "rise";
  const twMin = 1 - (layer.twinkle / 100) * 0.9;
  const hasImages = !!layer.images?.length;

  return (
    <>
      {items.map((p, i) => {
        const featherIdx = p.pick % FEATHERS.length;
        let width = p.size;
        let height = p.size;
        if (layer.shape === "feather" && !hasImages) height = p.size * FEATHERS[featherIdx].aspect;
        if (layer.shape === "star") {
          width = i % 3 === 2 ? p.size * 1.6 : p.size;
          height = p.size * (i % 3 === 2 ? 1.6 : 1.7);
        }
        if (layer.shape === "petal") height = p.size * 1.4;

        const outer: CSSProperties = {
          position: "absolute",
          left: `${p.left}%`,
          top: moving ? 0 : `${p.top}%`,
          width,
          height,
          opacity: layer.opacity / 100,
          ["--sway" as string]: `${p.sway}px`,
          animation: layer.motion === "static" ? undefined : `${ANIM[layer.motion]} ${p.dur}s ${layer.motion === "rise" ? "ease-in" : layer.motion === "wander" ? "ease-in-out" : "linear"} ${p.delay}s infinite`,
        };
        const inner: CSSProperties = {
          width: "100%",
          height: "100%",
          color: accent,
          filter: layer.glow > 0 ? `drop-shadow(0 0 ${layer.glow}px ${accent})` : undefined,
          ["--tw-min" as string]: String(twMin),
          animation: layer.twinkle > 0 ? `silo-fx-twinkle ${p.tw}s ease-in-out ${p.delay}s infinite` : undefined,
          transform: layer.shape === "feather" || layer.shape === "image" ? `rotate(${(p.rot % 60) - 30}deg)` : undefined,
        };

        let content: ReactNode = null;
        if (layer.shape === "star") content = <StarSvg variant={i % 3} />;
        else if ((layer.shape === "feather" || layer.shape === "image") && hasImages) {
          // eslint-disable-next-line @next/next/no-img-element
          content = <img src={layer.images![p.pick % layer.images!.length]} alt="" className="h-full w-full object-contain" />;
        } else if (layer.shape === "feather") content = <FeatherSvg index={featherIdx} color="#fffdf5" />;
        else if (layer.shape === "bubble") content = <span className="block h-full w-full rounded-full border" style={{ borderColor: `${accent}cc`, background: `radial-gradient(circle at 30% 30%, #ffffffaa, ${accent}22)` }} />;
        else if (layer.shape === "petal") content = <span className="block h-full w-full" style={{ borderRadius: "80% 0 80% 0", background: `linear-gradient(135deg, ${accent}, #ffffff99)` }} />;
        else if (layer.shape === "dot") content = <span className="block h-full w-full rounded-full" style={{ background: accent }} />;

        return (
          <span key={`${layer.key}-${i}`} style={outer}>
            <span className="block" style={inner}>
              {content}
            </span>
          </span>
        );
      })}
    </>
  );
}

export function DepthEffects({
  effects,
  effectImages,
  effectConfig,
  customEffects,
  accent,
  seed,
}: {
  effects: DepthEffect[];
  effectImages: string[];
  effectConfig?: Partial<Record<DepthEffect, EffectConfig>>;
  customEffects?: CustomEffect[];
  accent: string;
  seed: number;
}) {
  const layers: Layer[] = [
    ...effects.map((e) => layerFrom(e, BASE[e], effectConfig?.[e], e === "feathers" ? effectImages : undefined)),
    ...(customEffects ?? [])
      .filter((c) => c.images.filter(Boolean).length > 0)
      .map((c) => layerFrom(`custom-${c.id}`, CUSTOM_BASE, c, c.images.filter(Boolean))),
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{KEYFRAMES}</style>
      {layers.map((l) => (
        <LayerView key={l.key} layer={l} accent={accent} seed={seed} />
      ))}
    </div>
  );
}
