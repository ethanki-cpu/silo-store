"use client";

// EPIC-113/114/115/119/121: /about-silo를 "어린 왕자" 감성의 3D 우주(행성+
// 궤도+위성)로 개편하는 프로토타입. React Three Fiber(three.js) 기반.
//
// EPIC-121(사용자 지시 — 여러 항목): (1) 행성 표면의 얼룩덜룩한 줄무늬는
// meshToonMaterial의 3단 gradientMap(셀 셰이딩 경계선)이 실사 텍스처
// 위에서 이음매처럼 보이던 것 — PlanetMaterial을 toon 셰이딩 없는 2겹
// 구(베이스 색 + 텍스처, opacity로 블렌드)로 교체. (2) CameraControls에
// 극각 제한이 없는데도 "행성 아래에서 위로 못 돌린다"는 신고 — 명시적으로
// minPolarAngle=0/maxPolarAngle=π를 박아 모호함을 없앰. (3) Leva(별도
// 우측 패널)를 걷어내고 UniverseSettingsPanel 하나로 합침. (4) "내핵
// 오브젝트"(카테고리 4종)를 행성 안에 숨겨뒀다 확대해야만 보이던 LOD
// 연출을 없애고 장식 오브젝트와 동일하게 표면 위에 항상 보이도록 변경.
// (5) 오브젝트 위치를 TransformControls로 드래그 이동 + 우측 인스펙터
// 패널(ObjectInspectorPanel)에서 크기 조절. (6) 게시글 썸네일을 평면
// 대신 구체로. (7) 행성 이름/색상↔텍스처 블렌드 투명도 추가.
//
// 범위 밖으로 명시적으로 미룬 것(다음 EPIC): 행성 두 개가 서로의 둘레를
// 실제로 공전하는 것(거리/속도를 물리적으로 애니메이션) — 지금은 모든
// 자식(카테고리/오브젝트/궤도 마커)이 SILO_CENTER를 "고정 월드 좌표"로
// 삼아 위치를 계산하는 구조라, 행성 자체를 움직이려면 이 모든 자식을
// 하나의 움직이는 그룹 아래로 재배치해야 하는 큰 리팩터가 필요하다 —
// 잘못 서두르면 카메라 추적/거리 기반 페이드/연결선이 전부 어긋날 위험이
// 커서 이번 범위에서는 제외하고 사용자에게 별도로 알린다.
//
// 아키텍처 결정 메모(EPIC-115/119 유지):
// - "수채화 텍스처"/"프리셋 배경"은 여전히 절차적 대체(에셋 업로드 시
//   PlanetMaterial/YoutubeBackground가 우선한다).
// - HOTFIX-122(사용자 지시): 카메라 거리 기반 opacity 페이드(옛 "내핵
//   오브젝트" LOD 연출의 잔재)는 EPIC-121에서 카테고리부터 뗐고, 이번에
//   게시글 마커에서도 완전히 제거했다 — 클릭해서 카메라가 다가갈수록
//   마커가 반대로 옅어지며 깜빡이던 버그의 원인이었다. 이제 씬 안의
//   모든 요소는 거리와 무관하게 항상 보인다.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
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
  TransformControls,
  useTexture,
  useGLTF,
  useAnimations,
  Stars,
  Sparkles,
  type CameraControls as CameraControlsImpl,
} from "@react-three/drei";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
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
import { PresetBackground } from "./PresetBackground";
import { UniverseSettingsPanel } from "./UniverseSettingsPanel";
import { ObjectInspectorPanel } from "./ObjectInspectorPanel";

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

// boardSlug가 있으면 그 게시판 글만, 없으면(기존과 동일) 추천/인기/최신을
// 통합한 전체 피드를 쓴다.
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

// 4대 카테고리 실제 라우트 + 보물상자/카메라 변형(설정 패널의 "기본
// 카테고리 마커 모양"과 연결).
type ChestVariant = "classic" | "gold" | "dark";
type CameraVariant = "vintage" | "black" | "polaroid";

const CORE_CATEGORIES = [
  { key: "silostore", label: "사일로 상점", sub: "Silo Store", href: "/silo-store", color: "#c99a5b", shape: "chest" as const },
  { key: "docent", label: "온라인 도슨트", sub: "Online Docent", href: "/online-docent", color: "#e7ddce", shape: "statue" as const },
  { key: "salon", label: "살롱데상", sub: "Salon des Cent", href: "/salon-des-cent", color: "#3f4a3d", shape: "phone" as const },
  { key: "studio", label: "스튜디오", sub: "Studio", href: "/studio", color: "#4a3626", shape: "camera" as const },
] as const;

// "About Me" 궤도 위성 — 로그인 없이도(공개 페이지) 보여줄 수 있는
// 마이페이지 성격의 상징적 카테고리 5종(장식용, /mypage 하위 탭 라벨과
// 맞춤). 실제 개인 데이터 연결은 범위 밖.
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
// 오브젝트/카테고리가 실제로 표면 위에 서도록(안이 아니라) 쓰는 반지름.
const SURFACE_PLACEMENT_RADIUS = PLANET_RADIUS * 0.97;

const IMAGE_ORBIT_RADIUS = 2.55;
const ABOUT_ME_ORBIT_RADIUS = 1.75;
const HOME_TARGET = new THREE.Vector3(0.1, -0.1, 0);
const HOME_CAMERA_POS = new THREE.Vector3(0.6, 2.2, 11.5);
// 줌아웃 한계를 사실상 해제.
const MAX_ZOOM_DISTANCE = 5000;

// ============================================================
// 텍스처 유틸.
// ============================================================

/**
 * 행성 표면에 붓터치/얼룩 노이즈를 겹쳐 그린 CanvasTexture — 관리자가
 * 지형 텍스처를 업로드하지 않았을 때의 절차적 대체(외부 에셋 파일 없음).
 * baseColor가 바뀌면 다시 굽는다.
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

// 이미지 텍스처든 .glb 모델이든, 에셋 로드가 실패하면(CORS/잘못된 URL
// 등) 크래시 대신 폴백을 보여주는 공용 경계.
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

/**
 * HOTFIX-121(사용자 신고 — "왜 행성에 줄무늬가 있는거야?"): meshToonMaterial의
 * 3단 gradientMap(셀 셰이딩)이 매끈한 절차적 색상에는 "만화 같은" 느낌을
 * 줬지만, 실사 텍스처 위에서는 조명 경계선이 봉제선/얼룩처럼 도드라져
 * 보였다 — 여기서는 toon 셰이딩을 완전히 빼고, 베이스 색 구 위에 텍스처
 * 구를 살짝 더 큰 반지름으로 겹쳐(opacity로 블렌드) 자연스러운 색+텍스처
 * 혼합을 만든다(사용자 지시 — "행성 색과 텍스처가 섞일 수 있게, 투명도
 * 설정 가능하게").
 */
function CustomPlanetTextureLayer({ url, radius, opacity }: { url: string; radius: number; opacity: number }) {
  const texture = useTexture(url);
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function PlanetMaterial({
  baseColor,
  customTextureUrl,
  textureOpacity,
  radius,
}: {
  baseColor: string;
  customTextureUrl: string;
  textureOpacity: number;
  radius: number;
}) {
  const watercolor = useWatercolorTexture(baseColor);
  return (
    <>
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial map={watercolor} color={customTextureUrl ? baseColor : "#ffffff"} />
      </mesh>
      {customTextureUrl && (
        <AssetLoadErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <CustomPlanetTextureLayer url={customTextureUrl} radius={radius * 1.003} opacity={textureOpacity} />
          </Suspense>
        </AssetLoadErrorBoundary>
      )}
    </>
  );
}

// ============================================================
// 캐릭터 — 업로드된 .glb가 있으면 그걸, 없으면 절차적 실루엣(폴백)을
// 렌더링한다.
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
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + seed * 7.3;
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.35;
      headRef.current.rotation.x = Math.sin(t * 0.33 + 1) * 0.1;
    }
    if (legRef.current) {
      legRef.current.rotation.x = 0.5 + Math.sin(t * 1.4) * 0.15;
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
      <mesh ref={legRef} position={[0.06, 0.06, 0.1]} rotation={[0.5, 0, 0]}>
        <capsuleGeometry args={[0.035, 0.14, 4, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

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
// 표면 배치 유틸 — 오브젝트/카테고리가 실제로 행성 "위"에 서도록 위치+
// 방향(구면 법선)을 함께 계산한다.
// ============================================================

type SurfacePlacement = { position: [number, number, number]; quaternion: THREE.Quaternion };

function surfacePlacementsFor(count: number, radius: number): SurfacePlacement[] {
  return fibonacciSphere(Math.max(count, 1), radius).map(([x, y, z]) => {
    const normal = new THREE.Vector3(x, y, z).normalize();
    return {
      position: [x + SILO_CENTER.x, y + SILO_CENTER.y, z + SILO_CENTER.z] as [number, number, number],
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
    };
  });
}

// ============================================================
// 장식 오브젝트 — SILO 행성 표면에 배치, 클릭으로 선택 → 드래그(부모
// AboutSiloUniverse의 TransformControls)로 위치 이동.
// ============================================================

function UniverseObjectModel({
  obj,
  placement,
  selected,
  onSelect,
  registerRef,
}: {
  obj: UniverseObject;
  placement: SurfacePlacement;
  selected: boolean;
  onSelect: () => void;
  registerRef: (group: THREE.Group | null) => void;
}) {
  const { scene } = useGLTF(obj.url);
  // 원본 모델링 단위(cm/m/임의 unit)가 업로드마다 제각각이라, 실제
  // 바운딩 박스를 재서 목표 크기(0.5 유닛)로 정규화한 뒤 관리자 scale은
  // 그 위에 곱하는 배율로만 쓴다. 바닥을 y=0에 맞춰 표면 위에 서게 한다.
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
    <group
      ref={registerRef}
      position={placement.position}
      quaternion={placement.quaternion}
      scale={obj.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <primitive object={normalized} position={[0, baseOffsetY, 0]} />
      {selected && (
        <mesh position={[0, baseOffsetY + 0.25, 0]}>
          <ringGeometry args={[0.28, 0.32, 24]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function UniverseObjectsLayer({
  objects,
  onObjectError,
  selectedObjectId,
  onSelectObject,
  registerObjectRef,
}: {
  objects: UniverseObject[];
  onObjectError: (id: string) => void;
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  registerObjectRef: (id: string, group: THREE.Group | null) => void;
}) {
  const defaults = useMemo(() => surfacePlacementsFor(objects.length, SURFACE_PLACEMENT_RADIUS), [objects.length]);
  if (objects.length === 0) return null;
  return (
    <>
      {objects.map((obj, i) => {
        const placement: SurfacePlacement = obj.position
          ? { position: obj.position, quaternion: defaults[i].quaternion }
          : defaults[i];
        return (
          <AssetLoadErrorBoundary key={obj.id} fallback={null} onError={() => onObjectError(obj.id)}>
            <Suspense fallback={null}>
              <UniverseObjectModel
                obj={obj}
                placement={placement}
                selected={selectedObjectId === obj.id}
                onSelect={() => onSelectObject(obj.id)}
                registerRef={(g) => registerObjectRef(obj.id, g)}
              />
            </Suspense>
          </AssetLoadErrorBoundary>
        );
      })}
    </>
  );
}

// ============================================================
// 중심 행성(SILO) & 유저 행성.
// ============================================================

function CentralPlanet({
  name,
  baseColor,
  planetTextureUrl,
  planetTextureOpacity,
  characterType,
  characterModelUrl,
  characterAnimationClip,
  rotationSpeed,
  onFocus,
  onClipsLoaded,
}: {
  name: string;
  baseColor: string;
  planetTextureUrl: string;
  planetTextureOpacity: number;
  characterType: "A" | "B" | "C";
  characterModelUrl: string;
  characterAnimationClip: string;
  rotationSpeed: number;
  onFocus: () => void;
  onClipsLoaded: (clips: string[]) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * rotationSpeed * 0.1;
  });
  return (
    <group position={SILO_CENTER}>
      <group
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <PlanetMaterial baseColor={baseColor} customTextureUrl={planetTextureUrl} textureOpacity={planetTextureOpacity} radius={PLANET_RADIUS} />
      </group>
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
      {name && (
        <Html position={[0, PLANET_RADIUS + 0.5, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-center text-white backdrop-blur-sm">
            <div className="text-xs font-medium">{name}</div>
          </div>
        </Html>
      )}
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
        <meshStandardMaterial map={watercolor} />
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
// 연결선(실뜨개 끈) — 드래그로 잡아당기면 탄력 있게 늘어났다가 놓으면
// 스프링처럼 되돌아온다(lerp 기반 감쇠 근사, 실제 물리 엔진 아님).
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
// 파티클 기반 감성 우주 배경 — Stars/Sparkles(drei) + 절차적 별똥별.
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
// 궤도를 도는 게시글 마커. HOTFIX-122(사용자 지시 — "썸네일을 sphere로
// 만드는 건 확인해보니 별로야, 차라리 SILO 행성을 orbit하는 조그만
// 별 모양으로 하고 마우스를 hover하면 동그란 썸네일이 나오게 해줘"):
// 사진 텍스처를 입힌 구 대신 작은 별(팔면체) 모양으로 바꾸고, 실제
// 사진은 hover할 때만 일반 HTML <img>(원형)로 떠 있는 미리보기로
// 보여준다 — Three.js 텍스처 로딩(Suspense/useTexture) 자체가 필요 없어
// 코드가 단순해지고, "클릭하면 썸네일이 깜빡인다"는 신고의 원인이었던
// 거리 기반 opacity 페이드(surfaceOpacityFor, 옛 "내핵 오브젝트" LOD
// 연출의 잔재 — EPIC-121에서 카테고리는 이미 뗐지만 게시글 마커는
// 그대로 남아 있었다: 카메라가 클릭 시 마커 쪽으로 가까이 다가가면
// 이 로직이 거꾸로 opacity를 낮춰 사라지려 했다)도 완전히 제거했다.
// ============================================================

function OrbitStarMarker({
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
  const [hovered, setHovered] = useState(false);
  const starRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (starRef.current) {
      starRef.current.rotation.y = clock.getElapsedTime() * 0.6;
      starRef.current.rotation.x = clock.getElapsedTime() * 0.4;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={starRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(post, position);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <octahedronGeometry args={[selected ? 0.09 : 0.07, 0]} />
        <meshBasicMaterial color={selected ? "#fff3d6" : "#f4e6c8"} toneMapped={false} />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[0.13, 0.16, 24]} />
          <meshBasicMaterial color="#fff3d6" transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {hovered && post.photo_url && (
        <Html center distanceFactor={6} position={[0, 0.24, 0]} style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "9999px",
              overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.85)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.photo_url}
              alt={post.title ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================
// 기본 카테고리 마커(사일로 상점/온라인 도슨트/살롱데상/스튜디오).
// HOTFIX-121(사용자 지시 — "나는 행성 안에 '내핵 오브제'를 원하지 않아,
// 오브제들이 행성 표면 위에 놓여 있는 걸 원해"): 예전엔 반지름 0.9(행성
// 반지름 2.1보다 작은 안쪽)에 숨겨두고 카메라가 가까이 다가가야만
// 서서히 드러나는 LOD 연출이었다 — 장식 오브젝트와 동일하게 표면
// (SURFACE_PLACEMENT_RADIUS) 위에 항상 보이도록 바꿨다.
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
            <meshStandardMaterial color={p.body} />
          </mesh>
          <mesh position={[0, 0.12, -0.1]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.46, 0.22, 0.3]} />
            <meshStandardMaterial color={p.lid} />
          </mesh>
          <mesh position={[0, 0.02, 0.17]}>
            <torusGeometry args={[0.035, 0.012, 8, 16]} />
            <meshStandardMaterial color={p.hinge} />
          </mesh>
        </group>
      );
    }
    case "statue":
      return (
        <group>
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.1, 0.16, 0.34, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case "phone":
      return (
        <group>
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.4, 0.14, 0.34]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, -0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 24]} />
            <meshStandardMaterial color="#20261f" />
          </mesh>
          <mesh position={[0, -0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.14, 0.008, 6, 24]} />
            <meshStandardMaterial color="#c9a24b" />
          </mesh>
          <mesh position={[0.05, 0.12, -0.1]} rotation={[0.4, 0.3, 0.3]}>
            <capsuleGeometry args={[0.045, 0.22, 4, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {([
            [-0.28, -0.24, 0.12, -0.2],
            [-0.14, -0.32, 0.2, 0.3],
            [0.05, -0.3, -0.05, 0.1],
          ] as const).map(([x, y, z, rot], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0, 0, rot]}>
              <boxGeometry args={[0.16, 0.18, 0.01]} />
              <meshStandardMaterial color="#f4efe4" />
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
            <meshStandardMaterial color={p.body} />
          </mesh>
          <mesh position={[0, 0.05, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.16, 20]} />
            <meshStandardMaterial color={p.lens} />
          </mesh>
          <mesh position={[-0.12, 0.16, 0]}>
            <boxGeometry args={[0.1, 0.06, 0.08]} />
            <meshStandardMaterial color={p.accent} />
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
  placement,
  chestVariant,
  cameraVariant,
  onNavigate,
}: {
  label: string;
  sub: string;
  color: string;
  shape: (typeof CORE_CATEGORIES)[number]["shape"];
  placement: SurfacePlacement;
  chestVariant: ChestVariant;
  cameraVariant: CameraVariant;
  onNavigate: () => void;
}) {
  return (
    <group position={placement.position} quaternion={placement.quaternion}>
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
      <Text
        position={[0, 0.34, 0]}
        fontSize={0.09}
        color="#fff3da"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor="#2a1c0f"
      >
        {label}
      </Text>
      <Html center distanceFactor={5} position={[0, 0.48, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap text-[10px] text-white/70">{sub}</div>
      </Html>
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
  const placements = useMemo(() => surfacePlacementsFor(CORE_CATEGORIES.length, SURFACE_PLACEMENT_RADIUS), []);
  return (
    <>
      {CORE_CATEGORIES.map((cat, i) => (
        <CoreCategoryNode
          key={cat.key}
          label={cat.label}
          sub={cat.sub}
          color={cat.color}
          shape={cat.shape}
          placement={placements[i]}
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
  config,
  onClipsLoaded,
  onFocusPlanet,
  onObjectError,
  selectedObjectId,
  onSelectObject,
  objectRefs,
  onObjectMoved,
}: {
  posts: FeedPost[];
  selectedId: string | null;
  onSelect: (post: FeedPost, position: [number, number, number]) => void;
  cameraControlsRef: RefObject<CameraControlsImpl | null>;
  config: UniverseConfig;
  onClipsLoaded: (clips: string[]) => void;
  onFocusPlanet: (center: THREE.Vector3, radius: number) => void;
  onObjectError: (id: string) => void;
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  objectRefs: RefObject<Map<string, THREE.Group>>;
  onObjectMoved: (id: string, position: [number, number, number]) => void;
}) {
  const router = useRouter();
  const orbitGroupRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const base = fibonacciSphere(posts.length, IMAGE_ORBIT_RADIUS);
    return base.map(([x, y, z]) => [x + SILO_CENTER.x, y + SILO_CENTER.y, z + SILO_CENTER.z] as [number, number, number]);
  }, [posts.length]);

  useFrame((_, delta) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.position.copy(SILO_CENTER);
      orbitGroupRef.current.rotation.y += delta * config.orbitSpeed * 0.15;
    }
  });

  // EPIC-121: 선택된 오브젝트의 실제 THREE.Group을 TransformControls에
  // 붙인다 — objectRefs는 UniverseObjectsLayer가 커밋 시점에 채우므로
  // (렌더 중이 아니라 클릭 이벤트 핸들러에서 읽으므로) react-hooks/refs
  // 위반 없이 안전하다(AboutSiloUniverse.tsx의 handleSelectObject 참고).
  const selectedGroup = selectedObjectId ? objectRefs.current.get(selectedObjectId) ?? null : null;

  return (
    <>
      <ambientLight intensity={0.8} color="#ffe0ba" />
      <directionalLight position={[4, 6, 5]} intensity={0.9} color="#ffe6c4" />
      <directionalLight position={[-5, -2, -4]} intensity={0.3} color="#c9d8ff" />

      <UniverseParticles />

      <CentralPlanet
        name={config.planetName}
        baseColor={config.planetColor}
        planetTextureUrl={config.planetTextureUrl}
        planetTextureOpacity={config.planetTextureOpacity}
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
      <UniverseObjectsLayer
        objects={config.objects}
        onObjectError={onObjectError}
        selectedObjectId={selectedObjectId}
        onSelectObject={onSelectObject}
        registerObjectRef={(id, g) => {
          if (g) objectRefs.current.set(id, g);
          else objectRefs.current.delete(id);
        }}
      />
      {selectedGroup && (
        <TransformControls
          object={selectedGroup}
          mode="translate"
          onMouseDown={() => {
            if (cameraControlsRef.current) cameraControlsRef.current.enabled = false;
          }}
          onMouseUp={() => {
            if (cameraControlsRef.current) cameraControlsRef.current.enabled = true;
            if (selectedObjectId) onObjectMoved(selectedObjectId, selectedGroup.position.toArray() as [number, number, number]);
          }}
        />
      )}

      <group ref={orbitGroupRef}>
        {posts.map((post, i) => {
          const localPos: [number, number, number] = [
            positions[i][0] - SILO_CENTER.x,
            positions[i][1] - SILO_CENTER.y,
            positions[i][2] - SILO_CENTER.z,
          ];
          return (
            <OrbitStarMarker
              key={post.id}
              post={post}
              position={localPos}
              selected={selectedId === post.id}
              onSelect={onSelect}
            />
          );
        })}
      </group>

      {/* HOTFIX-121(사용자 신고 — "행성 어디를 돌리든 자유롭게 움직이게
          해줘"): 극각(polar angle) 제한을 명시적으로 완전히 풀어(0~π)
          위/아래 어느 방향으로든 걸림 없이 회전할 수 있게 한다 — 기존엔
          이 두 값을 아예 안 줘서 라이브러리 기본값에 암묵적으로 의존하고
          있었다. */}
      <CameraControls
        ref={cameraControlsRef}
        minDistance={0.6}
        maxDistance={MAX_ZOOM_DISTANCE}
        dollySpeed={0.55}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minAzimuthAngle={-Infinity}
        maxAzimuthAngle={Infinity}
      />

      <EffectComposer multisampling={0}>
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
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
// AboutSiloUniverse — 최상위 컴포넌트. UniverseSettingsPanel(전역 설정) +
// ObjectInspectorPanel(선택된 오브젝트 설정)을 조합하고, 저장/자동저장을
// 관리한다.
// ============================================================

const UNIVERSE_SETTINGS_KEY = "about_silo_universe";
const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;

export function AboutSiloUniverse() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [selected, setSelected] = useState<FeedPost | null>(null);
  const cameraControlsRef = useRef<CameraControlsImpl>(null);

  const [panelConfig, setPanelConfig] = useState<UniverseConfig>(defaultUniverseConfig());
  const [availableClips, setAvailableClips] = useState<string[]>([]);
  const [failedObjectIds, setFailedObjectIds] = useState<Set<string>>(new Set());
  function handleObjectError(id: string) {
    setFailedObjectIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [toast, setToast] = useState(false);

  // EPIC-121: 3D 뷰에서 클릭해 선택한 오브젝트 — 우측 인스펙터 패널 +
  // TransformControls 드래그 대상. objectRefs는 UniverseObjectsLayer가
  // 커밋 시점(콜백 ref)에 채우는 실제 THREE.Group 참조 맵.
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const objectRefs = useRef<Map<string, THREE.Group>>(new Map());
  function handleSelectObject(id: string) {
    setSelectedObjectId(id);
  }

  function updatePanelConfig(patch: Partial<UniverseConfig>) {
    setPanelConfig((prev) => ({ ...prev, ...patch }));
  }
  function updateObject(id: string, patch: Partial<UniverseObject>) {
    setPanelConfig((prev) => ({ ...prev, objects: prev.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  }
  function removeSelectedObject() {
    if (!selectedObjectId) return;
    setPanelConfig((prev) => ({ ...prev, objects: prev.objects.filter((o) => o.id !== selectedObjectId) }));
    setSelectedObjectId(null);
  }
  function handleObjectMoved(id: string, position: [number, number, number]) {
    updateObject(id, { position });
  }

  const configRef = useRef(panelConfig);
  useEffect(() => {
    configRef.current = panelConfig;
  });

  // DB(site_settings.about_silo_universe)에서 저장된 설정을 불러온다.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", UNIVERSE_SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setPanelConfig(normalizeUniverseConfig(data?.setting_value));
      });
    return () => {
      cancelled = true;
    };
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

  // 5분 자동 저장 — configRef가 매 렌더 최신값으로 갱신되므로, 인터벌
  // 자체는 autoSaveEnabled가 바뀔 때만 재설정된다.
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

  // CameraControls는 마운트 시 Canvas의 초기 camera position을 자기
  // 나름대로 재해석하고, R3F는 부모(DOM) 트리와 별도 리컨실러로 커밋하므로
  // 이 effect가 처음 돌 때 ref가 아직 null일 수 있다 — 매 프레임 재시도해
  // 실제로 준비된 다음에만 홈 구도로 스냅.
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

  // 행성(SILO/유저) 자체를 클릭하면 카메라가 그 행성을 화면 중심으로
  // 부드럽게 줌인(fit to object)한다.
  function handleFocusPlanet(center: THREE.Vector3, radius: number) {
    const controls = cameraControlsRef.current;
    if (!controls) return;
    const dir = new THREE.Vector3(0.4, 0.3, 1).normalize();
    const camPos = center.clone().add(dir.multiplyScalar(radius * 2.2));
    controls.setLookAt(camPos.x, camPos.y, camPos.z, center.x, center.y, center.z, true);
  }

  function handleReset() {
    setSelected(null);
    setSelectedObjectId(null);
    cameraControlsRef.current?.setLookAt(
      HOME_CAMERA_POS.x, HOME_CAMERA_POS.y, HOME_CAMERA_POS.z,
      HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z,
      true,
    );
  }

  const selectedObject = selectedObjectId ? panelConfig.objects.find((o) => o.id === selectedObjectId) ?? null : null;

  return (
    <div className="relative h-[85vh] min-h-[560px] w-full overflow-hidden bg-transparent">
      {panelConfig.backgroundMode === "youtube" ? (
        <YoutubeBackground urls={panelConfig.youtubeUrls} />
      ) : (
        <PresetBackground preset={panelConfig.preset} />
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
            config={panelConfig}
            onClipsLoaded={setAvailableClips}
            onFocusPlanet={handleFocusPlanet}
            onObjectError={handleObjectError}
            selectedObjectId={selectedObjectId}
            onSelectObject={handleSelectObject}
            objectRefs={objectRefs}
            onObjectMoved={handleObjectMoved}
          />
        )}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="pointer-events-auto flex items-start justify-between text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">About Silo</p>
            <h1 className="mt-1 text-2xl font-light drop-shadow">사일로의 우주</h1>
            <p className="mt-1 max-w-sm text-xs text-white/70">
              떠 있는 마커를 클릭해 가까이 다가가고, 휠을 굴려 자유롭게 둘러보세요. 행성 자체를 클릭하면 그 행성으로 바로 다가갑니다.
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
          onSelectObjectId={handleSelectObject}
        />

        {selectedObject && (
          <ObjectInspectorPanel
            object={selectedObject}
            onChange={(patch) => updateObject(selectedObject.id, patch)}
            onDelete={removeSelectedObject}
            onClose={() => setSelectedObjectId(null)}
          />
        )}

        {toast && (
          <div className="pointer-events-none fixed right-6 top-6 z-50 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs text-white shadow-xl backdrop-blur-sm">
            ✓ 저장됨
          </div>
        )}
      </div>
    </div>
  );
}
