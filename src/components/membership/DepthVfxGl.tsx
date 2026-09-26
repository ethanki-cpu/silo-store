"use client";

/* eslint-disable react-hooks/immutability -- three.js 셰이더 uniform은 useFrame에서 매 프레임 직접 갱신하는 것이 정석이다(React state로 하면 프레임마다 리렌더) */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// EPIC-164 / HOTFIX-164.4: WebGL VFX 3종 — 전부 코드/canvas로 그려서 추가 다운로드가 없다.
//  · Alice: 앞면=이상한 나라 캐릭터(토끼·모자장수·체셔고양이·여왕·병정·애벌레), 뒷면=금장 격자 카드 뒷면인 트럼프 카드 낙하
//  · Gatsby: 샴페인 기포(림+하이라이트 스프라이트, 줄기로 상승) + 금빛 안개 + 담배 연기 리본 + 폭죽(중심을 공유하는 실제 폭발)
//  · Artist: 물방울이 퐁당 떨어진 뒤 퍼지는 파동(배경 이미지 위에 겹치는 투명 오버레이 — R2 이미지에 CORS가 없어 텍스처로 읽지 않는다)
type Kind = "alice" | "gatsby" | "artist";
type Props = { kind: Kind; accent: string; color1: string; color2: string; imageUrl?: string; imagePos?: string };

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const PLANE_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

// ─────────────────────────── Alice ───────────────────────────
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const CHARACTERS = [
  { e: "🐇", n: "WHITE RABBIT", s: "♦" },
  { e: "🎩", n: "MAD HATTER", s: "♠" },
  { e: "😸", n: "CHESHIRE CAT", s: "♣" },
  { e: "👑", n: "QUEEN OF HEARTS", s: "♥" },
  { e: "💂", n: "CARD SOLDIER", s: "♠" },
  { e: "🐛", n: "CATERPILLAR", s: "♣" },
];

function cardFace(ch: (typeof CHARACTERS)[number]): THREE.CanvasTexture {
  const W = 256;
  const H = 360;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const red = ch.s === "♥" || ch.s === "♦";
  const ink = red ? "#b3121f" : "#1d1b2e";
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, "#fffaf0");
  paper.addColorStop(1, "#f1e6cc");
  g.fillStyle = paper;
  g.beginPath();
  g.roundRect(3, 3, W - 6, H - 6, 18);
  g.fill();
  g.strokeStyle = "#b8963e";
  g.lineWidth = 4;
  g.stroke();
  g.strokeStyle = "#d9bd6a";
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(14, 14, W - 28, H - 28, 12);
  g.stroke();
  // 안쪽 그림 자리(살짝 어두운 바탕)
  const bg = g.createRadialGradient(W / 2, H / 2 - 10, 10, W / 2, H / 2 - 10, 130);
  bg.addColorStop(0, red ? "#fde8e4" : "#e9e6f4");
  bg.addColorStop(1, "#f6ecd6");
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(30, 52, W - 60, H - 118, 10);
  g.fill();
  g.strokeStyle = "#d9bd6a";
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `112px ${EMOJI_FONT}`;
  g.fillText(ch.e, W / 2, H / 2 - 8);
  g.fillStyle = ink;
  g.font = "bold 30px Georgia, serif";
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillText(ch.s, 24, 46);
  g.save();
  g.translate(W - 24, H - 22);
  g.rotate(Math.PI);
  g.fillText(ch.s, 0, 0);
  g.restore();
  g.textAlign = "center";
  g.font = "bold 13px Georgia, serif";
  g.fillText(ch.n, W / 2, H - 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function cardBack(): THREE.CanvasTexture {
  const W = 256;
  const H = 360;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#8f1226");
  bg.addColorStop(1, "#4a0713");
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(3, 3, W - 6, H - 6, 18);
  g.fill();
  g.strokeStyle = "#e0bf62";
  g.lineWidth = 4;
  g.stroke();
  // 금장 다이아몬드 격자
  g.save();
  g.beginPath();
  g.roundRect(18, 18, W - 36, H - 36, 10);
  g.clip();
  g.strokeStyle = "rgba(224,191,98,.55)";
  g.lineWidth = 1.4;
  for (let i = -H; i < W + H; i += 26) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + H, H);
    g.stroke();
    g.beginPath();
    g.moveTo(i, H);
    g.lineTo(i + H, 0);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = "#e0bf62";
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(18, 18, W - 36, H - 36, 10);
  g.stroke();
  // 가운데 메달리온
  g.fillStyle = "#5a0a17";
  g.strokeStyle = "#f2d67f";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(W / 2, H / 2, 54, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(W / 2, H / 2, 44, 0, Math.PI * 2);
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = "#f2d67f";
  g.font = "bold 58px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("♥", W / 2, H / 2 + 2);
  g.font = "bold 11px Georgia, serif";
  g.fillText("· SILO ·", W / 2, H / 2 + 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Cards() {
  const { viewport } = useThree();
  const faces = useMemo(() => CHARACTERS.map(cardFace), []);
  const back = useMemo(() => cardBack(), []);
  useEffect(
    () => () => {
      faces.forEach((t) => t.dispose());
      back.dispose();
    },
    [faces, back],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const cards = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 12 }, (_, i) => ({ x: r() * 2 - 1, z: -1 + r() * 2.4, speed: 0.6 + r() * 0.6, phase: r() * 10, spin: 0.5 + r() * 1.1, scale: 0.7 + r() * 0.5, face: i % faces.length }));
  }, [faces.length]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const H = viewport.height;
    cards.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const p = (t * c.speed * 0.07 + c.phase) % 1;
      m.position.set(c.x * viewport.width * 0.52 + Math.sin(t * 0.6 + c.phase) * 0.4, H * 0.62 - p * H * 1.3, c.z);
      // 천천히 뒤집히며(앞→뒤→앞) 떨어진다
      m.rotation.set(Math.sin(t * 0.5 + c.phase) * 0.5, t * c.spin * 0.8 + c.phase, Math.sin(t * 0.7 + c.phase) * 0.45);
    });
  });
  return (
    <>
      {cards.map((c, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} scale={c.scale}>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[0.72, 1.01]} />
            <meshBasicMaterial map={faces[c.face]} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.72, 1.01]} />
            <meshBasicMaterial map={back} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ─────────────────────────── Gatsby ───────────────────────────
// 샴페인 기포 스프라이트: 속이 거의 비치는 유리구슬 — 밝은 림 + 좌상단 하이라이트 + 우하단 굴절광
function bubbleSprite(): THREE.CanvasTexture {
  const S = 96;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const body = g.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2 - 2);
  body.addColorStop(0, "rgba(255,236,180,0.05)");
  body.addColorStop(0.62, "rgba(255,222,140,0.12)");
  body.addColorStop(0.86, "rgba(255,244,205,0.55)");
  body.addColorStop(0.95, "rgba(255,255,255,0.95)");
  body.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = body;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
  g.fill();
  const hi = g.createRadialGradient(S * 0.33, S * 0.3, 0, S * 0.33, S * 0.3, S * 0.2);
  hi.addColorStop(0, "rgba(255,255,255,1)");
  hi.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hi;
  g.fillRect(0, 0, S, S);
  const lo = g.createRadialGradient(S * 0.68, S * 0.72, 0, S * 0.68, S * 0.72, S * 0.16);
  lo.addColorStop(0, "rgba(255,214,120,.75)");
  lo.addColorStop(1, "rgba(255,214,120,0)");
  g.fillStyle = lo;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const POINTS_VERT = `
attribute vec4 aSeed; attribute vec2 aBurst;
uniform float uTime; uniform vec2 uVp; uniform float uPx; uniform float uMode;
varying float vA; varying float vSeed; varying float vFlick;
void main(){
  float t=uTime;
  vec2 pos; float size; float a=1.0; float flick=1.0;
  if(uMode<0.5){
    // 샴페인 기포: 14개의 줄기(기포가 올라오는 자리)에서 크기가 클수록 빨리, 위로 갈수록 살짝 커지며 흔들린다
    float col=floor(aSeed.x*14.0)/14.0;
    float sz=pow(aSeed.y,2.6);
    float spd=0.05+sz*0.16+aSeed.z*0.03;
    float p=fract(aSeed.w*7.0+t*spd);
    float sway=sin(t*(1.2+aSeed.z*2.4)+aSeed.w*40.0)*(0.06+sz*0.1);
    pos=vec2((col-.5)*uVp.x*1.08+(aSeed.z-.5)*0.55+sway,(p-.5)*uVp.y*1.12);
    size=(5.0+sz*46.0)*(0.7+p*0.6);
    a=smoothstep(0.0,0.06,p)*(1.0-smoothstep(0.9,1.0,p))*(0.55+aSeed.y*0.45);
  } else {
    // 폭죽: 같은 폭발(aBurst)의 입자들이 한 점에서 방사형으로 터져 중력으로 처지며 사라진다
    float period=4.6+aBurst.y*2.6;
    float age=mod(t+aBurst.x*period,period);
    vec2 center=vec2((fract(aBurst.x*11.7)-.5)*uVp.x*0.82,(fract(aBurst.x*5.3+aBurst.y)*.55+.08)*uVp.y*0.5);
    float ang=aSeed.z*6.2831; float sp=(0.45+aSeed.w*0.55)*uVp.y*0.36;
    float k=1.0-exp(-age*2.6);
    pos=center+vec2(cos(ang),sin(ang))*sp*k+vec2(0.0,-age*age*0.045*uVp.y);
    size=3.5+aSeed.y*6.0;
    a=(1.0-smoothstep(1.4,3.0,age))*step(0.0,age);
    flick=0.6+0.4*sin(t*30.0+aSeed.x*90.0);
  }
  vA=a; vSeed=aBurst.y; vFlick=flick;
  vec4 mv=modelViewMatrix*vec4(pos,0.0,1.0);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=size*uPx;
}`;
const POINTS_FRAG = `
precision mediump float; uniform sampler2D uMap; uniform float uMode; varying float vA; varying float vSeed; varying float vFlick;
void main(){
  if(uMode<0.5){
    vec4 tex=texture2D(uMap,gl_PointCoord); gl_FragColor=vec4(tex.rgb,tex.a*vA);
  } else {
    vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5) discard;
    float core=smoothstep(.5,0.0,d); vec3 col=vSeed<.33?vec3(1.0,.82,.4):(vSeed<.66?vec3(1.0,.55,.62):vec3(1.0,.96,.85));
    gl_FragColor=vec4(mix(col,vec3(1.0),core*core),core*vA*vFlick);
  }
}`;

function ParticlePoints({ mode, count, seed, sprite }: { mode: 0 | 1; count: number; seed: number; sprite?: THREE.Texture }) {
  const { viewport, size, gl } = useThree();
  const geo = useMemo(() => {
    const r = rng(seed);
    const seeds = new Float32Array(count * 4);
    const bursts = new Float32Array(count * 2);
    const B = 12;
    const bx = Array.from({ length: B }, () => [r(), r()]);
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 4; k++) seeds[i * 4 + k] = r();
      const b = bx[i % B];
      bursts[i * 2] = b[0];
      bursts[i * 2 + 1] = b[1];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    g.setAttribute("aBurst", new THREE.BufferAttribute(bursts, 2));
    return g;
  }, [count, seed]);
  useEffect(() => () => geo.dispose(), [geo]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uVp: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 }, uMode: { value: mode }, uMap: { value: sprite ?? null } }),
    [mode, sprite],
  );
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uVp.value.set(viewport.width, viewport.height);
    uniforms.uPx.value = gl.getPixelRatio() * (size.width < 700 ? 0.75 : 1);
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial uniforms={uniforms} vertexShader={POINTS_VERT} fragmentShader={POINTS_FRAG} transparent depthWrite={false} blending={mode === 1 ? THREE.AdditiveBlending : THREE.NormalBlending} />
    </points>
  );
}

// 안개(mode 0) / 담배 연기 리본(mode 1) — 도메인 워핑 fbm
const SMOKE_FRAG = `
varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uMode; uniform vec2 uOrigin; uniform float uAlpha; uniform float uWidth;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(3.1,1.7);a*=.5;}return v;}
void main(){
  float t=uTime;
  vec2 p=vUv*vec2(3.2,2.2); p.y-=t*0.05;
  vec2 q=vec2(fbm(p+t*0.06),fbm(p+vec2(5.2,1.3)-t*0.05));
  float f=fbm(p+3.2*q+vec2(0.0,-t*0.12));
  float a;
  if(uMode<0.5){
    float mask=smoothstep(1.0,0.05,vUv.y)*0.8+0.2;
    a=smoothstep(0.32,0.85,f)*mask*uAlpha;
  } else {
    float x0=uOrigin.x+sin(vUv.y*7.0+t*0.9)*0.05*vUv.y+(q.x-.5)*0.32*vUv.y;
    float d=abs(vUv.x-x0);
    float w=uWidth*(0.25+vUv.y*1.9);
    a=smoothstep(w,0.0,d)*smoothstep(1.0,0.25,vUv.y)*smoothstep(uOrigin.y,uOrigin.y+0.08,vUv.y)*(0.45+f)*uAlpha;
  }
  gl_FragColor=vec4(mix(uColor,vec3(1.0),0.45),clamp(a,0.0,0.85));
}`;

function Smoke({ mode, color, alpha, origin, width, z }: { mode: 0 | 1; color: string; alpha: number; origin?: [number, number]; width?: number; z: number }) {
  const { viewport } = useThree();
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uMode: { value: mode }, uOrigin: { value: new THREE.Vector2(origin?.[0] ?? 0.2, origin?.[1] ?? 0) }, uAlpha: { value: alpha }, uWidth: { value: width ?? 0.05 } }),
    [color, mode, origin, alpha, width],
  );
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[viewport.width * 1.15, viewport.height * 1.15]} />
      <shaderMaterial uniforms={uniforms} vertexShader={PLANE_VERT} fragmentShader={SMOKE_FRAG} transparent depthWrite={false} />
    </mesh>
  );
}

function Champagne({ accent }: { accent: string }) {
  const sprite = useMemo(() => bubbleSprite(), []);
  useEffect(() => () => sprite.dispose(), [sprite]);
  const cigarette = useMemo<[number, number]>(() => [0.16, 0.02], []);
  return (
    <>
      <Smoke mode={0} color={accent} alpha={0.55} z={-3} />
      <Smoke mode={1} color="#d9d2c4" alpha={0.7} origin={cigarette} width={0.045} z={-2.5} />
      <ParticlePoints mode={0} count={260} seed={5} sprite={sprite} />
      <ParticlePoints mode={1} count={360} seed={9} />
    </>
  );
}

// ─────────────────────────── Artist ───────────────────────────
// 투명 오버레이: 물방울이 떨어지고(uDrop) 착수 지점에서 동심원 파동이 퍼진다. 마우스·스크롤도 파동을 만든다.
const MAX_RIP = 8;
const WATER_FRAG = `
precision highp float;
varying vec2 vUv; uniform float uTime; uniform vec2 uAspect; uniform vec3 uAccent; uniform vec4 uDrop;
uniform vec4 uRip[${MAX_RIP}];
void main(){
  vec2 q=vUv*uAspect; float lum=0.0;
  for(int i=0;i<${MAX_RIP};i++){
    vec4 rp=uRip[i]; if(rp.w<=0.0) continue;
    float age=uTime-rp.z; if(age<0.0||age>4.5) continue;
    vec2 c=rp.xy*uAspect; float d=distance(q,c);
    float front=age*0.36;
    float env=exp(-abs(d-front)*8.0)*exp(-age*0.75);
    lum+=sin((d-front)*62.0)*env*rp.w;
  }
  // 떨어지는 물방울
  float dt=uTime-uDrop.z; float drop=0.0;
  if(uDrop.w>0.0 && dt>=0.0 && dt<0.5){
    float k=dt/0.5; vec2 pos=vec2(uDrop.x,uDrop.y+0.32*(1.0-k*k));
    vec2 dd=(vUv-pos)*uAspect; dd.y*=0.55; drop=smoothstep(0.014,0.0,length(dd));
  }
  float hi=max(lum,0.0); float lo=max(-lum,0.0);
  vec3 col=mix(vec3(0.02,0.06,0.12),mix(vec3(1.0),uAccent,0.25),step(0.0,lum));
  float a=clamp(hi*0.75+lo*0.45,0.0,0.7);
  col=mix(col,vec3(1.0),drop); a=max(a,drop*0.95);
  gl_FragColor=vec4(col,a);
}`;

function Water({ accent }: Pick<Props, "accent">) {
  const { viewport, size, gl } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: new THREE.Vector2(1, 1) },
      uAccent: { value: new THREE.Color(accent) },
      uDrop: { value: new THREE.Vector4(0.5, 0.5, -10, 0) },
      uRip: { value: Array.from({ length: MAX_RIP }, () => new THREE.Vector4(0, 0, -10, 0)) },
    }),
    [accent],
  );
  const ripIdx = useRef(0);
  const nextDrop = useRef(0.6);
  const now = useRef(0);
  const addRipple = (x: number, y: number, at: number, strength: number) => {
    uniforms.uRip.value[ripIdx.current % MAX_RIP].set(x, y, at, strength);
    ripIdx.current++;
  };

  useEffect(() => {
    const el = gl.domElement;
    let lx = -1;
    let ly = -1;
    let lastT = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      if (Math.hypot(x - lx, y - ly) > 0.07 && performance.now() - lastT > 70) {
        addRipple(x, y, now.current, 0.55);
        lx = x;
        ly = y;
        lastT = performance.now();
      }
    };
    let lastY = window.scrollY;
    let lastS = 0;
    const onScroll = () => {
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      if (dy > 12 && performance.now() - lastS > 160) {
        addRipple(0.25 + Math.random() * 0.5, 0.25 + Math.random() * 0.5, now.current, Math.min(1.3, 0.5 + dy / 90));
        lastS = performance.now();
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    now.current = t;
    uniforms.uTime.value = t;
    uniforms.uAspect.value.set(size.width / size.height, 1);
    // 3~5초마다 물방울이 퐁당: 0.5초 낙하 후 그 자리에서 파동
    if (t >= nextDrop.current) {
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.2 + Math.random() * 0.55;
      uniforms.uDrop.value.set(x, y, t, 1);
      addRipple(x, y, t + 0.5, 1.2);
      nextDrop.current = t + 3 + Math.random() * 2;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial uniforms={uniforms} vertexShader={PLANE_VERT} fragmentShader={WATER_FRAG} transparent depthWrite={false} />
    </mesh>
  );
}

export default function DepthVfxGl(props: Props) {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpacity(1));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="absolute inset-0" style={{ opacity, transition: "opacity .8s ease", pointerEvents: "none" }}>
      <Canvas dpr={[1, 1.5]} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }} camera={{ position: [0, 0, 5], fov: 50 }} style={{ pointerEvents: "none" }}>
        {props.kind === "alice" && <Cards />}
        {props.kind === "gatsby" && <Champagne accent={props.accent} />}
        {props.kind === "artist" && <Water accent={props.accent} />}
      </Canvas>
    </div>
  );
}
