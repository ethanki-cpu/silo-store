"use client";

/* eslint-disable react-hooks/immutability -- three.js 셰이더 uniform은 useFrame에서 매 프레임 직접 갱신하는 것이 정석이다(React state로 하면 프레임마다 리렌더) */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// EPIC-164 Phase 3: WebGL이 필요한 3가지 VFX — 모두 "코드로 그리는" 가벼운 셰이더/절차적 텍스처라 추가 다운로드가 없다.
//  · Alice: R3F 평면(Plane)에 canvas로 그린 트럼프 카드 텍스처를 입혀 낙하 + 하얀 장미→붉은 장미 셰이더(Color Lerp)
//  · Gatsby: 샴페인 기포 상승(Points 셰이더) + 폭죽 + 연기(fbm 노이즈 셰이더)
//  · Artist: 물파동 변위(Water Ripple Displacement) 셰이더 — 마우스/스크롤이 파동을 일으켜 화면 전체가 일렁인다
// 이 파일은 next/dynamic({ssr:false})으로만 불러오고(DepthVfx), 화면에 보이는 깊이에서만 마운트된다.
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

// ─────────────────────────── Alice ───────────────────────────
const SUITS = ["♠", "♥", "♣", "♦"];
const RANKS = ["A", "K", "Q", "J", "7"];

function makeCardTexture(suit: string, rank: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 180;
  const g = c.getContext("2d")!;
  const red = suit === "♥" || suit === "♦";
  g.fillStyle = "#fbf8ef";
  g.beginPath();
  g.roundRect(2, 2, 124, 176, 10);
  g.fill();
  g.strokeStyle = "#b9a77a";
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = red ? "#c1121f" : "#1b1b2b";
  g.font = "bold 30px Georgia, serif";
  g.textAlign = "left";
  g.fillText(rank, 12, 36);
  g.font = "26px Georgia, serif";
  g.fillText(suit, 12, 64);
  g.font = "64px Georgia, serif";
  g.textAlign = "center";
  g.fillText(suit, 64, 112);
  g.save();
  g.translate(116, 144);
  g.rotate(Math.PI);
  g.font = "bold 30px Georgia, serif";
  g.textAlign = "left";
  g.fillText(rank, 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Cards() {
  const { viewport } = useThree();
  const textures = useMemo(() => SUITS.flatMap((s, i) => [makeCardTexture(s, RANKS[i % RANKS.length]), makeCardTexture(s, RANKS[(i + 2) % RANKS.length])]), []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const cards = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 14 }, (_, i) => ({ x: r() * 2 - 1, z: -1.5 + r() * 2.2, speed: 0.35 + r() * 0.45, phase: r() * 10, spin: 0.6 + r() * 1.4, scale: 0.55 + r() * 0.35, tex: i % textures.length }));
  }, [textures.length]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const H = viewport.height;
    cards.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const p = (t * c.speed * 0.12 + c.phase) % 1;
      m.position.set(c.x * viewport.width * 0.5 + Math.sin(t * 0.7 + c.phase) * 0.3, H * 0.6 - p * H * 1.3, c.z);
      m.rotation.set(t * c.spin * 0.6 + c.phase, t * c.spin, Math.sin(t + c.phase) * 0.5);
    });
  });
  return (
    <>
      {cards.map((c, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} scale={c.scale}>
          <planeGeometry args={[0.7, 1]} />
          <meshBasicMaterial map={textures[c.tex]} side={THREE.DoubleSide} transparent />
        </mesh>
      ))}
    </>
  );
}

const ROSE_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
// 극좌표 장미 곡선으로 꽃잎 겹을 그리고, uMix(0=하얀 장미 → 1=붉은 장미)로 색을 lerp한다.
const ROSE_FRAG = `
varying vec2 vUv; uniform float uMix; uniform float uTime;
void main(){
  vec2 p=(vUv-.5)*2.0; float r=length(p); float a=atan(p.y,p.x);
  float layers=0.0; float shade=0.0;
  for(int i=0;i<4;i++){
    float fi=float(i);
    float rr=(0.95-fi*0.2)*(0.62+0.38*cos(5.0*(a+fi*0.6+uTime*0.05)+r*(4.0-fi)));
    float m=smoothstep(rr,rr-0.05,r);
    layers=max(layers,m);
    shade+=m*(0.18+0.12*fi);
  }
  float core=smoothstep(0.16,0.0,r);
  vec3 white=vec3(0.98,0.96,0.92); vec3 red=vec3(0.78,0.04,0.12);
  vec3 col=mix(white,red,uMix);
  col*= (1.0-shade*0.55); col=mix(col,col*0.45,core);
  float edge=smoothstep(0.02,0.0,abs(r-(0.95-0.0)*(0.62+0.38*cos(5.0*a)))-0.01);
  gl_FragColor=vec4(col,layers*0.92);
}`;

function Rose() {
  const { viewport } = useThree();
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uMix: { value: 0 }, uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // 하양 → 빨강 → (잠시 머물다) 처음으로: 부드러운 반복
    const cyc = (t % 9) / 9;
    uniforms.uMix.value = THREE.MathUtils.smoothstep(cyc, 0.15, 0.5) * (1 - THREE.MathUtils.smoothstep(cyc, 0.85, 1));
    uniforms.uTime.value = t;
  });
  const s = Math.min(viewport.width, viewport.height) * 0.42;
  return (
    <mesh position={[viewport.width * 0.28, -viewport.height * 0.22, -2]} rotation={[0, 0, 0.2]}>
      <planeGeometry args={[s, s]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={ROSE_VERT} fragmentShader={ROSE_FRAG} transparent depthWrite={false} />
    </mesh>
  );
}

// ─────────────────────────── Gatsby ───────────────────────────
const POINTS_VERT = `
attribute vec4 aSeed; uniform float uTime; uniform vec2 uVp; uniform float uPx; uniform float uMode;
varying float vA; varying float vSeed;
void main(){
  float t=uTime;
  vec2 pos; float size; float a=1.0;
  if(uMode<0.5){
    // 샴페인 기포: 아래에서 위로, 좌우로 살랑이며, 위로 갈수록 커진다
    float p=fract(aSeed.x+t*(0.05+aSeed.y*0.09));
    pos=vec2((aSeed.z-.5)*uVp.x+sin(t*(1.0+aSeed.y*2.0)+aSeed.w*6.28)*0.12, (p-.5)*uVp.y*1.1);
    size=(5.0+aSeed.y*16.0)*(0.6+p*0.9);
    a=smoothstep(0.0,0.08,p)*(1.0-smoothstep(0.85,1.0,p));
  } else {
    // 폭죽: 시드마다 다른 중심에서 방사형으로 터지고 중력으로 처진다
    float period=4.5+aSeed.y*2.5;
    float age=mod(t+aSeed.x*period,period);
    vec2 center=vec2((fract(aSeed.x*7.13)-.5)*uVp.x*0.9,(fract(aSeed.x*3.71)*.5+0.0)*uVp.y*0.7);
    float ang=aSeed.z*6.2831; float sp=(0.15+aSeed.w*0.85)*uVp.y*0.32;
    float k=1.0-exp(-age*2.2);
    pos=center+vec2(cos(ang),sin(ang))*sp*k+vec2(0.0,-age*age*0.05*uVp.y);
    size=3.0+aSeed.y*5.0;
    a=(1.0-smoothstep(1.2,2.8,age))*step(0.0,age);
  }
  vA=a; vSeed=aSeed.y;
  vec4 mv=modelViewMatrix*vec4(pos,0.0,1.0);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=size*uPx;
}`;
const POINTS_FRAG = `
precision mediump float; uniform vec3 uColor; uniform float uMode; varying float vA; varying float vSeed;
void main(){
  vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5) discard;
  float a;
  if(uMode<0.5){
    float ring=smoothstep(.5,.42,d)-smoothstep(.36,.2,d)*0.85;
    float hi=smoothstep(.16,0.0,length(c-vec2(-.15,-.16)));
    a=(ring*.9+hi*.9)*vA; gl_FragColor=vec4(mix(uColor,vec3(1.0),.55),a);
  } else {
    a=smoothstep(.5,0.0,d)*vA; gl_FragColor=vec4(mix(uColor,vec3(1.0,.85,.5),vSeed),a);
  }
}`;

function ParticlePoints({ mode, count, color, seed }: { mode: 0 | 1; count: number; color: THREE.ColorRepresentation; seed: number }) {
  const { viewport, size, gl } = useThree();
  const geo = useMemo(() => {
    const r = rng(seed);
    const arr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      arr[i * 4] = r();
      arr[i * 4 + 1] = r();
      arr[i * 4 + 2] = r();
      arr[i * 4 + 3] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(arr, 4));
    return g;
  }, [count, seed]);
  useEffect(() => () => geo.dispose(), [geo]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uVp: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 }, uMode: { value: mode }, uColor: { value: new THREE.Color(color) } }),
    [mode, color],
  );
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uVp.value.set(viewport.width, viewport.height);
    uniforms.uPx.value = gl.getPixelRatio() * (size.width < 700 ? 0.8 : 1);
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial uniforms={uniforms} vertexShader={POINTS_VERT} fragmentShader={POINTS_FRAG} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

const SMOKE_FRAG = `
varying vec2 vUv; uniform float uTime; uniform vec3 uColor;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+vec2(3.1,1.7);a*=.5;}return v;}
void main(){
  vec2 p=vUv*vec2(3.0,2.0); p.y-=uTime*0.06; p.x+=fbm(p+uTime*0.03)*0.6;
  float f=fbm(p*1.2+vec2(0.0,uTime*0.04));
  float mask=smoothstep(0.9,0.0,vUv.y)*0.9+0.1;
  float a=smoothstep(0.35,0.85,f)*mask*0.34;
  gl_FragColor=vec4(mix(uColor,vec3(1.0),0.35),a);
}`;

function Smoke({ color }: { color: string }) {
  const { viewport } = useThree();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } }), [color]);
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });
  return (
    <mesh position={[0, 0, -3]}>
      <planeGeometry args={[viewport.width * 1.1, viewport.height * 1.1]} />
      <shaderMaterial uniforms={uniforms} vertexShader={ROSE_VERT} fragmentShader={SMOKE_FRAG} transparent depthWrite={false} />
    </mesh>
  );
}

// ─────────────────────────── Artist ───────────────────────────
const MAX_RIP = 8;
const WATER_FRAG = `
precision highp float;
varying vec2 vUv; uniform float uTime; uniform vec2 uAspect; uniform sampler2D uTex; uniform float uHasTex;
uniform vec2 uTexAspect; uniform vec2 uFocus; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uAccent;
uniform vec4 uRip[${MAX_RIP}];
void main(){
  vec2 uv=vUv; vec2 disp=vec2(0.0); float lum=0.0;
  vec2 q=uv*uAspect;
  for(int i=0;i<${MAX_RIP};i++){
    vec4 rp=uRip[i]; if(rp.w<=0.0) continue;
    float age=uTime-rp.z; if(age<0.0||age>4.0) continue;
    vec2 c=rp.xy*uAspect; float d=distance(q,c); vec2 dir=normalize(q-c+1e-5);
    float front=age*0.42;
    float env=exp(-abs(d-front)*7.0)*exp(-age*0.9);
    float wv=sin((d-front)*48.0)*env*rp.w;
    disp+=dir*wv*0.02/uAspect; lum+=wv*0.55;
  }
  // 아무도 건드리지 않아도 잔잔하게 일렁이는 수면
  disp+=vec2(sin(uv.y*9.0+uTime*0.8),cos(uv.x*7.0+uTime*0.7))*0.0018;
  vec2 suv=uv+disp;
  vec3 col;
  if(uHasTex>0.5){
    // cover 맞춤 + 초점(imagePos)
    vec2 s=vec2(1.0); float ra=uAspect.x/uAspect.y; float ia=uTexAspect.x/uTexAspect.y;
    if(ra>ia) s=vec2(1.0,ia/ra); else s=vec2(ra/ia,1.0);
    vec2 tuv=(suv-uFocus)*s+uFocus; tuv=clamp(tuv,0.001,0.999);
    col=texture2D(uTex,vec2(tuv.x,1.0-tuv.y)).rgb;
  } else {
    col=mix(uC1,uC2,suv.y)+uAccent*0.18*(0.5+0.5*sin(suv.x*14.0+suv.y*9.0+uTime*0.6));
  }
  col+=uAccent*max(lum,0.0)*0.45+vec3(max(-lum,0.0))*-0.12;
  gl_FragColor=vec4(col,1.0);
}`;

function Water({ imageUrl, imagePos, color1, color2, accent }: Pick<Props, "imageUrl" | "imagePos" | "color1" | "color2" | "accent">) {
  const { viewport, size, gl } = useThree();
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!imageUrl) return;
    let alive = true;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    // 이미 화면 배경으로 받은 같은 URL이라 브라우저 캐시에서 나온다(추가 다운로드 없음). CORS 실패 시 절차적 물결 배경으로 대체.
    loader.load(imageUrl, (t) => {
      if (!alive) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      loaded = t;
      setTex(t);
    }, undefined, () => setTex(null));
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [imageUrl]);

  const focus = useMemo(() => {
    const m = (imagePos ?? "50% 50%").match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
    return m ? new THREE.Vector2(Number(m[1]) / 100, Number(m[2]) / 100) : new THREE.Vector2(0.5, 0.5);
  }, [imagePos]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: new THREE.Vector2(1, 1) },
      uTex: { value: null as THREE.Texture | null },
      uHasTex: { value: 0 },
      uTexAspect: { value: new THREE.Vector2(1, 1) },
      uFocus: { value: focus },
      uC1: { value: new THREE.Color(color1) },
      uC2: { value: new THREE.Color(color2) },
      uAccent: { value: new THREE.Color(accent) },
      uRip: { value: Array.from({ length: MAX_RIP }, () => new THREE.Vector4(0, 0, -10, 0)) },
    }),
    [focus, color1, color2, accent],
  );

  const ripIdx = useRef(0);
  const clockRef = useRef<THREE.Clock | null>(null);
  const addRipple = (x: number, y: number, strength: number) => {
    const t = clockRef.current?.getElapsedTime() ?? 0;
    uniforms.uRip.value[ripIdx.current % MAX_RIP].set(x, y, t, strength);
    ripIdx.current++;
  };

  // 마우스: 일정 거리 움직일 때마다 파동 / 스크롤: 속도만큼 강한 파동을 화면 중앙 근처에서
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
      if (Math.hypot(x - lx, y - ly) > 0.06 && performance.now() - lastT > 60) {
        addRipple(x, y, 0.6);
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
      if (dy > 12 && performance.now() - lastS > 140) {
        addRipple(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, Math.min(1.4, 0.5 + dy / 90));
        lastS = performance.now();
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    // 시작 파동 한 번 — 진입하자마자 물이라는 게 보이게
    const t0 = window.setTimeout(() => addRipple(0.5, 0.5, 1), 200);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(t0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  useFrame(({ clock }) => {
    clockRef.current = clock;
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uAspect.value.set(size.width / size.height, 1);
    if (tex) {
      uniforms.uTex.value = tex;
      uniforms.uHasTex.value = 1;
      const im = tex.image as { width?: number; height?: number } | undefined;
      uniforms.uTexAspect.value.set(im?.width ?? 1, im?.height ?? 1);
    } else uniforms.uHasTex.value = 0;
  });

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial uniforms={uniforms} vertexShader={ROSE_VERT} fragmentShader={WATER_FRAG} />
    </mesh>
  );
}

export default function DepthVfxGl(props: Props) {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpacity(1));
    return () => cancelAnimationFrame(id);
  }, []);
  const isArtist = props.kind === "artist";
  return (
    <div className="absolute inset-0" style={{ opacity, transition: "opacity .8s ease", pointerEvents: "none" }}>
      <Canvas dpr={[1, 1.5]} gl={{ alpha: !isArtist, antialias: false, powerPreference: "low-power" }} camera={{ position: [0, 0, 5], fov: 50 }} style={{ pointerEvents: "none" }} eventSource={undefined}>
        {props.kind === "alice" && (
          <>
            <Rose />
            <Cards />
          </>
        )}
        {props.kind === "gatsby" && (
          <>
            <Smoke color={props.accent} />
            <ParticlePoints mode={0} count={90} color={props.accent} seed={5} />
            <ParticlePoints mode={1} count={160} color="#f5d27a" seed={9} />
          </>
        )}
        {isArtist && <Water imageUrl={props.imageUrl} imagePos={props.imagePos} color1={props.color1} color2={props.color2} accent={props.accent} />}
      </Canvas>
    </div>
  );
}
