"use client";

import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { loadExternalTrailInteraction } from "@tsparticles/interaction-external-trail";
import { useEffect, useMemo, useState } from "react";
import type { ISourceOptions } from "@tsparticles/engine";
import { FEATHERS } from "@/lib/depthShapes";

// HOTFIX-164.1: tsParticles(v3 slim) 기반 파티클 — Silo Angel의 깃털 낙하, Patron의 커서 궤적 황금 가루(Trail).
// 이미지/영상 에셋 없이 SVG data URI와 코드로만 그리며, DepthVfx가 화면에 보일 때만 이 컴포넌트를 마운트한다(엔진은 1회만 초기화).
let enginePromise: Promise<void> | null = null;
const initEngine = () => {
  enginePromise ??= initParticlesEngine(async (engine) => {
    await loadSlim(engine);
    await loadExternalTrailInteraction(engine);
  });
  return enginePromise;
};

function featherDataUri(i: number): { src: string; width: number; height: number } {
  const f = FEATHERS[i % FEATHERS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f.viewBox}"><path d="${f.d}" fill="#fffdf5" fill-opacity=".95"/></svg>`;
  return { src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, width: 100, height: Math.round(100 * f.aspect) };
}

function angelOptions(): ISourceOptions {
  return {
    fullScreen: { enable: false },
    background: { color: "transparent" },
    fpsLimit: 45,
    detectRetina: false,
    particles: {
      number: { value: 16 },
      shape: { type: "image", options: { image: FEATHERS.map((_, i) => featherDataUri(i)) } },
      size: { value: { min: 16, max: 40 } },
      opacity: { value: { min: 0.55, max: 0.95 } },
      rotate: { value: { min: 0, max: 360 }, direction: "random", animation: { enable: true, speed: 5, sync: false } },
      wobble: { enable: true, distance: 24, speed: { min: -4, max: 4 } },
      move: { enable: true, direction: "bottom", speed: { min: 0.5, max: 1.3 }, straight: false, drift: { min: -1.2, max: 1.2 }, outModes: { default: "out" } },
    },
  };
}

function patronOptions(accent: string): ISourceOptions {
  return {
    fullScreen: { enable: false },
    background: { color: "transparent" },
    fpsLimit: 60,
    detectRetina: false,
    // 황금빛 마법 가루: 커서가 지나간 자리에 가루가 흩날리며 사라진다(Trail 상호작용).
    interactivity: {
      detectsOn: "window",
      events: { onHover: { enable: true, mode: "trail" } },
      modes: {
        trail: {
          delay: 0.04,
          quantity: 2,
          particles: {
            color: { value: ["#ffd76a", "#fff1b8", accent] },
            shape: { type: "star" },
            size: { value: { min: 1.5, max: 5 } },
            opacity: { value: 1, animation: { enable: true, speed: 1.4, startValue: "max", destroy: "min", sync: false } },
            move: { enable: true, speed: { min: 0.6, max: 2.2 }, direction: "none", random: true, straight: false, outModes: { default: "destroy" } },
          },
        },
      },
    },
    // 바탕에 천천히 떠도는 금빛 먼지
    particles: {
      number: { value: 26 },
      color: { value: ["#ffe08a", "#fff6cf"] },
      shape: { type: "circle" },
      size: { value: { min: 0.8, max: 2.6 } },
      opacity: { value: { min: 0.15, max: 0.7 }, animation: { enable: true, speed: 0.6, sync: false } },
      move: { enable: true, direction: "top", speed: { min: 0.1, max: 0.5 }, random: true, straight: false, outModes: { default: "out" } },
    },
  };
}

export default function TsParticlesLayer({ kind, accent }: { kind: "angel" | "patron"; accent: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    initEngine().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const options = useMemo(() => (kind === "angel" ? angelOptions() : patronOptions(accent)), [kind, accent]);
  if (!ready) return null;
  return <Particles id={`silo-ts-${kind}`} className="absolute inset-0" style={{ position: "absolute", inset: 0 }} options={options} />;
}
