"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useWidgetPreview } from "@/lib/widgetPreviewContext";
import { DepthArt } from "@/components/membership/DepthArt";
import { DepthEffects } from "@/components/membership/DepthEffects";
import { DepthVfx, VFX_BY_INDEX } from "@/components/membership/DepthVfx";
import { DepthVideoLayer } from "@/components/membership/DepthVideoLayer";

// HOTFIX-164.4: Artist 배경 물결 왜곡 — 물방울/마우스/스크롤이 파동을 일으키면 feDisplacementMap 세기가 튀었다가 감쇠한다(구간이 끝나면 필터 해제).
function useWaterDistort(ref: React.RefObject<HTMLDivElement | null>, mapRef: React.RefObject<SVGFEDisplacementMapElement | null>, turbRef: React.RefObject<SVGFETurbulenceElement | null>, filterId: string, on: boolean) {
  useEffect(() => {
    if (!on) return;
    const node = ref.current;
    let power = 0;
    let raf = 0;
    let last = performance.now();
    let nextDrop = performance.now() + 900;
    let lastMove = 0;
    let lastY = window.scrollY;
    const kick = (v: number) => {
      power = Math.min(34, power + v);
    };
    const onMove = () => {
      const t = performance.now();
      if (t - lastMove > 260) {
        lastMove = t;
        kick(9);
      }
    };
    const onScroll = () => {
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      if (dy > 10) kick(Math.min(16, 4 + dy / 20));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    const tick = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      if (t >= nextDrop) {
        kick(22);
        nextDrop = t + 3200 + Math.random() * 2200;
      }
      power *= Math.pow(0.9, dt / 16);
      const el = ref.current;
      if (el) el.style.filter = power > 0.6 ? `url(#${filterId})` : "none";
      if (power > 0.6) {
        mapRef.current?.setAttribute("scale", power.toFixed(1));
        const f = 0.006 + 0.004 * Math.sin(t / 900);
        turbRef.current?.setAttribute("baseFrequency", `${f.toFixed(4)} ${(f * 1.5).toFixed(4)}`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (node) node.style.filter = "none";
    };
  }, [ref, mapRef, turbRef, filterId, on]);
}
import { DEPTH_FONTS, type DepthScene } from "@/lib/membershipContentDefaults";

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

// HOTFIX-165.2(사용자 신고 — "화면을 꽉 채우기인데 왜 이미지의 위아래가 잘리냐"): 가로로 긴 화면에 세로로 긴 그림을 꽉 채우면(cover) 위아래는 반드시 잘린다.
// 그래서 기본을 "pan"으로 — 가로를 화면에 딱 맞추고(빈 여백 없음), 그림이 화면보다 세로로 길면 위→아래로 천천히 훑어 그림 전체가 한 번씩 다 보이게 한다(잘라 버리지 않는다).
//  · cover = 화면 가득(넘치는 부분은 잘림, 초점 드래그) · contain = 전체가 보이되 남는 자리는 흐린 같은 그림 · stretch = 비율 무시하고 늘려 채움(그림이 찌그러짐)
export type BackdropFit = "pan" | "cover" | "contain" | "stretch";
export function BackdropImage({ url, fit, pos, zoom, play = true }: { url: string; fit: BackdropFit; pos: string | undefined; zoom: number | undefined; play?: boolean }) {
  const [px, py] = parsePos(pos);
  const z = Math.min(250, Math.max(100, zoom ?? 100)) / 100;
  if (fit === "pan") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ containerType: "size", transform: `scale(${z})`, transformOrigin: `${px}% ${py}%` }}>
        <style>{`@keyframes silo-bd-pan{0%,8%{transform:translateY(0)}100%{transform:translateY(calc(-100% + 100cqh))}}`}</style>
        {/* HOTFIX-166.2(사용자 지시 — 위에서 아래로 이미지가 보이게): 위에서 시작해 아래까지 한 번 훑고 끝에서 멈춘다. 깊이가 화면의 주인공이 될 때마다 처음(위)부터 다시 재생. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={play ? "on" : "off"} src={url} alt="" draggable={false} className="absolute left-0 top-0 w-full" style={{ height: "auto", minHeight: "100cqh", objectFit: "cover", objectPosition: `${px}% ${py}%`, animation: "silo-bd-pan 16s ease-in-out 1 both", animationPlayState: play ? "running" : "paused" }} />
      </div>
    );
  }
  return (
    <>
      {fit === "contain" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-2xl" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        className={`pointer-events-none absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : fit === "stretch" ? "object-fill" : "object-contain"}`}
        style={{ objectPosition: `${px}% ${py}%`, transform: `scale(${z})`, transformOrigin: `${px}% ${py}%` }}
      />
    </>
  );
}

// 이미지·색·스프라이트까지의 "배경 레이어 묶음" — 실제 스크롤 무대와 정적(미리보기) 카드가 공유한다.
function SceneBackdrop({ scene, index, active = true }: { scene: DepthScene; index: number; active?: boolean }) {
  const { c1, c2, accent, hasImage } = resolveTheme(scene, index);
  const fit: BackdropFit = scene.imageFit ?? "pan";
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }} />
      {hasImage && <BackdropImage url={scene.imageUrl as string} fit={fit} pos={scene.imagePos} zoom={scene.imageZoom} play={active} />}
      {/* 깊이의 색 정체성 — 이미지 위에 색을 얇게 덮어 글씨가 읽히고 깊이마다 색이 분명해지게 */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${c1}${hasImage ? "30" : "00"} 0%, transparent 40%, ${c2}${hasImage ? "40" : "00"} 100%)` }} />
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

// 문 크기 기본값 — 사용자가 화면(740×911)에서 원한 "줄인 문"(높이 ≈ 화면의 58%, 폭 ≈ 높이의 52%)과 비슷하게, 6개 깊이 모두 같은 크기.
export const DEFAULT_DOOR_HEIGHT_PCT = 58;
export const DEFAULT_DOOR_WIDTH_PCT = 52;

// variant "preview" = 관리자 편집기 미리보기: vp(가상 화면 크기, px)를 기준으로 실제 출력과 똑같은 규칙(반응형 폭, 3:5 안팎 비율, 블러, 글자 맞춤)을 계산한다.
export function ArchText({ scene, index, variant = "stage", vp }: { scene: DepthScene; index: number; variant?: "stage" | "card" | "preview"; vp?: { w: number; h: number } }) {
  const { accent, dark } = resolveTheme(scene, index);
  const hasImage = !!scene.imageUrl;
  const hasSprites = (scene.sprites ?? []).some((s) => s.url);
  const color = dark ? "#fdfbf7" : "#2b2740";
  const hPct = Math.min(98, Math.max(30, scene.doorHeightPct ?? DEFAULT_DOOR_HEIGHT_PCT));
  const wPct = Math.min(140, Math.max(30, scene.doorWidthPct ?? DEFAULT_DOOR_WIDTH_PCT));
  // EPIC-164 Phase 2: 프로스티드 글래스 — 기본 blur(24px) brightness(0.6).
  const blur = Math.min(40, Math.max(0, scene.doorBlurPx ?? 24));
  const darkPct = Math.min(90, Math.max(0, scene.doorDarkPct ?? 24));
  // 무대(stage)의 문 크기는 반응형 규칙(.silo-door: 모바일 85% / 태블릿 50% / PC 30%)이 정하고, 관리자 미리보기 카드만 저장된 크기를 쓴다.
  const stage = variant === "stage" && !(scene.doorHeightPct != null || scene.doorWidthPct != null);
  // HOTFIX-165.2(사용자 신고 — "아치문 크기 설정이 사라졌다"): 편집기에서 문 높이/폭을 정한 깊이(doorHeightPct·doorWidthPct 저장됨)는 그 값을 그대로 쓴다 —
  // 높이 = 화면 높이의 hPct%, 폭 = 문 높이의 wPct%(화면 폭의 92% 상한). 정하지 않은 깊이는 창 폭에 따른 자동 크기(.silo-door).
  const custom = scene.doorHeightPct != null || scene.doorWidthPct != null;
  let heightCss = `${Math.round(hPct * 5.85)}px`;
  let widthCss = `${Math.round(hPct * 5.85 * (wPct / 100))}px`;
  const customStage = variant === "stage" && custom; // 크기는 .silo-door-custom(CSS 변수 --dh/--wp)이 정한다 — 모바일에서는 자동으로 줄어든다
  if (variant === "preview" && vp) {
    if (custom) {
      const h = (vp.h * hPct) / 100;
      widthCss = `${Math.round(Math.min(vp.w * 0.92, h * (wPct / 100)))}px`;
      heightCss = `${Math.round(h)}px`;
    } else {
      const w = vp.w >= 1024 ? Math.min(440, Math.max(300, vp.w * 0.26)) : vp.w >= 640 ? Math.min(400, vp.w * 0.46) : Math.min(360, vp.w * 0.86);
      widthCss = `${Math.round(w)}px`;
      heightCss = `${Math.round(Math.min(vp.h * 0.64, w * 1.5))}px`;
    }
  }
  const fontStack = (DEPTH_FONTS[scene.fontFamily ?? ""] ?? DEPTH_FONTS.myeongjo).stack;
  const manualSize = scene.fontSizePx && scene.fontSizePx > 0 ? Math.min(60, Math.max(4, scene.fontSizePx)) : null;
  const manualTitle = scene.titleSizePx && scene.titleSizePx > 0 ? Math.min(60, Math.max(4, scene.titleSizePx)) : null;
  // 배율(%): 100 = 지금 크기 그대로. 하한을 두지 않아(4px까지) 얼마든지 작게 줄일 수 있다.
  const fontScale = Math.min(300, Math.max(20, scene.fontScalePct ?? 100)) / 100;
  const titleScale = Math.min(300, Math.max(20, scene.titleScalePct ?? 100)) / 100;

  // HOTFIX-163.13(사용자 신고 — 문을 줄였더니 글자가 한 글자씩 세로로 늘어짐): 문 크기가 어떻게 바뀌어도 글이 문 안에 들어오도록,
  // 실제 문 크기를 재서 글자 크기와 안쪽 여백을 정한다(글이 길면 글자가 작아짐). % 패딩은 부모 폭 기준이라 쓰지 않는다.
  const doorRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ fs: 15, padX: 20, padTop: 44, padBottom: 28 });
  const text = scene.text ?? "";
  useEffect(() => {
    const el = doorRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 40 || h < 40) return;
      const lines = text.split(String.fromCharCode(10));
      const chars = Math.max(16, text.length - (lines.length - 1) + (lines.length - 1) * 8);
      const padX = Math.round(w * 0.1);
      const padTop = Math.round(Math.min(h * 0.2, w * 0.45));
      const padBottom = Math.round(h * 0.07);
      const usableW = w - padX * 2;
      const usableH = h - padTop - padBottom - 34; // 제목 한 줄 몫
      const size = Math.sqrt((usableW * Math.max(40, usableH)) / (chars * 1.85));
      setFit({ fs: Math.max(6, Math.min(22, Math.floor(size))), padX, padTop, padBottom });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={doorRef}
      className={`relative flex flex-col items-center justify-center overflow-hidden border-2 text-center${stage ? " silo-door" : ""}${customStage ? " silo-door-custom" : ""}`}
      style={{
        ...(stage ? {} : customStage ? ({ ["--dh" as string]: `${hPct}vh`, ["--wp" as string]: String(wPct / 100) } as React.CSSProperties) : { height: heightCss, width: widthCss, maxWidth: variant === "preview" ? undefined : "92%" }),
        borderRadius: DOOR_RADIUS,
        borderColor: `${accent}cc`,
        background: dark || hasImage ? `rgba(10,10,20,${darkPct / 100})` : "rgba(255,255,255,0.5)",
        backdropFilter: `blur(${blur}px) brightness(0.6)`,
        WebkitBackdropFilter: `blur(${blur}px) brightness(0.6)`,
        boxShadow: `0 0 70px ${accent}55, inset 0 0 44px ${accent}22`,
        color,
        padding: `${fit.padTop}px ${fit.padX}px ${fit.padBottom}px`,
      }}
    >
      <div className="pointer-events-none absolute inset-3" style={{ borderRadius: DOOR_RADIUS, border: `1px solid ${accent}77` }} />
      {!hasImage && !hasSprites && (
        <div className="mx-auto mb-3 h-16 w-16 shrink-0" style={{ color }}>
          <DepthArt index={index} accent={accent} />
        </div>
      )}
      <p className="relative w-full whitespace-pre-line font-semibold uppercase tracking-[0.25em] opacity-90" style={{ fontFamily: fontStack, fontSize: Math.max(4, Math.round((manualTitle ?? Math.max(6, (manualSize ?? fit.fs) * 0.62)) * titleScale)), ...(hasImage ? { textShadow: "0 1px 10px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.7)" } : {}) }}>
        {scene.title}
      </p>
      <p
        className="relative mt-3 w-full whitespace-pre-line break-keep font-medium"
        style={{ fontSize: Math.max(4, Math.round((manualSize ?? fit.fs) * fontScale * 10) / 10), lineHeight: 1.75, fontFamily: fontStack, ...(hasImage ? { textShadow: "0 2px 14px rgba(0,0,0,.9), 0 0 4px rgba(0,0,0,.75)" } : {}) }}
      >
        {text}
      </p>
    </div>
  );
}

// 문 패널 반응형 크기(모바일 85% · 태블릿 50% · PC 35%, 너비는 화면 기준)와 3:5 안팎의 비율 — 높이는 화면의 70%를 넘지 않는다.
// HOTFIX-164.4(사용자 신고 — "문이 필요 이상으로 커서 배경 이미지가 안 보여"): 창 폭 1300px에서도 50%로 커지던 문제 — 기준 폭을 1024px로 낮추고 상한(px)을 둔다.
// 모바일 86%(≤360px) · 태블릿 46%(≤400px) · PC 26%(300~440px). 높이는 폭의 1.5배(화면의 64% 이하).
// HOTFIX-166.3(사용자 신고 — "모바일에서 아치문이 너무 크다"): 모바일(<640px)은 폭 74%(≤300px)·높이 화면의 50% 이하로, 직접 정한 크기(.silo-door-custom)도 모바일에서는 높이 50vh를 넘지 않게 줄인다.
const DOOR_CSS = `.silo-door{--dw:min(74vw,300px);width:var(--dw);height:min(50vh,calc(var(--dw) * 1.45))}@media(min-width:640px){.silo-door{--dw:min(46vw,400px);height:min(64vh,calc(var(--dw) * 1.5))}}@media(min-width:1024px){.silo-door{--dw:clamp(300px,26vw,440px)}}.silo-door-custom{height:min(var(--dh),910px);width:min(92vw,calc(min(var(--dh),910px) * var(--wp)))}@media(max-width:639px){.silo-door-custom{height:min(var(--dh),50vh);width:min(80vw,calc(min(var(--dh),50vh) * var(--wp)))}}`;

function Scene({ index, count, progress, scene, near, active }: { index: number; count: number; progress: MotionValue<number>; scene: DepthScene; near: boolean; active: boolean }) {
  const { accent, c1, c2 } = resolveTheme(scene, index);
  // EPIC-164 Phase 3: 등급(깊이 순서)별 하이엔드 VFX — 관리자가 scene.hyperVfx=false로 끌 수 있다.
  const vfxKind = scene.hyperVfx === false ? null : VFX_BY_INDEX[index] ?? null;
  const waterRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const waterId = `silo-water-${index}`;
  useWaterDistort(waterRef, mapRef, turbRef, waterId, vfxKind === "artist" && active && !(scene.vfxOff ?? []).includes("distort"));
  // HOTFIX-164.4: 문 위치는 편집기에서 드래그로 정한 값(기본 화면 가운데) — 미리보기와 같은 좌표계(화면 대비 %).
  const doorX = Math.min(100, Math.max(0, scene.doorX ?? 50));
  const doorY = Math.min(100, Math.max(0, scene.doorY ?? 50));
  const step = 1 / count;
  const center = (index + 0.5) * step;
  // 입력 구간은 0~1로 자르고(framer-motion은 0 미만/1 초과 오프셋을 허용하지 않는다), 첫/마지막 장면은 바깥쪽 끝에서 사라지지 않게 한다.
  const cl = (v: number) => Math.min(1, Math.max(0, v));
  const first = index === 0;
  const last = index === count - 1;
  // HOTFIX-164.1 카메라 워킹: 깊이가 다가올 땐 멀리서(0.55) 다가오고, 지나갈 땐 문 안으로 파고들듯(2.2) 확대된다. 문 패널은 배경보다 더 빨리 다가와 시차(패럴랙스)를 만든다.
  const scale = useTransform(progress, [cl(center - step), cl(center), cl(center + step)], [first ? 1 : 0.55, 1, last ? 1 : 2.2]);
  const panelScale = useTransform(progress, [cl(center - step * 0.8), cl(center), cl(center + step * 0.8)], [first ? 1 : 0.78, 1, last ? 1 : 1.5]);
  const opacity = useTransform(progress, [cl(center - step), cl(center - step * 0.35), cl(center + step * 0.3), cl(center + step)], [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const textY = useTransform(progress, [cl(center - step * 0.5), cl(center), cl(center + step * 0.5)], [first ? 0 : 50, 0, last ? 0 : -50]);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ opacity, scale }}>
      {vfxKind === "artist" && (
        <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
          <filter id={waterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap ref={mapRef} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      <div ref={waterRef} className="absolute inset-0">
        <SceneBackdrop scene={scene} index={index} active={active} />
      </div>
      {near && (scene.videos ?? []).length > 0 && <DepthVideoLayer videos={scene.videos ?? []} />}
      {near && vfxKind && <DepthVfx kind={vfxKind} accent={accent} color1={c1} color2={c2} imageUrl={scene.imageUrl} imagePos={scene.imagePos} active={active} off={scene.vfxOff ?? []} cardFaces={scene.cardFaces ?? []} />}
      {near && <DepthEffects effects={scene.effects ?? []} effectImages={(scene.effectImages ?? []).filter(Boolean)} effectConfig={scene.effectConfig} customEffects={scene.customEffects} accent={accent} seed={index + 1} />}
      <motion.div className="pointer-events-none absolute inset-0 z-10" style={{ y: textY }}>
        <style>{DOOR_CSS}</style>
        <motion.div className="absolute" style={{ left: `${doorX}%`, top: `${doorY}%`, x: "-50%", y: "-50%", scale: panelScale }}>
          {/* HOTFIX-166.3(사용자 지시 — 배경 이미지가 먼저 보이고 그다음에 아치문이 등장): 깊이가 화면의 주인공이 되면 배경을 먼저 보여주고 1초 뒤에 문이 떠오른다. 떠나면 바로 사라진다. */}
          <motion.div initial={false} animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }} transition={active ? { duration: 0.9, delay: 1.0, ease: [0.16, 1, 0.3, 1] } : { duration: 0.3 }}>
            <ArchText scene={scene} index={index} />
          </motion.div>
        </motion.div>
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
  // HOTFIX-167.2(사용자 신고 — "Silo Angel 문구가 아래 depth로 갔다가 올라오니 사라졌다"): 첫 깊이로 돌아오면 스크롤 위치가 섹션 맨 위와 소수점 단위로 어긋나 mode가 "before"로 판정돼
  // active(문 등장·WebGL·버튼)가 꺼졌다(마지막 깊이의 "after"도 같은 위험). 화면 대부분을 섹션이 덮고 있으면 inSection=true로 따로 판정해 active/버튼에 쓴다.
  const [inSection, setInSection] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const dot = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActiveIdx(Math.min(Math.max(0, scenes.length - 1), Math.floor(v * scenes.length))));

  const snapKey = scenes.length;
  const navRef = useRef<{ go: (i: number) => void; step: (dir: 1 | -1) => void } | null>(null);
  // HOTFIX-164.5(사용자 신고 — "스크롤 한 번에 depth 1에서 6으로 가버린다, 2번 굴리면 다음 depth여야 한다"):
  // Lenis 보간은 트랙패드/휠의 큰 이동량을 그대로 이어받아 여러 깊이를 한 번에 통과했다. 고정 구간에서는 스크롤을 "한 칸씩" 넘기는 방식으로 바꾼다:
  //  · 휠/키보드(↓ PageDown Space ↑ PageUp)/터치 스와이프 한 번 = 정확히 한 깊이 이동(GSAP ScrollToPlugin 트윈 1.05초),
  //  · 이동 중과 직후 0.45초는 남은 관성 입력을 전부 무시(트랙패드 관성이 다음 칸까지 밀고 가지 못하게),
  //  · 첫 깊이에서 위로 / 마지막 깊이에서 아래로는 막지 않아 페이지의 앞뒤 내용으로 자연스럽게 빠져나간다,
  //  · 스크롤바를 끌어 애매한 곳에 두면 멈춘 뒤 가장 가까운 깊이로 붙는다.
  // 진행도/고정 상태는 ScrollTrigger·scroll 이벤트가 그대로 계산한다(body가 overflow-x:hidden이라 CSS sticky 대신 fixed/absolute 전환).
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || preview) return;
    const n = snapKey;
    const points = Array.from({ length: n }, (_, i) => (i === 0 ? 0 : i === n - 1 ? 1 : (i + 0.5) / n));
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    const geom = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = Math.max(1, rect.height - vh);
      return { rect, vh, total, top: window.scrollY + rect.top };
    };
    const update = () => {
      const { rect, vh, total } = geom();
      scrollYProgress.set(Math.min(1, Math.max(0, -rect.top / total)));
      setMode(rect.top > 0 ? "before" : rect.bottom <= vh ? "after" : "pinned");
      setInSection(rect.top < vh * 0.4 && rect.bottom > vh * 0.6);
    };
    const inside = () => {
      const { rect, vh } = geom();
      return rect.top <= 1 && rect.bottom >= vh - 1;
    };
    const nearestIdx = () => {
      const { rect, total } = geom();
      const pr = -rect.top / total;
      let best = 0;
      points.forEach((pt, i) => {
        if (Math.abs(pt - pr) < Math.abs(points[best] - pr)) best = i;
      });
      return best;
    };
    let busy = false;
    let quietUntil = 0;
    const goTo = (i: number) => {
      const { top, total } = geom();
      busy = true;
      gsap.to(window, {
        duration: 1.05,
        ease: "power3.inOut",
        scrollTo: { y: top + points[i] * total, autoKill: false },
        onComplete: () => {
          busy = false;
          quietUntil = performance.now() + 450;
        },
      });
    };
    // 다음/이전 깊이로 한 칸. 끝에서 바깥으로 나가려는 방향이면 false(=막지 않음).
    const step = (dir: 1 | -1): boolean => {
      const next = nearestIdx() + dir;
      if (next < 0 || next >= n) return false;
      goTo(next);
      return true;
    };
    const locked = () => busy || performance.now() < quietUntil;
    // 화면의 이전/다음/점 버튼이 부르는 이동(스크롤·키보드와 같은 트윈, 이동 중에는 무시)
    navRef.current = {
      go: (i: number) => {
        if (!locked() && i >= 0 && i < n) goTo(i);
      },
      step: (dir: 1 | -1) => {
        if (!locked()) step(dir);
      },
    };

    let acc = 0;
    let lastWheel = 0;
    const onWheel = (e: WheelEvent) => {
      if (!inside()) return;
      const now = performance.now();
      if (locked()) {
        e.preventDefault();
        return;
      }
      if (now - lastWheel > 220) acc = 0;
      lastWheel = now;
      acc += e.deltaY;
      if (Math.abs(acc) < 24) {
        e.preventDefault();
        return;
      }
      const dir: 1 | -1 = acc > 0 ? 1 : -1;
      acc = 0;
      const nextIdx = nearestIdx() + dir;
      if (nextIdx < 0 || nextIdx >= n) return; // 구간 끝 → 기본 스크롤로 빠져나간다
      e.preventDefault();
      step(dir);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!inside()) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      let dir: 1 | -1 | 0 = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) dir = -1;
      if (!dir) return;
      if (locked()) {
        e.preventDefault();
        return;
      }
      const nextIdx = nearestIdx() + dir;
      if (nextIdx < 0 || nextIdx >= n) return;
      e.preventDefault();
      step(dir);
    };
    let touchY = 0;
    let touchStartedInside = false;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
      touchStartedInside = inside();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartedInside || !inside()) return;
      const dy = touchY - (e.touches[0]?.clientY ?? touchY);
      const dir: 1 | -1 = dy > 0 ? 1 : -1;
      const nextIdx = nearestIdx() + dir;
      if (locked() || (nextIdx >= 0 && nextIdx < n)) e.preventDefault(); // 칸 사이에서는 기본 스크롤을 막고, 끝에서 바깥으로는 허용
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartedInside || locked()) return;
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (Math.abs(dy) > 40 && inside()) step(dy > 0 ? 1 : -1);
    };

    // 스크롤바 드래그 등으로 칸 사이에 멈춘 경우: 잠잠해지면 가장 가까운 깊이로 붙인다.
    let idleTimer = 0;
    const onScrollIdle = () => {
      update();
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (locked() || !inside()) return;
        const { rect, total, top } = geom();
        const idx = nearestIdx();
        if (Math.abs(top + points[idx] * total - (window.scrollY)) > 4 && rect.top <= 0) goTo(idx);
      }, 260);
    };

    const st = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: update, onRefresh: update });
    update();
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScrollIdle, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      navRef.current = null;
      window.clearTimeout(idleTimer);
      gsap.killTweensOf(window);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("scroll", onScrollIdle);
      window.removeEventListener("resize", update);
      st.kill();
    };
  }, [scrollYProgress, snapKey, reduce, preview]);

  if (scenes.length === 0) return null;

  // 관리자 미리보기(화면 전체를 fixed로 덮으면 안 됨)나 "움직임 줄이기"에서는 정적 카드로 — 이미지·배치·아치 문구는 그대로 보인다.
  if (reduce || preview) {
    return (
      <section className="mb-12 space-y-3">
        {heading && <h2 className="text-center text-xl font-semibold text-gray-900">{heading}</h2>}
        {scenes.map((s, i) => (
          <div key={`${s.title}-${i}`} className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl px-4 py-10">
            <SceneBackdrop scene={s} index={i} />
            {s.hyperVfx !== false && VFX_BY_INDEX[i] && (() => {
              const th = resolveTheme(s, i);
              return (
                <>
                  <DepthVideoLayer videos={s.videos ?? []} />
                  <DepthVfx kind={VFX_BY_INDEX[i]} accent={th.accent} color1={th.c1} color2={th.c2} imageUrl={s.imageUrl} imagePos={s.imagePos} active off={s.vfxOff ?? []} cardFaces={s.cardFaces ?? []} />
                </>
              );
            })()}
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
            <Scene key={`${s.title}-${i}`} index={i} count={scenes.length} progress={scrollYProgress} scene={s} near={Math.abs(i - activeIdx) <= 1} active={inSection && i === activeIdx} />
          ))}
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 h-1 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-white/30">
            <motion.div className="h-full rounded-full bg-white/80" style={{ width: dot }} />
          </div>
          <p className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-[11px] tracking-[0.3em] text-white/70">SCROLL</p>
          {/* HOTFIX-166.2(사용자 지시 — 각 depth마다 이전/다음 버튼): 오른쪽 가운데의 ▲ 이전 · 깊이 점(누르면 바로 이동) · ▼ 다음 */}
          {inSection && (
            <div className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 sm:right-6">
              <button type="button" onClick={() => navRef.current?.step(-1)} disabled={activeIdx === 0} aria-label="이전 깊이" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/40 text-lg text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-25">
                ▲
              </button>
              <div className="flex flex-col items-center gap-1.5 py-1">
                {scenes.map((_, i) => (
                  <button key={i} type="button" onClick={() => navRef.current?.go(i)} aria-label={`${i + 1}번째 깊이로`} aria-current={i === activeIdx} className="rounded-full border border-white/70 transition-all" style={{ width: 9, height: i === activeIdx ? 22 : 9, background: i === activeIdx ? "#fff" : "rgba(255,255,255,.25)" }} />
                ))}
              </div>
              <button type="button" onClick={() => navRef.current?.step(1)} disabled={activeIdx === scenes.length - 1} aria-label="다음 깊이" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/40 text-lg text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-25">
                ▼
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
