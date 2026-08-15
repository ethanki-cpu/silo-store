"use client";

// EPIC-113/114/115/119: /about-silo를 "어린 왕자" 감성의 3D 우주(행성+궤도+
// 위성)로 개편하는 프로토타입. React Three Fiber(three.js) 기반.
//
// EPIC-119(사용자 지시 — "임의로 3D Mesh(찰흙 덩어리)를 억지로 코딩으로
// 만들려 하지 마라, [3D World Builder] 아키텍처로 전면 개편하라"): 이
// 파일의 절차적 실루엣/오브젝트는 실제 에셋이 없던 EPIC-115 시점의 임시
// 대체물이었다 — 이제 관리자가 UniverseSettingsPanel.tsx에서 직접 .glb
// 캐릭터/장식 오브젝트/행성 텍스처를 업로드하면 그 자리를 그대로
// 교체한다(`CharacterRenderer`/`PlanetMaterial`/`UniverseObjectsLayer`
// 참고). 업로드가 없을 때만 기존 절차적 결과물을 폴백으로 보여준다 —
// "아무것도 없는 것"보다는 낫고, 관리자가 실제 에셋을 준비하는 대로
// 자연스럽게 교체된다.
//
// 아키텍처 결정 메모(EPIC-115):
// - "수채화 텍스처"/"프리셋 배경"은 여전히 절차적 대체(에셋 업로드 시
//   PlanetMaterial/YoutubeBackground가 우선한다).
// - Leva 설정 패널은 색상/토글/슬라이더 등 단순 값만 계속 담당하고,
//   [값, set] 튜플 형태로 받아 DB에서 불러온 초깃값을 `set()`으로 밀어
//   넣는다(Leva는 마운트 후 defaultValue를 다시 안 읽으므로, 비동기
//   로드값을 반영하려면 이 방법이 필요). 파일 업로드/배열 편집/드롭다운은
//   Leva로 표현하기 애매해 UniverseSettingsPanel(커스텀 HTML 패널)이
//   맡는다.
// - 카메라 거리 기반 페이드(LOD)는 매 프레임 React state를 갱신하는 대신
//   ref(뮤터블 객체)에 거리값을 담아 각 메시가 자기 자신의 useFrame에서
//   직접 읽어 opacity를 보간한다.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
  Component,
  Suspense,
  type RefObject,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  CameraControls,
  Html,
  Text,
  useTexture,
  useGLTF,
  useAnimations,
  Stars,
  Sparkles,
  type CameraControls as CameraControlsImpl,
} from "@react-three/drei";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useControls } from "leva";
import * as THREE from "three";
import { fibonacciSphere } from "@/lib/fibonacciSphere";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";
import { supabase } from "@/lib/supabaseClient";
import {
  defaultUniverseConfig,
  normalizeUniverseConfig,
  type UniverseConfig,
  type UniverseObject,
} from "@/lib/aboutSiloUniverseConfig";
import { YoutubeBackground } from "./YoutubeBackground";
import { PresetBackground, type BackgroundPreset } from "./PresetBackground";
import { UniverseSettingsPanel } from "./UniverseSettingsPanel";

// ============================================================
// 데이터
// ============================================================

type FeedPost = {
  id: string;
  slug: string;
  board_slug: string | null;
  board_name: string;
  title: string | null;
  photo_url: string | null;
};

// "10~20개"(지시문) 중 상한만 강제한다 — 하한은 실제 게시글이 그만큼
// 없을 수도 있어(사진 없는 초기 데이터 등) 있는 만큼만 보여준다.
const MAX_UNIVERSE_IMAGES = 18;

// EPIC-119(Item 2): boardSlug가 있으면 그 게시판 글만, 없으면(기존과
// 동일) 추천/인기/최신을 통합한 전체 피드를 쓴다.
async function fetchUniverseImages(boardSlug: string): Promise<FeedPost[]> {
  if (boardSlug) {
    const res = await fetch(`/api/boards/${encodeURIComponent(boardSlug)}/posts?pageSize=100`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      board?: { name?: string };
      posts?: {
        id: string;
        slug?: string;
        title: string | null;
        photo_url: string | null;
        featured_image_url?: string | null;
        thumbnail_visible?: boolean | null;
      }[];
    };
    const seen = new Set<string>();
    const withPhoto: FeedPost[] = [];
    for (const p of data.posts ?? []) {
      const photo = p.thumbnail_visible === false ? null : (p.featured_image_url ?? p.photo_url);
      if (!photo || seen.has(p.id)) continue;
      seen.add(p.id);
      withPhoto.push({
        id: p.id,
        slug: p.slug ?? p.id,
        board_slug: boardSlug,
        board_name: data.board?.name ?? "",
        title: p.title,
        photo_url: photo,
      });
      if (withPhoto.length >= MAX_UNIVERSE_IMAGES) break;
    }
    return withPhoto;
  }

  const res = await fetch("/api/boards/feed");
  if (!res.ok) return [];
  const data = (await res.json()) as {
    recommended?: FeedPost[];
    popular?: FeedPost[];
    latest?: FeedPost[];
  };
  const pool = [...(data.recommended ?? []), ...(data.popular ?? []), ...(data.latest ?? [])];
  const seen = new Set<string>();
  const withPhoto: FeedPost[] = [];
  for (const p of pool) {
    if (!p.photo_url || seen.has(p.id)) continue;
    seen.add(p.id);
    withPhoto.push(p);
    if (withPhoto.length >= MAX_UNIVERSE_IMAGES) break;
  }
  return withPhoto;
}

// EPIC-115: 4대 카테고리 실제 라우트(지시문 3번 그대로) + 보물상자/카메라
// 변형(Leva "내핵 오브젝트" 드롭다운과 연결).
type ChestVariant = "classic" | "gold" | "dark";
type CameraVariant = "vintage" | "black" | "polaroid";

const CORE_CATEGORIES = [
  { key: "silostore", label: "사일로 상점", sub: "Silo Store", href: "/silo-store", color: "#c99a5b", shape: "chest" as const },
  { key: "docent", label: "온라인 도슨트", sub: "Online Docent", href: "/online-docent", color: "#e7ddce", shape: "statue" as const },
  { key: "salon", label: "살롱데상", sub: "Salon des Cent", href: "/salon-des-cent", color: "#3f4a3d", shape: "phone" as const },
  { key: "studio", label: "스튜디오", sub: "Studio", href: "/studio", color: "#4a3626", shape: "camera" as const },
] as const;

// EPIC-115: "About Me" 궤도 위성 — 로그인 없이도(공개 페이지) 보여줄 수
// 있는 마이페이지 성격의 상징적 카테고리 5종(장식용, /mypage 하위 탭
// 라벨과 맞춤). 실제 개인 데이터 연결은 범위 밖(EPIC-113 "user-planet-
// decoration-bone" 자리에 훗날 연결).
const ABOUT_ME_SATELLITES = [
  { key: "wishlist", label: "찜한 아이템", color: "#e3b7c1" },
  { key: "collections", label: "나의 컬렉션", color: "#c9d8a8" },
  { key: "timeline", label: "타임라인", color: "#a8c9d8" },
  { key: "badges", label: "뱃지", color: "#e8cf8f" },
  { key: "visitors", label: "방문자", color: "#cbb7e3" },
] as const;

// ============================================================
// 씬 레이아웃
// ============================================================

const PLANET_RADIUS = 2.1;
const SILO_CENTER = new THREE.Vector3(-3.1, 0, 0);
const USER_PLANET_RADIUS = 1.05;
const USER_CENTER = new THREE.Vector3(3.3, -0.4, -0.6);

const IMAGE_ORBIT_RADIUS = 2.55;
const ABOUT_ME_ORBIT_RADIUS = 1.75;
const SURFACE_VISIBLE_DISTANCE = 4.2;
const CORE_VISIBLE_DISTANCE = 1.55;
const HOME_TARGET = new THREE.Vector3(0.1, -0.1, 0);
const HOME_CAMERA_POS = new THREE.Vector3(0.6, 2.2, 11.5);
// EPIC-115: 줌아웃 한계를 사실상 해제(지시문 "Infinity 혹은 2000 이상").
const MAX_ZOOM_DISTANCE = 5000;

type DistanceRef = { current: number };
const DistanceContext = createContext<DistanceRef>({ current: HOME_CAMERA_POS.length() });

function CameraDistanceTracker({ distanceRef }: { distanceRef: DistanceRef }) {
  useFrame(({ camera }) => {
    distanceRef.current = camera.position.distanceTo(SILO_CENTER);
  });
  return null;
}

function surfaceOpacityFor(distance: number): number {
  if (distance >= SURFACE_VISIBLE_DISTANCE) return 1;
  if (distance <= CORE_VISIBLE_DISTANCE) return 0;
  return (distance - CORE_VISIBLE_DISTANCE) / (SURFACE_VISIBLE_DISTANCE - CORE_VISIBLE_DISTANCE);
}

function coreOpacityFor(distance: number): number {
  return 1 - surfaceOpacityFor(distance);
}

// ============================================================
// 툰 셰이딩 그라디언트 맵(공용) + 수채화 텍스처(EPIC-115) + 커스텀 텍스처(EPIC-119).
// ============================================================

function useToonGradientMap(): THREE.DataTexture {
  return useMemo(() => {
    const bands = new Uint8Array([120, 195, 245]);
    const texture = new THREE.DataTexture(bands, bands.length, 1, THREE.RedFormat);
    texture.needsUpdate = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);
}

/**
 * EPIC-115: 행성 표면에 붓터치/얼룩 노이즈를 겹쳐 그린 CanvasTexture —
 * 단색 MeshStandardMaterial 대신 "종이에 그린 수채화" 느낌을 내는 절차적
 * 대체(외부 텍스처 에셋 파일 없음). baseColor가 바뀌면(Leva 컬러 피커)
 * 다시 굽는다. EPIC-119부터는 관리자가 실제 텍스처를 업로드하지 않았을
 * 때의 폴백으로만 쓰인다(PlanetMaterial 참고).
 */
function useWatercolorTexture(baseColorHex: string): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const base = new THREE.Color(baseColorHex);

    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, size, size);

    // 결이 다른 반투명 블롭을 여러 겹 겹쳐 붓자국처럼 얼룩덜룩하게 만든다.
    // React Compiler(react-hooks/immutability)가 렌더 단계(useMemo 콜백)
    // 안에서 클로저 변수를 재대입하는 흔한 선형합동 PRNG 패턴을 금지해,
    // 대신 인덱스만의 순수 함수인 해시 기반 의사난수를 쓴다(상태 없음).
    function hashRandom(i: number): number {
      const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    }
    const lighter = base.clone().lerp(new THREE.Color("#ffffff"), 0.35);
    const darker = base.clone().lerp(new THREE.Color("#000000"), 0.18);
    for (let i = 0; i < 90; i++) {
      const r0 = hashRandom(i * 6);
      const tone = r0 > 0.5 ? lighter : darker;
      const x = hashRandom(i * 6 + 1) * size;
      const y = hashRandom(i * 6 + 2) * size;
      const r = 12 + hashRandom(i * 6 + 3) * 60;
      ctx.globalAlpha = 0.05 + hashRandom(i * 6 + 4) * 0.1;
      ctx.fillStyle = `#${tone.getHexString()}`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + hashRandom(i * 6 + 5) * 0.6), hashRandom(i * 6 + 6) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // 미세한 종이 질감(픽셀 단위 노이즈)을 얕게 얹는다.
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = hashRandom(i * 3 + 1000) > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(hashRandom(i * 3 + 1001) * size, hashRandom(i * 3 + 1002) * size, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [baseColorHex]);
}

// EPIC-119(공용): 이미지 텍스처든 .glb 모델이든, 에셋 로드가 실패하면
// (CORS/잘못된 URL 등) 크래시 대신 폴백을 보여주는 공용 경계 — 이름을
// Image 전용에서 Asset 전용으로 일반화(EPIC-115 때는 이미지만 다뤘음).
class AssetLoadErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[about-silo universe] 에셋 로드 실패, 폴백으로 대체:", error);
    this.props.onError?.();
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/** EPIC-119(Item 8): 업로드된 텍스처가 있으면 그걸, 없으면 절차적 수채화를 쓴다. */
function CustomPlanetTextureMaterial({ url, gradientMap }: { url: string; gradientMap: THREE.DataTexture }) {
  const texture = useTexture(url);
  return <meshToonMaterial map={texture} gradientMap={gradientMap} />;
}

function PlanetMaterial({
  baseColor,
  customTextureUrl,
  gradientMap,
}: {
  baseColor: string;
  customTextureUrl: string;
  gradientMap: THREE.DataTexture;
}) {
  const watercolor = useWatercolorTexture(baseColor);
  const fallback = <meshToonMaterial map={watercolor} gradientMap={gradientMap} />;
  if (!customTextureUrl) return fallback;
  return (
    <AssetLoadErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <CustomPlanetTextureMaterial url={customTextureUrl} gradientMap={gradientMap} />
      </Suspense>
    </AssetLoadErrorBoundary>
  );
}

// ============================================================
// 캐릭터 — 업로드된 .glb가 있으면 그걸(EPIC-119), 없으면 절차적 실루엣
// (EPIC-115, 폴백)을 렌더링한다.
// ============================================================

const FIGURE_VARIANTS: Record<"A" | "B" | "C", { color: string; scarfColor: string; scale: number }> = {
  A: { color: "#2b2118", scarfColor: "#d98a4a", scale: 1 },
  B: { color: "#22303a", scarfColor: "#e0c46b", scale: 1.15 },
  C: { color: "#4a2330", scarfColor: "#8fb3c9", scale: 0.9 },
};

function SittingFigure({
  position,
  rotationY = 0,
  scale = 1,
  variant = "A",
  seed = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  variant?: "A" | "B" | "C";
  seed?: number;
}) {
  const { color, scarfColor, scale: variantScale } = FIGURE_VARIANTS[variant];
  const headRef = useRef<THREE.Group>(null);
  const legRef = useRef<THREE.Mesh>(null);
  // 개체마다 시간축을 어긋나게(seed) 해 "여러 가지 모션이 랜덤하게
  // 재생되는" 느낌을 준다 — 실제로는 같은 sin 곡선이지만 위상이 달라
  // 동시에 봐도 서로 다른 타이밍으로 움직인다.
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + seed * 7.3;
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.35; // 두리번거림
      headRef.current.rotation.x = Math.sin(t * 0.33 + 1) * 0.1;
    }
    if (legRef.current) {
      legRef.current.rotation.x = 0.5 + Math.sin(t * 1.4) * 0.15; // 다리 까딱임
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale * variantScale}>
      <mesh position={[0, 0.16, 0]} rotation={[0.15, 0, 0]}>
        <capsuleGeometry args={[0.09, 0.22, 4, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <group ref={headRef} position={[0, 0.38, 0.03]}>
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0.3, -0.1]} rotation={[0.3, 0, 0]}>
        <planeGeometry args={[0.16, 0.22]} />
        <meshBasicMaterial color={scarfColor} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 까딱이는 다리(웅크린 자세 위에 얹힌 작은 실린더). */}
      <mesh ref={legRef} position={[0.06, 0.06, 0.1]} rotation={[0.5, 0, 0]}>
        <capsuleGeometry args={[0.035, 0.14, 4, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * EPIC-119(Item 1/4): 업로드된 캐릭터 .glb를 로드해 마운트하고, 그 안에
 * 애니메이션 클립이 있으면 관리자가 UniverseSettingsPanel에서 고른 클립을
 * 재생한다(THREE.AnimationMixer는 drei의 useAnimations가 내부적으로
 * 관리). onClipsLoaded로 로드된 클립 이름 목록을 부모(설정 패널)에
 * 올려보내 UI 드롭다운/버튼을 채운다.
 */
function CustomCharacterModel({
  url,
  animationClip,
  position,
  rotationY = 0,
  scale = 1,
  onClipsLoaded,
}: {
  url: string;
  animationClip: string;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  onClipsLoaded?: (clips: string[]) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    onClipsLoaded?.(names);
  }, [names, onClipsLoaded]);

  useEffect(() => {
    const clip = animationClip && names.includes(animationClip) ? animationClip : names[0];
    if (!clip) return;
    const action = actions[clip];
    action?.reset().fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.3);
    };
  }, [animationClip, names, actions]);

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

function CharacterRenderer({
  modelUrl,
  animationClip,
  position,
  rotationY = 0,
  scale = 1,
  variant = "A",
  seed = 0,
  onClipsLoaded,
}: {
  modelUrl: string;
  animationClip: string;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  variant?: "A" | "B" | "C";
  seed?: number;
  onClipsLoaded?: (clips: string[]) => void;
}) {
  const fallback = <SittingFigure position={position} rotationY={rotationY} scale={scale} variant={variant} seed={seed} />;
  if (!modelUrl) return fallback;
  return (
    <AssetLoadErrorBoundary fallback={fallback}>
      <Suspense fallback={null}>
        <CustomCharacterModel
          url={modelUrl}
          animationClip={animationClip}
          position={position}
          rotationY={rotationY}
          scale={scale}
          onClipsLoaded={onClipsLoaded}
        />
      </Suspense>
    </AssetLoadErrorBoundary>
  );
}

// ============================================================
// 장식 오브젝트(EPIC-119 Item 3/4) — SILO 행성 표면에 자동 배치.
// ============================================================

type ObjectPlacement = { position: [number, number, number]; quaternion: THREE.Quaternion };

// EPIC-119 버그 수정(사용자 신고 — "글b 오브제 추가했는데 반영이 안되네"):
// 업로드된 .glb마다 원본 모델링 단위(cm/m/임의 unit)가 제각각이라, 기존
// 고정 scale(관리자 지정값 그대로 곱하기)로는 어떤 모델은 눈에 안 보일
// 만큼 작아지거나(예: 실물 미터 단위로 만들어진 모델에 0.3을 곱하면
// 장면 스케일(행성 반지름 2.1)에 비해 사실상 점 하나) 화면을 뒤덮을
// 만큼 커질 수 있었다 — 실제 바운딩 박스를 재서 목표 크기(0.5 유닛)로
// 정규화한 뒤 관리자 scale은 그 위에 곱하는 "배율"로만 쓴다. 또한 바닥을
// y=0에 맞춰(모델 원점이 발밑이 아니라 중심일 수 있어) 행성 표면에
// "박힌" 것처럼 반쯤 파묻히지 않고 표면 위에 서도록 하고, 배치 지점의
// 구면 법선 방향으로 회전시켜 행성 어디에 놓여도 "위"가 바깥을 향하게 한다.
function UniverseObjectModel({ obj, placement }: { obj: UniverseObject; placement: ObjectPlacement }) {
  const { scene } = useGLTF(obj.url);
  const { normalized, baseOffsetY } = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    const targetSize = 0.5;
    clone.scale.setScalar(targetSize / maxDim);
    const rescaledBox = new THREE.Box3().setFromObject(clone);
    return { normalized: clone, baseOffsetY: -rescaledBox.min.y };
  }, [scene]);

  return (
    <group position={placement.position} quaternion={placement.quaternion} scale={obj.scale}>
      <primitive object={normalized} position={[0, baseOffsetY, 0]} />
    </group>
  );
}

function UniverseObjectsLayer({
  objects,
  onObjectError,
}: {
  objects: UniverseObject[];
  onObjectError: (id: string) => void;
}) {
  const placements = useMemo<ObjectPlacement[]>(
    () =>
      fibonacciSphere(Math.max(objects.length, 1), PLANET_RADIUS * 0.97).map(([x, y, z]) => {
        const normal = new THREE.Vector3(x, y, z).normalize();
        return {
          position: [x + SILO_CENTER.x, y + SILO_CENTER.y, z + SILO_CENTER.z] as [number, number, number],
          quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
        };
      }),
    [objects.length],
  );
  if (objects.length === 0) return null;
  return (
    <>
      {objects.map((obj, i) => (
        <AssetLoadErrorBoundary key={obj.id} fallback={null} onError={() => onObjectError(obj.id)}>
          <Suspense fallback={null}>
            <UniverseObjectModel obj={obj} placement={placements[i]} />
          </Suspense>
        </AssetLoadErrorBoundary>
      ))}
    </>
  );
}

// ============================================================
// 중심 행성(SILO) & 유저 행성.
// ============================================================

function CentralPlanet({
  baseColor,
  planetTextureUrl,
  characterType,
  characterModelUrl,
  characterAnimationClip,
  rotationSpeed,
  onFocus,
  onClipsLoaded,
}: {
  baseColor: string;
  planetTextureUrl: string;
  characterType: "A" | "B" | "C";
  characterModelUrl: string;
  characterAnimationClip: string;
  rotationSpeed: number;
  onFocus: () => void;
  onClipsLoaded: (clips: string[]) => void;
}) {
  const gradientMap = useToonGradientMap();
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * rotationSpeed * 0.1;
  });
  return (
    <group position={SILO_CENTER}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <PlanetMaterial baseColor={baseColor} customTextureUrl={planetTextureUrl} gradientMap={gradientMap} />
      </mesh>
      <CharacterRenderer
        modelUrl={characterModelUrl}
        animationClip={characterAnimationClip}
        position={[0.3, PLANET_RADIUS - 0.05, 0.55]}
        rotationY={-0.4}
        scale={1.3}
        variant={characterType}
        seed={1}
        onClipsLoaded={onClipsLoaded}
      />
    </group>
  );
}

function UserPlanet({
  characterType,
  characterModelUrl,
  characterAnimationClip,
  rotationSpeed,
  onFocus,
}: {
  characterType: "A" | "B" | "C";
  characterModelUrl: string;
  characterAnimationClip: string;
  rotationSpeed: number;
  onFocus: () => void;
}) {
  const gradientMap = useToonGradientMap();
  const watercolor = useWatercolorTexture("#c3d8b8");
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    groupRef.current?.position.set(USER_CENTER.x, USER_CENTER.y + Math.sin(t * 0.35) * 0.12, USER_CENTER.z);
    if (spinRef.current) spinRef.current.rotation.y += delta * rotationSpeed * 0.14;
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={spinRef}
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[USER_PLANET_RADIUS, 32, 32]} />
        <meshToonMaterial map={watercolor} gradientMap={gradientMap} />
      </mesh>
      <CharacterRenderer
        modelUrl={characterModelUrl}
        animationClip={characterAnimationClip}
        position={[-0.15, USER_PLANET_RADIUS - 0.02, 0.4]}
        rotationY={0.5}
        scale={0.9}
        variant={characterType}
        seed={2}
      />
      <Html position={[0, -USER_PLANET_RADIUS - 0.35, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-center text-white backdrop-blur-sm">
          <div className="text-xs font-medium">My Page</div>
        </div>
      </Html>
      {/* EPIC-115: "About Me" 궤도 위성 5종 — 상징적 장식(로그인 없이도
          보여줄 수 있는 카테고리 라벨), 클릭 라우팅은 아직 없음. */}
      <AboutMeSatellites rotationSpeed={rotationSpeed} />
    </group>
  );
}

function AboutMeSatellites({ rotationSpeed }: { rotationSpeed: number }) {
  const ringRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => fibonacciSphere(ABOUT_ME_SATELLITES.length, ABOUT_ME_ORBIT_RADIUS), []);
  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.y += delta * rotationSpeed * 0.2;
  });
  return (
    <group ref={ringRef}>
      {ABOUT_ME_SATELLITES.map((sat, i) => (
        <mesh key={sat.key} position={positions[i]}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshBasicMaterial color={sat.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// 연결선(실뜨개 끈) — EPIC-119(Item 5): 드래그로 잡아당기면 탄력 있게
// 늘어났다가 놓으면 스프링처럼 되돌아온다. 실제 물리 엔진 대신(단일
// 곡선 하나를 위해 rapier까지 붙이는 건 과함) 목표점(targetPull)을 향해
// lerp로 매 프레임 부드럽게 수렴시키는 감쇠 스프링 근사를 쓴다 — 드래그
// 중엔 목표점이 마우스를 바로 따라오고(빠른 수렴), 놓으면 원래 위치(약한
// 흔들림 애니메이션)로 천천히 돌아온다(느린 수렴) — 이 수렴 속도 차이가
// "탄력 있게 늘어나거나 흔들리는" 체감을 만든다.
// ============================================================

function ConnectingThread({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pull = useRef(new THREE.Vector3());
  const targetPull = useRef(new THREE.Vector3());
  const dragging = useRef(false);

  const basePoints = useMemo(() => {
    const from = SILO_CENTER.clone().add(new THREE.Vector3(1.5, 0.5, 1.1));
    const to = USER_CENTER.clone().add(new THREE.Vector3(-0.75, 0.3, 0.6));
    const mid1 = from.clone().lerp(to, 0.33).add(new THREE.Vector3(0, 0.9, 0.8));
    const mid2 = from.clone().lerp(to, 0.66).add(new THREE.Vector3(0, -0.6, -0.5));
    return { from, mid1, mid2, to };
  }, []);

  function buildGeometry(pullVec: THREE.Vector3) {
    const { from, mid1, mid2, to } = basePoints;
    const curve = new THREE.CatmullRomCurve3([
      from,
      mid1.clone().add(pullVec),
      mid2.clone().add(pullVec.clone().multiplyScalar(0.6)),
      to,
    ]);
    return new THREE.TubeGeometry(curve, 64, 0.025, 8, false);
  }

  useFrame(({ clock }) => {
    if (!dragging.current) {
      // 평상시엔 기존과 동일한 잔잔한 흔들림으로 되돌아간다.
      targetPull.current.lerp(new THREE.Vector3(0, Math.sin(clock.getElapsedTime() * 0.6) * 0.04, 0), 0.05);
    }
    pull.current.lerp(targetPull.current, dragging.current ? 0.4 : 0.08);
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = buildGeometry(pull.current);
    }
  });

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    dragging.current = true;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // no-op — 캡처 실패해도 아래 드래그 로직은 그대로 동작
    }
  }
  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    if (!dragging.current) return;
    e.stopPropagation();
    targetPull.current
      .set(e.point.x - basePoints.mid1.x, e.point.y - basePoints.mid1.y, e.point.z - basePoints.mid1.z)
      .multiplyScalar(0.9);
  }
  function handlePointerUp() {
    dragging.current = false;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={buildGeometry(new THREE.Vector3())}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
    >
      <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} />
    </mesh>
  );
}

// ============================================================
// EPIC-119(Item 6): 파티클 기반 감성 우주 배경 — Stars/Sparkles(drei) +
// 절차적 별똥별(외부 에셋 없이 작은 스트릭 메시 풀을 재활용).
// ============================================================

const SHOOTING_STAR_COUNT = 4;

function ShootingStars() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const stateRef = useRef(
    Array.from({ length: SHOOTING_STAR_COUNT }, (_, i) => ({
      t: 1 + i * 1.7,
      active: false,
      start: new THREE.Vector3(),
      dir: new THREE.Vector3(),
    })),
  );

  function spawn(s: (typeof stateRef.current)[number]) {
    const radius = 26 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const height = Math.random() * 14 - 2;
    s.start.set(Math.cos(theta) * radius, height, Math.sin(theta) * radius - 8);
    s.dir.set(-1 - Math.random(), -0.35 - Math.random() * 0.4, 0.2 + Math.random() * 0.3).normalize();
    s.t = 0;
    s.active = true;
  }

  useFrame((_, delta) => {
    stateRef.current.forEach((s, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      if (!s.active) {
        s.t -= delta;
        mesh.visible = false;
        if (s.t <= 0) spawn(s);
        return;
      }
      s.t += delta;
      const speed = 16;
      mesh.position.copy(s.start).addScaledVector(s.dir, s.t * speed);
      mesh.lookAt(mesh.position.clone().add(s.dir));
      mesh.visible = true;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.clamp(1 - s.t / 1.1, 0, 1);
      if (s.t > 1.1) {
        s.active = false;
        s.t = 3 + Math.random() * 8;
      }
    });
  });

  return (
    <>
      {/* react-hooks/refs: 렌더 중엔 상수(SHOOTING_STAR_COUNT)만 읽고,
          실제 상태는 stateRef(ref)에 두되 렌더 출력에 영향을 주지 않는다. */}
      {Array.from({ length: SHOOTING_STAR_COUNT }, (_, i) => i).map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          visible={false}
        >
          <boxGeometry args={[0.6, 0.015, 0.015]} />
          <meshBasicMaterial color="#fff8e0" transparent opacity={1} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function UniverseParticles() {
  return (
    <>
      <Stars radius={80} depth={45} count={4500} factor={3} saturation={0} fade speed={0.4} />
      <Sparkles count={140} scale={20} size={2.2} speed={0.25} color="#ffe9c2" />
      <ShootingStars />
    </>
  );
}

// ============================================================
// 궤도를 도는 대표 이미지(전체 사진, 기본 숨김) / About Silo 마커(기본 표시).
// ============================================================

function SurfaceImageFallback({ position }: { position: [number, number, number] }) {
  const gradientMap = useToonGradientMap();
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshToonMaterial color="#d9c2a3" gradientMap={gradientMap} transparent opacity={0.85} />
    </mesh>
  );
}

function SurfaceImage({
  post,
  position,
  selected,
  onSelect,
}: {
  post: FeedPost;
  position: [number, number, number];
  selected: boolean;
  onSelect: (post: FeedPost, position: [number, number, number]) => void;
}) {
  const distanceRef = useContext(DistanceContext);
  const texture = useTexture(post.photo_url as string);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ camera }) => {
    groupRef.current?.lookAt(camera.position);
    const target = surfaceOpacityFor(distanceRef.current);
    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, target, 0.08);
      materialRef.current.visible = materialRef.current.opacity > 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(post, position);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial ref={materialRef} map={texture} transparent toneMapped={false} />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[0.29, 0.33, 32]} />
          <meshBasicMaterial color="#fff3d6" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/**
 * EPIC-115(요구사항 1 "오브젝트 클린업"): 지저분한 사각형 썸네일 대신
 * 기본으로 보이는 작고 은은한 "About Silo" 마커 — 같은 게시글 데이터를
 * 가리키지만 텍스처를 로드하지 않아(Suspense/CORS 리스크 자체가 없음)
 * 가볍고 정돈돼 보인다. 클릭하면 기존과 동일하게 요약 패널이 뜬다.
 */
function AboutSiloMarker({
  post,
  position,
  selected,
  onSelect,
}: {
  post: FeedPost;
  position: [number, number, number];
  selected: boolean;
  onSelect: (post: FeedPost, position: [number, number, number]) => void;
}) {
  const distanceRef = useContext(DistanceContext);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const target = surfaceOpacityFor(distanceRef.current);
    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, target, 0.08);
      materialRef.current.visible = materialRef.current.opacity > 0.02;
    }
  });

  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(post, position);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[selected ? 0.075 : 0.055, 12, 12]} />
      <meshBasicMaterial ref={materialRef} color={selected ? "#fff3d6" : "#f4e6c8"} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  );
}

// ============================================================
// 내핵 카테고리 노드.
// ============================================================

function CoreCategoryShape({
  shape,
  color,
  chestVariant,
  cameraVariant,
}: {
  shape: (typeof CORE_CATEGORIES)[number]["shape"];
  color: string;
  chestVariant: ChestVariant;
  cameraVariant: CameraVariant;
}) {
  switch (shape) {
    case "chest": {
      const palette: Record<ChestVariant, { body: string; lid: string; hinge: string }> = {
        classic: { body: color, lid: "#a97c3f", hinge: "#e9c877" },
        gold: { body: "#c9a24b", lid: "#e9c877", hinge: "#fff3d6" },
        dark: { body: "#4a3320", lid: "#2e2115", hinge: "#b8b8b8" },
      };
      const p = palette[chestVariant];
      return (
        <group>
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.46, 0.28, 0.32]} />
            <meshToonMaterial color={p.body} />
          </mesh>
          <mesh position={[0, 0.12, -0.1]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.46, 0.22, 0.3]} />
            <meshToonMaterial color={p.lid} />
          </mesh>
          <mesh position={[0, 0.02, 0.17]}>
            <torusGeometry args={[0.035, 0.012, 8, 16]} />
            <meshToonMaterial color={p.hinge} />
          </mesh>
        </group>
      );
    }
    case "statue":
      return (
        <group>
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.1, 0.16, 0.34, 16]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.16, 16]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshToonMaterial color={color} />
          </mesh>
        </group>
      );
    // 살롱데상 — 빈티지 다이얼 전화기 + 널부러진 폴라로이드 사진들(한 오브제로 통합).
    case "phone":
      return (
        <group>
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.4, 0.14, 0.34]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, -0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 24]} />
            <meshToonMaterial color="#20261f" />
          </mesh>
          <mesh position={[0, -0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.14, 0.008, 6, 24]} />
            <meshToonMaterial color="#c9a24b" />
          </mesh>
          <mesh position={[0.05, 0.12, -0.1]} rotation={[0.4, 0.3, 0.3]}>
            <capsuleGeometry args={[0.045, 0.22, 4, 8]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* 널부러진 폴라로이드 사진들 — EPIC-114에선 camera 쪽에 있었으나
              지시문(EPIC-115 3-3)이 phone과 한 오브제로 묶으라고 명시. */}
          {([
            [-0.28, -0.24, 0.12, -0.2],
            [-0.14, -0.32, 0.2, 0.3],
            [0.05, -0.3, -0.05, 0.1],
          ] as const).map(([x, y, z, rot], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0, 0, rot]}>
              <boxGeometry args={[0.16, 0.18, 0.01]} />
              <meshToonMaterial color="#f4efe4" />
            </mesh>
          ))}
        </group>
      );
    case "camera": {
      const palette: Record<CameraVariant, { body: string; lens: string; accent: string }> = {
        vintage: { body: color, lens: "#161311", accent: "#8a6a4a" },
        black: { body: "#161311", lens: "#000000", accent: "#3a3a3a" },
        polaroid: { body: "#f4efe4", lens: "#2a2a2a", accent: "#d9534f" },
      };
      const p = palette[cameraVariant];
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.4, 0.26, 0.22]} />
            <meshToonMaterial color={p.body} />
          </mesh>
          <mesh position={[0, 0.05, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.16, 20]} />
            <meshToonMaterial color={p.lens} />
          </mesh>
          <mesh position={[-0.12, 0.16, 0]}>
            <boxGeometry args={[0.1, 0.06, 0.08]} />
            <meshToonMaterial color={p.accent} />
          </mesh>
        </group>
      );
    }
    default:
      return null;
  }
}

function CoreCategoryNode({
  label,
  sub,
  color,
  shape,
  position,
  chestVariant,
  cameraVariant,
  onNavigate,
}: {
  label: string;
  sub: string;
  color: string;
  shape: (typeof CORE_CATEGORIES)[number]["shape"];
  position: [number, number, number];
  chestVariant: ChestVariant;
  cameraVariant: CameraVariant;
  onNavigate: () => void;
}) {
  const distanceRef = useContext(DistanceContext);
  const groupRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(0);

  useFrame(() => {
    const target = coreOpacityFor(distanceRef.current);
    if (groupRef.current) {
      const current = groupRef.current.userData.opacity ?? 0;
      const next = THREE.MathUtils.lerp(current, target, 0.08);
      groupRef.current.userData.opacity = next;
      groupRef.current.visible = next > 0.02;
      groupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.Material & { opacity?: number; transparent?: boolean };
          mat.transparent = true;
          mat.opacity = next;
        }
      });
      const rounded = Math.round(next * 20) / 20;
      setOpacity((prev) => (prev === rounded ? prev : rounded));
    }
  });

  return (
    <group ref={groupRef} position={position} visible={false}>
      <group
        scale={0.85}
        onClick={(e) => {
          e.stopPropagation();
          onNavigate();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <CoreCategoryShape shape={shape} color={color} chestVariant={chestVariant} cameraVariant={cameraVariant} />
      </group>
      {opacity > 0.05 && (
        <>
          <Text
            position={[0, -0.32, 0]}
            fontSize={0.09}
            color="#fff3da"
            anchorX="center"
            anchorY="middle"
            fillOpacity={opacity}
            outlineWidth={0.006}
            outlineColor="#2a1c0f"
          >
            {label}
          </Text>
          <Html center distanceFactor={5} position={[0, -0.48, 0]} style={{ pointerEvents: "none" }}>
            <div style={{ opacity }} className="whitespace-nowrap text-[10px] text-white/70">
              {sub}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

function CoreCategories({
  router,
  chestVariant,
  cameraVariant,
}: {
  router: ReturnType<typeof useRouter>;
  chestVariant: ChestVariant;
  cameraVariant: CameraVariant;
}) {
  const positions = useMemo(() => {
    const base = fibonacciSphere(CORE_CATEGORIES.length, 0.9);
    return base.map(([x, y, z]) => [x + SILO_CENTER.x, y + SILO_CENTER.y, z + SILO_CENTER.z] as [number, number, number]);
  }, []);
  return (
    <>
      {CORE_CATEGORIES.map((cat, i) => (
        <CoreCategoryNode
          key={cat.key}
          label={cat.label}
          sub={cat.sub}
          color={cat.color}
          shape={cat.shape}
          position={positions[i]}
          chestVariant={chestVariant}
          cameraVariant={cameraVariant}
          onNavigate={() => router.push(cat.href)}
        />
      ))}
    </>
  );
}

// ============================================================
// Scene — Canvas 내부 전체.
// ============================================================

function Scene({
  posts,
  selectedId,
  onSelect,
  cameraControlsRef,
  distanceRef,
  config,
  onClipsLoaded,
  onFocusPlanet,
  onObjectError,
}: {
  posts: FeedPost[];
  selectedId: string | null;
  onSelect: (post: FeedPost, position: [number, number, number]) => void;
  cameraControlsRef: RefObject<CameraControlsImpl | null>;
  distanceRef: DistanceRef;
  config: UniverseConfig;
  onClipsLoaded: (clips: string[]) => void;
  onFocusPlanet: (center: THREE.Vector3, radius: number) => void;
  onObjectError: (id: string) => void;
}) {
  const router = useRouter();
  const orbitGroupRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const base = fibonacciSphere(posts.length, IMAGE_ORBIT_RADIUS);
    return base.map(([x, y, z]) => [x + SILO_CENTER.x, y + SILO_CENTER.y, z + SILO_CENTER.z] as [number, number, number]);
  }, [posts.length]);

  // EPIC-115: 궤도 공전 속도 슬라이더 — 이미지/마커 전체를 SILO 중심
  // 기준으로 회전시킨다(개별 위치가 아니라 부모 그룹을 돌리는 방식이라
  // 피보나치 배치 간격이 항상 균등하게 유지된다).
  useFrame((_, delta) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.position.copy(SILO_CENTER);
      orbitGroupRef.current.rotation.y += delta * config.orbitSpeed * 0.15;
    }
  });

  return (
    <DistanceContext.Provider value={distanceRef}>
      <ambientLight intensity={0.7} color="#ffe0ba" />
      <directionalLight position={[4, 6, 5]} intensity={0.8} color="#ffe6c4" />
      <directionalLight position={[-5, -2, -4]} intensity={0.2} color="#c9d8ff" />

      <UniverseParticles />

      <CentralPlanet
        baseColor={config.planetColor}
        planetTextureUrl={config.planetTextureUrl}
        characterType={config.characterType}
        characterModelUrl={config.characterModelUrl}
        characterAnimationClip={config.characterAnimationClip}
        rotationSpeed={config.orbitSpeed}
        onFocus={() => onFocusPlanet(SILO_CENTER, PLANET_RADIUS)}
        onClipsLoaded={onClipsLoaded}
      />
      <UserPlanet
        characterType={config.characterType}
        characterModelUrl={config.characterModelUrl}
        characterAnimationClip={config.characterAnimationClip}
        rotationSpeed={config.orbitSpeed}
        onFocus={() => onFocusPlanet(USER_CENTER, USER_PLANET_RADIUS)}
      />
      <ConnectingThread color={config.lineColor} />
      <CoreCategories router={router} chestVariant={config.chestVariant} cameraVariant={config.cameraVariant} />
      <UniverseObjectsLayer objects={config.objects} onObjectError={onObjectError} />

      <group ref={orbitGroupRef}>
        {posts.map((post, i) => {
          const localPos: [number, number, number] = [
            positions[i][0] - SILO_CENTER.x,
            positions[i][1] - SILO_CENTER.y,
            positions[i][2] - SILO_CENTER.z,
          ];
          if (!config.showThumbnails) {
            return (
              <AboutSiloMarker
                key={post.id}
                post={post}
                position={localPos}
                selected={selectedId === post.id}
                onSelect={onSelect}
              />
            );
          }
          return (
            <AssetLoadErrorBoundary key={post.id} fallback={<SurfaceImageFallback position={localPos} />}>
              <Suspense fallback={null}>
                <SurfaceImage post={post} position={localPos} selected={selectedId === post.id} onSelect={onSelect} />
              </Suspense>
            </AssetLoadErrorBoundary>
          );
        })}
      </group>

      <CameraDistanceTracker distanceRef={distanceRef} />
      <CameraControls ref={cameraControlsRef} minDistance={0.6} maxDistance={MAX_ZOOM_DISTANCE} dollySpeed={0.55} />

      <EffectComposer multisampling={0}>
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </DistanceContext.Provider>
  );
}

// ============================================================
// 선택된 게시글 요약 패널.
// ============================================================

function SelectedPostPanel({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const [excerpt, setExcerpt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setExcerpt(null);
    if (!post.board_slug) return;
    fetch(`/api/boards/${post.board_slug}/posts/${post.slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.post) return;
        setExcerpt(htmlToExcerpt(data.post.body, 140));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [post.board_slug, post.slug]);

  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-50 w-[min(420px,88vw)] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/55 p-5 text-white shadow-2xl backdrop-blur-md">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 text-sm text-white/60 hover:text-white" aria-label="닫기">
        ✕
      </button>
      <p className="text-[11px] uppercase tracking-wide text-white/50">{post.board_name}</p>
      <h3 className="mt-1 text-lg font-medium">{post.title || "제목 없음"}</h3>
      <p className="mt-2 min-h-[2.5em] text-sm text-white/75">{excerpt ?? "불러오는 중..."}</p>
      {post.board_slug && (
        <a href={`/boards/${post.board_slug}/${post.slug}`} className="mt-3 inline-block text-sm text-amber-200 hover:underline">
          자세히 보기 →
        </a>
      )}
    </div>
  );
}

// ============================================================
// AboutSiloUniverse — 최상위 컴포넌트. Leva 설정 패널 + UniverseSettingsPanel
// (파일 업로드/배열/드롭다운)을 여기서 조합하고, 저장/자동저장(EPIC-119
// Item 7)을 관리한다.
// ============================================================

const UNIVERSE_SETTINGS_KEY = "about_silo_universe";
const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;

export function AboutSiloUniverse() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [selected, setSelected] = useState<FeedPost | null>(null);
  const cameraControlsRef = useRef<CameraControlsImpl>(null);
  const distanceRef = useRef<number>(HOME_CAMERA_POS.distanceTo(SILO_CENTER));

  // EPIC-119: 파일 업로드/배열/드롭다운처럼 Leva로 표현하기 애매한 값들 —
  // UniverseSettingsPanel이 이 state를 직접 patch한다.
  const [panelConfig, setPanelConfig] = useState<UniverseConfig>(defaultUniverseConfig());
  const [availableClips, setAvailableClips] = useState<string[]>([]);
  // EPIC-119 버그 수정: 오브젝트 .glb 로드가 실패해도 기존엔 조용히
  // 아무것도 안 보여줘서("반영이 안 되네") 관리자가 원인을 알 수 없었다
  // — 실패한 오브젝트 id를 모아 UniverseSettingsPanel에 "⚠ 로드 실패"로
  // 표시한다.
  const [failedObjectIds, setFailedObjectIds] = useState<Set<string>>(new Set());
  function handleObjectError(id: string) {
    setFailedObjectIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [toast, setToast] = useState(false);

  function updatePanelConfig(patch: Partial<UniverseConfig>) {
    setPanelConfig((prev) => ({ ...prev, ...patch }));
  }

  // EPIC-115(요구사항 4)/EPIC-119: 3D 우주 설정 패널 — Leva가 화면에 자동으로
  // 플로팅 패널을 그린다(별도 <Leva/> 마운트 불필요). [값, set] 형태로
  // 받아 DB 로드 시 set()으로 초깃값을 밀어 넣는다(아래 로드 useEffect 참고).
  const [{ backgroundMode, preset }, setBgControls] = useControls("배경", () => ({
    backgroundMode: { label: "모드", options: { 유튜브: "youtube", 프리셋: "preset" } as Record<string, "youtube" | "preset"> },
    preset: {
      label: "프리셋",
      options: { "크림 백지": "cream", "딥 블루": "deepBlue", "수채화 블루": "watercolor" } as Record<string, BackgroundPreset>,
      render: (get) => get("배경.backgroundMode") === "preset",
    },
  }));

  const [{ planetColor, showThumbnails, orbitSpeed }, setPlanetControls] = useControls("행성", () => ({
    planetColor: "#e3a874",
    showThumbnails: false,
    orbitSpeed: { value: 0.15, min: 0, max: 1, step: 0.05 },
  }));

  const [{ characterType }, setCharacterControls] = useControls("캐릭터", () => ({
    characterType: { label: "폴백 모델(업로드 없을 때)", options: { "Type A": "A", "Type B": "B", "Type C": "C" } as Record<string, "A" | "B" | "C"> },
  }));

  const [{ chestVariant, cameraVariant }, setCoreControls] = useControls("내핵 오브젝트", () => ({
    chestVariant: {
      label: "보물상자 종류",
      options: { "클래식 브라운": "classic", "골드 트림": "gold", "다크 오크": "dark" } as Record<string, ChestVariant>,
    },
    cameraVariant: {
      label: "카메라 종류",
      options: { "빈티지 브라운": "vintage", "블랙 필름": "black", 폴라로이드형: "polaroid" } as Record<string, CameraVariant>,
    },
  }));

  // EPIC-119(Item 5): 실뜨개 연결선 색상.
  const [{ lineColor }, setLineControls] = useControls("연결선", () => ({
    lineColor: "#f2e2b8",
  }));

  const config: UniverseConfig = {
    ...panelConfig,
    backgroundMode,
    preset,
    planetColor,
    showThumbnails,
    orbitSpeed,
    characterType,
    chestVariant,
    cameraVariant,
    lineColor,
  };
  // react-hooks/refs: ref는 렌더 중이 아니라 effect에서 써야 한다 — 이
  // ref는 handleSave/자동저장 인터벌이 "항상 최신 config"를 읽기 위한
  // 것일 뿐 렌더 출력과는 무관해 매 렌더 후 effect로 동기화한다.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  // EPIC-119(Item 7): DB(site_settings.about_silo_universe)에서 저장된
  // 설정을 불러와 Leva(set 함수들)와 panelConfig 양쪽에 반영.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", UNIVERSE_SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const loaded = normalizeUniverseConfig(data?.setting_value);
        setBgControls({ backgroundMode: loaded.backgroundMode, preset: loaded.preset });
        setPlanetControls({ planetColor: loaded.planetColor, showThumbnails: loaded.showThumbnails, orbitSpeed: loaded.orbitSpeed });
        setCharacterControls({ characterType: loaded.characterType });
        setCoreControls({ chestVariant: loaded.chestVariant, cameraVariant: loaded.cameraVariant });
        setLineControls({ lineColor: loaded.lineColor });
        setPanelConfig(loaded);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { setting_key: UNIVERSE_SETTINGS_KEY, setting_value: configRef.current, updated_at: new Date().toISOString() },
        { onConflict: "setting_key" },
      );
    setSaving(false);
    if (!error) {
      setSavedAt(Date.now());
      setToast(true);
      setTimeout(() => setToast(false), 2200);
    }
  }

  // EPIC-119(Item 7): 5분 자동 저장 — configRef가 매 렌더 최신값으로
  // 갱신되므로, 인터벌 자체는 autoSaveEnabled가 바뀔 때만 재설정된다.
  useEffect(() => {
    if (!panelConfig.autoSaveEnabled) return;
    const id = setInterval(() => {
      handleSave();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelConfig.autoSaveEnabled]);

  useEffect(() => {
    let cancelled = false;
    fetchUniverseImages(panelConfig.boardSlug).then((items) => {
      if (!cancelled) setPosts(items);
    });
    return () => {
      cancelled = true;
    };
  }, [panelConfig.boardSlug]);

  // EPIC-114 발견/EPIC-115 유지: CameraControls는 마운트 시 Canvas의 초기
  // camera position을 자기 나름대로 재해석하고, R3F는 부모(DOM) 트리와
  // 별도 리컨실러로 커밋하므로 이 effect가 처음 돌 때 ref가 아직 null일
  // 수 있다 — 매 프레임 재시도해 실제로 준비된 다음에만 홈 구도로 스냅.
  useEffect(() => {
    if (!posts) return;
    let raf = 0;
    function trySnap() {
      const controls = cameraControlsRef.current;
      if (!controls) {
        raf = requestAnimationFrame(trySnap);
        return;
      }
      controls.setLookAt(
        HOME_CAMERA_POS.x, HOME_CAMERA_POS.y, HOME_CAMERA_POS.z,
        HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z,
        false,
      );
    }
    trySnap();
    return () => cancelAnimationFrame(raf);
  }, [posts]);

  function handleSelect(post: FeedPost, position: [number, number, number]) {
    setSelected(post);
    const controls = cameraControlsRef.current;
    if (!controls) return;
    const target = new THREE.Vector3(...position);
    const normal = target.clone().sub(SILO_CENTER).normalize();
    const camPos = SILO_CENTER.clone().add(normal.multiplyScalar(IMAGE_ORBIT_RADIUS + 0.9));
    controls.setLookAt(camPos.x, camPos.y, camPos.z, target.x, target.y, target.z, true);
  }

  // EPIC-119(Item 5): 행성(SILO/유저) 자체를 클릭하면 카메라가 그 행성을
  // 화면 중심으로 부드럽게 줌인(fit to object)한다 — 반지름의 2.2배
  // 거리에서 살짝 위/옆으로 바라보는 구도로 접근.
  function handleFocusPlanet(center: THREE.Vector3, radius: number) {
    const controls = cameraControlsRef.current;
    if (!controls) return;
    const dir = new THREE.Vector3(0.4, 0.3, 1).normalize();
    const camPos = center.clone().add(dir.multiplyScalar(radius * 2.2));
    controls.setLookAt(camPos.x, camPos.y, camPos.z, center.x, center.y, center.z, true);
  }

  function handleReset() {
    setSelected(null);
    cameraControlsRef.current?.setLookAt(
      HOME_CAMERA_POS.x, HOME_CAMERA_POS.y, HOME_CAMERA_POS.z,
      HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z,
      true,
    );
  }

  return (
    <div className="relative h-[85vh] min-h-[560px] w-full overflow-hidden bg-transparent">
      {backgroundMode === "youtube" ? (
        <YoutubeBackground urls={panelConfig.youtubeUrls} />
      ) : (
        <PresetBackground preset={preset} />
      )}

      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        camera={{ position: HOME_CAMERA_POS.toArray(), fov: 55 }}
      >
        {posts && (
          <Scene
            posts={posts}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
            cameraControlsRef={cameraControlsRef}
            distanceRef={distanceRef}
            config={config}
            onClipsLoaded={setAvailableClips}
            onFocusPlanet={handleFocusPlanet}
            onObjectError={handleObjectError}
          />
        )}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="pointer-events-auto flex items-start justify-between text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">About Silo</p>
            <h1 className="mt-1 text-2xl font-light drop-shadow">사일로의 우주</h1>
            <p className="mt-1 max-w-sm text-xs text-white/70">
              떠 있는 마커를 클릭해 가까이 다가가고, 휠을 굴려 행성 안쪽 세계로 들어가 보세요. 행성 자체를 클릭하면 그 행성으로 바로 다가갑니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-white/20 bg-black/30 px-4 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/50"
          >
            처음으로
          </button>
        </div>

        {!posts && (
          <div className="pointer-events-auto self-center rounded-full bg-black/40 px-4 py-2 text-xs text-white/70">
            우주를 준비하는 중...
          </div>
        )}

        {selected && <SelectedPostPanel post={selected} onClose={handleReset} />}

        <UniverseSettingsPanel
          config={panelConfig}
          onChange={updatePanelConfig}
          availableClips={availableClips}
          onSave={handleSave}
          saving={saving}
          savedAt={savedAt}
          failedObjectIds={failedObjectIds}
        />

        {/* EPIC-119(Item 7): 저장됨 토스트. */}
        {toast && (
          <div className="pointer-events-none fixed right-6 top-6 z-50 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs text-white shadow-xl backdrop-blur-sm">
            ✓ 저장됨
          </div>
        )}
      </div>
    </div>
  );
}
