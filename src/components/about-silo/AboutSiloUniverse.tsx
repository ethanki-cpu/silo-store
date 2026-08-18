"use client";

// EPIC-113/114/115/119/121/HOTFIX-123: /about-silo를 "어린 왕자" 감성의 3D
// 우주(행성+궤도+위성)로 개편한 [3D World Builder]. React Three
// Fiber(three.js) 기반.
//
// HOTFIX-123(사용자 지시 — 여러 항목): (1) 행성을 클릭+드래그 후 놓으면
// 놓인 자리가 아니라 자꾸 이전 프레이밍으로 돌아가던 버그 수정(실제로는
// 드래그로 카메라를 궤도 회전시킨 뒤 마우스를 행성 위에서 떼면 클릭이
// 그대로 발동해 고정 각도로 스냅시키던 것). (2) 오브제 클릭 시 glow
// 선택 효과. (3) 오브제 설정 저장 안 되던 버그 수정(에러 스왈로우 +
// 인스펙터에 저장 버튼 부재). (4) 행성에 "중력" — 오브제가 항상 표면에
// 붙고, 드래그로 표면 위를 미끄러지듯 이동. (5) 게시글 위성 반짝임 +
// 클릭 시 미리보기 계속 표시. (6) 행성별로 독립된 설정(이름/색/텍스처/
// 캐릭터/오브젝트/궤도 위성 소스+디자인) — SILO와 유저 행성이 동일한
// 구조를 공유하되 서로 다른 창(PlanetSettingsPanel)에서 편집. (7) 오브제를
// 클릭하면 뜨는 정보 카드(썸네일/요약/링크)를 관리자가 설정 가능. (8)
// 오브제가 행성 자전 그룹 안에 로컬 좌표로 중첩돼 행성과 함께 돈다. (9)
// 게시글 위성이 지정된 게시판 글 썸네일을 hover 없이도 주기적으로
// 떴다 사라지게(CSS 애니메이션) + 위성 디자인(이미지) 업로드.
//
// 아키텍처 결정 메모(EPIC-115/119/121 유지):
// - "수채화 텍스처"/"프리셋 배경"은 여전히 절차적 대체(에셋 업로드 시
//   PlanetMaterial/YoutubeBackground가 우선한다).
// - 범위 밖으로 명시적으로 미룬 것: 행성 두 개가 서로의 둘레를 실제로
//   공전하는 것(거리/속도를 물리적으로 애니메이션) — SILO_CENTER/
//   USER_CENTER는 여전히 고정 월드 좌표다. 이번 HOTFIX에서 그 중심을
//   기준으로 한 "행성 자체의 자전 + 표면 오브젝트/위성 배치"까지는
//   전부 지원하게 됐지만, 두 중심점 자체가 서로를 공전하며 움직이는
//   것은 카메라 추적/연결선 끝점 계산을 전부 다시 짜야 하는 별도
//   리팩터라 여전히 범위 밖이다.

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
import { EffectComposer, Noise, Vignette, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { fibonacciSphere } from "@/lib/fibonacciSphere";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";
import { supabase } from "@/lib/supabaseClient";
import {
  defaultUniverseConfig,
  normalizeUniverseConfig,
  type PlanetConfig,
  type UniverseConfig,
  type UniverseObject,
  type SpaceObject,
} from "@/lib/aboutSiloUniverseConfig";
import { YoutubeBackground } from "./YoutubeBackground";
import { PresetBackground } from "./PresetBackground";
import { UniverseSettingsPanel } from "./UniverseSettingsPanel";
import { PlanetSettingsPanel } from "./PlanetSettingsPanel";
import { ObjectInspectorPanel } from "./ObjectInspectorPanel";

// ============================================================
// 데이터
// ============================================================

type PlanetId = "silo" | "user";

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
// 오브젝트/카테고리가 실제로 표면 위에 서도록(안이 아니라) 쓰는 반지름 —
// 행성마다 별도.
const SILO_SURFACE_RADIUS = PLANET_RADIUS * 0.97;
const USER_SURFACE_RADIUS = USER_PLANET_RADIUS * 0.97;

const IMAGE_ORBIT_RADIUS = 2.55;
// HOTFIX-123: 유저 행성도 자체 게시글 위성을 갖는다 — About Me 장식
// 위성(1.75)과 겹치지 않도록 조금 더 안쪽 궤도를 쓴다.
const USER_ORBIT_RADIUS = 1.5;
const ABOUT_ME_ORBIT_RADIUS = 1.75;
const HOME_TARGET = new THREE.Vector3(0.1, -0.1, 0);
const HOME_CAMERA_POS = new THREE.Vector3(0.6, 2.2, 11.5);
// 줌아웃 한계를 사실상 해제.
const MAX_ZOOM_DISTANCE = 5000;

// ============================================================
// 텍스처 유틸.
// ============================================================

/**
 * 행성 표면에 붓터치/얼룩 노이즈를 겹쳐 그리는 절차적 대체(외부 에셋
 * 파일 없음) — 관리자가 지형 텍스처를 업로드하지 않았을 때, 그리고
 * 업로드했을 때도 그 아래 깔리는 베이스 레이어로 쓰인다.
 */
function paintWatercolor(ctx: CanvasRenderingContext2D, size: number, baseColorHex: string) {
  const base = new THREE.Color(baseColorHex);
  ctx.globalAlpha = 1;
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  // React Compiler(react-hooks/immutability)가 렌더 단계 안에서 클로저
  // 변수를 재대입하는 흔한 선형합동 PRNG 패턴을 금지해, 대신 인덱스만의
  // 순수 함수인 해시 기반 의사난수를 쓴다(상태 없음).
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
 * HOTFIX(사용자 신고 — "행성 설정에서 색상과 텍스처의 블렌드가 전혀
 * 이뤄지고 있지 않아"): 예전엔 베이스 색 구 위에 텍스처를 입힌 "반투명
 * 구"를 살짝 더 큰 반지름으로 겹쳐(WebGL 알파 블렌딩에 의존) 만들었는데,
 * 이 방식은 조명 각도/뷰 방향에 따라 블렌딩 결과가 달라지고 두 구 사이
 * z-fighting 위험도 있어 슬라이더를 중간값으로 놓아도 텍스처 쪽이
 * 시각적으로 거의 다 덮어버리는 것처럼 보였다 — 3D 렌더링의 블렌딩에
 * 맡기는 대신 2D Canvas에서 픽셀 단위로 직접 합성(수채화 베이스를 그린
 * 뒤 업로드 텍스처를 globalAlpha=textureOpacity로 그 위에 덧그림)해
 * "이미 섞인 텍스처 이미지 하나"를 만들고, 그 결과 하나만 불투명하게
 * 구 표면에 입힌다 — 조명/각도/렌더 순서와 무관하게 항상 슬라이더
 * 비율 그대로 섞인다.
 */
function usePlanetBlendedTexture(baseColorHex: string, customTextureUrl: string, textureOpacity: number): THREE.CanvasTexture {
  // React Compiler(react-hooks/refs)가 렌더 중 ref.current 접근 자체를
  // 금지해(초기화 체크용 읽기도 포함) useRef 기반 싱글턴 캐시 패턴이
  // 막혀서, 원래 useWatercolorTexture와 동일하게 "필요한 입력이 바뀔
  // 때마다 useMemo 안에서 캔버스를 통째로 새로 그려 새 텍스처를 반환"
  // 하는 순수한 형태로 통일한다 — 이전에 반환한 텍스처를 나중에 다시
  // mutate하지 않는다. 업로드 이미지 자체는 URL이 바뀔 때만 새로 로드해
  // state로 캐시한다(매 슬라이더 조작마다 다시 받아오지 않도록).
  const [loadedImage, setLoadedImage] = useState<{ url: string; img: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!customTextureUrl) {
      setLoadedImage(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setLoadedImage({ url: customTextureUrl, img });
    };
    img.onerror = () => {
      if (!cancelled) setLoadedImage(null);
    };
    img.src = customTextureUrl;
    return () => {
      cancelled = true;
    };
  }, [customTextureUrl]);

  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    paintWatercolor(ctx, canvas.width, baseColorHex);
    if (loadedImage && loadedImage.url === customTextureUrl && textureOpacity > 0) {
      ctx.globalAlpha = textureOpacity;
      ctx.drawImage(loadedImage.img, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [baseColorHex, customTextureUrl, textureOpacity, loadedImage]);
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
  const blended = usePlanetBlendedTexture(baseColor, customTextureUrl, textureOpacity);
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial map={blended} />
    </mesh>
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

// HOTFIX-123: 장식 오브젝트를 이제 행성의 자전 그룹 안에 로컬 좌표로
// 중첩시키므로(항목 3 — "오브제가 행성과 함께 돌아가도록"), 배치 좌표에
// 더 이상 행성의 월드 중심을 더하지 않는다 — 부모 그룹의 위치/회전을
// three.js가 알아서 적용해준다.
function localSurfacePlacementsFor(count: number, radius: number): SurfacePlacement[] {
  return fibonacciSphere(Math.max(count, 1), radius).map(([x, y, z]) => {
    const normal = new THREE.Vector3(x, y, z).normalize();
    return {
      position: [x, y, z] as [number, number, number],
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
    };
  });
}

// 기본 카테고리 마커(CoreCategories)는 여전히 행성 자전과 무관하게 Scene
// 최상단에서 SILO_CENTER 기준 월드 좌표로 그린다(사용자 요청 범위 밖 —
// 이 4종은 언제나 같은 자리에서 안정적으로 찾을 수 있어야 하는 내비게이션
// 성격이라 자전에 휩쓸리지 않게 그대로 둔다).
function surfacePlacementsFor(count: number, radius: number): SurfacePlacement[] {
  return fibonacciSphere(Math.max(count, 1), radius).map(([x, y, z]) => {
    const normal = new THREE.Vector3(x, y, z).normalize();
    return {
      position: [x + SILO_CENTER.x, y + SILO_CENTER.y, z + SILO_CENTER.z] as [number, number, number],
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
    };
  });
}

// HOTFIX-123(사용자 신고 — "행성을 드래그하고 놓으면 자꾸 이전 위치로
// 돌아간다"): 실제로는 행성 자체가 움직이는 게 아니라, 행성 위에서
// 드래그해 카메라를 궤도 회전시킨(CameraControls) 뒤 마우스를 그 행성
// 위에서 떼면 R3F가 이동 거리와 무관하게 onClick을 그대로 발생시켜
// onFocus()가 매번 같은 고정 각도로 카메라를 스냅시키던 것 — "드래그해
// 옮긴 시점"이 아니라 "클릭한 시점"의 고정 프레이밍으로 계속 되돌아가는
// 것처럼 보였다. 포인터다운→업 사이의 화면 이동 거리가 임계값 미만일
// 때만 진짜 클릭으로 간주해 onClick을 호출한다.
function useDragAwareClick(onClick: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const s = start.current;
      start.current = null;
      const moved = s ? Math.hypot(e.clientX - s.x, e.clientY - s.y) : 0;
      if (moved < 5) onClick();
    },
  };
}

// ============================================================
// 장식 오브젝트 — 행성 표면에 배치, 클릭으로 선택 → 드래그(부모
// AboutSiloUniverse의 TransformControls)로 위치 이동. HOTFIX-123부터
// SILO/유저 행성 둘 다 이 레이어를 갖는다(행성의 자전 그룹 안에 로컬
// 좌표로 중첩).
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
  const { normalized, baseOffsetY, boundingRadius } = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    const targetSize = 0.5;
    clone.scale.setScalar(targetSize / maxDim);
    const rescaledBox = new THREE.Box3().setFromObject(clone);
    const rescaledSize = rescaledBox.getSize(new THREE.Vector3());
    return {
      normalized: clone,
      baseOffsetY: -rescaledBox.min.y,
      boundingRadius: Math.max(rescaledSize.x, rescaledSize.y, rescaledSize.z, 0.2) * 0.65,
    };
  }, [scene]);

  // 사용자 지시("클릭하면 오브제가 빛나게 glow 효과"): 임의 업로드
  // .glb의 내부 머티리얼을 직접 건드리는 대신(구조가 제각각이라 위험),
  // 선택 시에만 나타나는 가산 블렌딩 오라 구체를 은은하게 맥동시켜
  // 글로우처럼 보이게 한다 — Scene의 Bloom 포스트프로세싱과 합쳐지면
  // 실제로 빛나 보인다.
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = 0.75 + Math.sin(clock.getElapsedTime() * 2.6) * 0.25;
    glowRef.current.scale.setScalar(pulse);
    (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.25;
  });

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
        <>
          <mesh ref={glowRef} position={[0, baseOffsetY + boundingRadius * 0.5, 0]}>
            <sphereGeometry args={[boundingRadius * 1.4, 16, 16]} />
            <meshBasicMaterial
              color="#7dd3fc"
              transparent
              opacity={0.5}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, baseOffsetY + 0.25, 0]}>
            <ringGeometry args={[0.28, 0.32, 24]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

function UniverseObjectsLayer({
  objects,
  radius,
  onObjectError,
  selectedObjectId,
  onSelectObject,
  registerObjectRef,
}: {
  objects: UniverseObject[];
  /** 이 오브젝트들이 붙는 행성의 표면 반지름 — 행성마다 다르다. */
  radius: number;
  onObjectError: (id: string) => void;
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  registerObjectRef: (id: string, group: THREE.Group | null) => void;
}) {
  const defaults = useMemo(() => localSurfacePlacementsFor(objects.length, radius), [objects.length, radius]);
  if (objects.length === 0) return null;
  return (
    <>
      {objects.map((obj, i) => {
        // "중력": 드래그로 옮긴 뒤에도 매 렌더 이 행성의 로컬 원점(0,0,0)
        // 기준 구면 위로 위치를 재투영하고, 방향(quaternion)도 그 지점의
        // 실제 법선으로 다시 계산한다 — 위치만 저장하고 방향은 원래
        // 인덱스의 기본값을 재사용하던 예전 버그(표면에 절반만 나오거나
        // 파묻히던 원인)가 재발하지 않는다.
        const placement: SurfacePlacement = obj.position
          ? (() => {
              const normal = new THREE.Vector3(...obj.position!).normalize();
              const snapped = normal.clone().multiplyScalar(radius);
              return {
                position: snapped.toArray() as [number, number, number],
                quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
              };
            })()
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
// 우주 공간 오브젝트 — HOTFIX(사용자 지시 — "universe setting에서
// 오브제를 업로드할 수 있는 게 없네, 예를 들어 별, 은하수, 별똥별,
// asteroid 등등 우주에 있는 것들 말이야"): 행성 표면 오브젝트와 달리
// 어느 행성에도 속하지 않고 "중력" 없이 두 행성 사이 우주 공간에
// 자유롭게 떠 있다. kind가 "model"이면 .glb(소행성 등), "sprite"면
// 항상 카메라를 바라보는 이미지 빌보드(별/은하수/별똥별 등 사진 한 장
// 이면 충분한 것들).
// ============================================================

function hashRandom01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 두 행성 중간 지점을 중심으로 넓게 흩뿌린다 — id 문자열을 해시해 시드로
// 쓰므로, position이 없는 한(드래그해 옮기기 전) 같은 오브젝트는 항상
// 같은 자리에 뜬다(새로고침해도 흩어진 자리가 바뀌지 않도록).
function spaceObjectDefaultPosition(id: string): [number, number, number] {
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) % 100000;
  const theta = hashRandom01(seed) * Math.PI * 2;
  const phi = Math.acos(2 * hashRandom01(seed + 1) - 1);
  const radius = 7 + hashRandom01(seed + 2) * 9;
  const center = SILO_CENTER.clone().add(USER_CENTER).multiplyScalar(0.5);
  return [
    center.x + radius * Math.sin(phi) * Math.cos(theta),
    center.y + radius * Math.cos(phi) * 0.4,
    center.z + radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function SpaceObjectGlow({ boundingRadius }: { boundingRadius: number }) {
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = 0.75 + Math.sin(clock.getElapsedTime() * 2.6) * 0.25;
    glowRef.current.scale.setScalar(pulse);
    (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.25;
  });
  return (
    <mesh ref={glowRef}>
      <sphereGeometry args={[boundingRadius * 1.6, 16, 16]} />
      <meshBasicMaterial
        color="#a8d8ff"
        transparent
        opacity={0.5}
        toneMapped={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SpaceObjectModel({
  obj,
  position,
  selected,
  onSelect,
  registerRef,
}: {
  obj: SpaceObject;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
  registerRef: (group: THREE.Group | null) => void;
}) {
  const { scene } = useGLTF(obj.url);
  const { normalized, centerOffset, boundingRadius } = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    const targetSize = 0.45;
    clone.scale.setScalar(targetSize / maxDim);
    const rescaledBox = new THREE.Box3().setFromObject(clone);
    const rescaledSize = rescaledBox.getSize(new THREE.Vector3());
    const center = rescaledBox.getCenter(new THREE.Vector3());
    return {
      normalized: clone,
      centerOffset: [-center.x, -center.y, -center.z] as [number, number, number],
      boundingRadius: Math.max(rescaledSize.x, rescaledSize.y, rescaledSize.z, 0.2) * 0.65,
    };
  }, [scene]);

  // 소행성처럼 천천히 스스로 굴러가는(자전) 느낌 — 행성 자전과 무관하게
  // 각 오브젝트가 독립적으로 아주 느리게 돈다.
  const spinRef = useRef<THREE.Group>(null);
  const spinSeed = useMemo(() => hashRandom01(obj.id.length + obj.id.charCodeAt(0)), [obj.id]);
  useFrame((_, delta) => {
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * (0.03 + spinSeed * 0.04);
      spinRef.current.rotation.x += delta * (0.015 + spinSeed * 0.02);
    }
  });

  return (
    <group
      ref={registerRef}
      position={position}
      scale={obj.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <group ref={spinRef}>
        <primitive object={normalized} position={centerOffset} />
      </group>
      {selected && <SpaceObjectGlow boundingRadius={boundingRadius} />}
    </group>
  );
}

function SpaceObjectSprite({
  obj,
  position,
  selected,
  onSelect,
  registerRef,
}: {
  obj: SpaceObject;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
  registerRef: (group: THREE.Group | null) => void;
}) {
  const texture = useTexture(obj.url);
  const materialRef = useRef<THREE.SpriteMaterial>(null);
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < obj.id.length; i++) h = (h * 31 + obj.id.charCodeAt(i)) % 1000;
    return h;
  }, [obj.id]);
  // 별/은하수/별똥별 등은 반짝이는 편이 그 의미가 잘 살아서(사용자 지시
  // — 다른 반짝이는 오브젝트들과 동일한 트윙클 언어) 밝기를 사인파로
  // 맥동시킨다.
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const t = clock.getElapsedTime();
    materialRef.current.opacity = 0.7 + Math.sin(t * 1.4 + seed) * 0.3;
  });

  const baseScale = obj.scale * 3;
  return (
    <group
      ref={registerRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <sprite scale={[baseScale, baseScale, 1]}>
        <spriteMaterial ref={materialRef} map={texture} transparent toneMapped={false} depthWrite={false} />
      </sprite>
      {selected && <SpaceObjectGlow boundingRadius={baseScale * 0.5} />}
    </group>
  );
}

function SpaceObjectsLayer({
  objects,
  selectedId,
  onSelect,
  onError,
  registerRef,
}: {
  objects: SpaceObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onError: (id: string) => void;
  registerRef: (id: string, group: THREE.Group | null) => void;
}) {
  if (objects.length === 0) return null;
  return (
    <>
      {objects.map((obj) => {
        const position = obj.position ?? spaceObjectDefaultPosition(obj.id);
        const shared = {
          obj,
          position,
          selected: selectedId === obj.id,
          onSelect: () => onSelect(obj.id),
          registerRef: (g: THREE.Group | null) => registerRef(obj.id, g),
        };
        return (
          <AssetLoadErrorBoundary key={obj.id} fallback={null} onError={() => onError(obj.id)}>
            <Suspense fallback={null}>
              {obj.kind === "sprite" ? <SpaceObjectSprite {...shared} /> : <SpaceObjectModel {...shared} />}
            </Suspense>
          </AssetLoadErrorBoundary>
        );
      })}
    </>
  );
}

// ============================================================
// 중심 행성(SILO) & 유저 행성 — HOTFIX-123부터 둘 다 동일한
// PlanetConfig를 받아 동일한 구조(표면 텍스처/캐릭터/장식 오브젝트)로
// 렌더링한다.
// ============================================================

function CentralPlanet({
  planetConfig,
  rotationSpeed,
  onFocus,
  onOpenSettings,
  onClipsLoaded,
  selectedObjectId,
  onSelectObject,
  onObjectError,
  registerObjectRef,
}: {
  planetConfig: PlanetConfig;
  rotationSpeed: number;
  onFocus: () => void;
  onOpenSettings: () => void;
  onClipsLoaded: (clips: string[]) => void;
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  onObjectError: (id: string) => void;
  registerObjectRef: (id: string, group: THREE.Group | null) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * rotationSpeed * 0.1;
  });
  const dragAwareClick = useDragAwareClick(() => {
    onFocus();
    onOpenSettings();
  });
  return (
    <group position={SILO_CENTER}>
      <group
        ref={meshRef}
        {...dragAwareClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <PlanetMaterial baseColor={planetConfig.color} customTextureUrl={planetConfig.textureUrl} textureOpacity={planetConfig.textureOpacity} radius={PLANET_RADIUS} />
        {/* HOTFIX-123(사용자 지시 — "오브제가 행성과 함께 돌아가도록"):
            장식 오브젝트를 행성 자전 그룹 안에 로컬 좌표로 중첩시켜 행성이
            자전하면 표면에 붙은 채 함께 돈다. */}
        <UniverseObjectsLayer
          objects={planetConfig.objects}
          radius={SILO_SURFACE_RADIUS}
          onObjectError={onObjectError}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
          registerObjectRef={registerObjectRef}
        />
      </group>
      <CharacterRenderer
        modelUrl={planetConfig.characterModelUrl}
        animationClip={planetConfig.characterAnimationClip}
        position={[0.3, PLANET_RADIUS - 0.05, 0.55]}
        rotationY={-0.4}
        scale={1.3}
        variant={planetConfig.characterType}
        seed={1}
        onClipsLoaded={onClipsLoaded}
      />
      {planetConfig.name && (
        <Html position={[0, PLANET_RADIUS + 0.5, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-center text-white backdrop-blur-sm">
            <div className="text-xs font-medium">{planetConfig.name}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function UserPlanet({
  planetConfig,
  rotationSpeed,
  onFocus,
  onOpenSettings,
  onClipsLoaded,
  selectedObjectId,
  onSelectObject,
  onObjectError,
  registerObjectRef,
}: {
  planetConfig: PlanetConfig;
  rotationSpeed: number;
  onFocus: () => void;
  onOpenSettings: () => void;
  onClipsLoaded: (clips: string[]) => void;
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  onObjectError: (id: string) => void;
  registerObjectRef: (id: string, group: THREE.Group | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    groupRef.current?.position.set(USER_CENTER.x, USER_CENTER.y + Math.sin(t * 0.35) * 0.12, USER_CENTER.z);
    if (spinRef.current) spinRef.current.rotation.y += delta * rotationSpeed * 0.14;
  });

  const dragAwareClick = useDragAwareClick(() => {
    onFocus();
    onOpenSettings();
  });

  return (
    <group ref={groupRef}>
      <group
        ref={spinRef}
        {...dragAwareClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <PlanetMaterial baseColor={planetConfig.color} customTextureUrl={planetConfig.textureUrl} textureOpacity={planetConfig.textureOpacity} radius={USER_PLANET_RADIUS} />
        <UniverseObjectsLayer
          objects={planetConfig.objects}
          radius={USER_SURFACE_RADIUS}
          onObjectError={onObjectError}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
          registerObjectRef={registerObjectRef}
        />
      </group>
      <CharacterRenderer
        modelUrl={planetConfig.characterModelUrl}
        animationClip={planetConfig.characterAnimationClip}
        position={[-0.15, USER_PLANET_RADIUS - 0.02, 0.4]}
        rotationY={0.5}
        scale={0.9}
        variant={planetConfig.characterType}
        seed={2}
        onClipsLoaded={onClipsLoaded}
      />
      <Html position={[0, -USER_PLANET_RADIUS - 0.35, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-center text-white backdrop-blur-sm">
          <div className="text-xs font-medium">{planetConfig.name || "My Page"}</div>
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
// 궤도를 도는 게시글 위성. HOTFIX-123(사용자 지시 — "게시글 위성들이
// 지정된 게시판의 글 썸네일 자체가 떳다가 사라졌다 하게 해줘. 그 위성의
// 디자인을 업로드할 수 있게 해줘"): 사진 미리보기가 더 이상 hover
// 전용이 아니라 CSS 애니메이션으로 주기적으로 스스로 페이드 인/아웃하고
// (마커마다 다른 위상), 위성 마커 자체의 모양도 관리자가 이미지를
// 업로드해 기본 별(팔면체) 대신 쓸 수 있다.
// ============================================================

function DefaultStarShape({
  selected,
  starRef,
  materialRef,
  onSelect,
  onHoverChange,
}: {
  selected: boolean;
  starRef: RefObject<THREE.Mesh | null>;
  materialRef: RefObject<THREE.MeshBasicMaterial | null>;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  return (
    <mesh
      ref={starRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHoverChange(false);
        document.body.style.cursor = "auto";
      }}
    >
      <octahedronGeometry args={[selected ? 0.09 : 0.07, 0]} />
      <meshBasicMaterial ref={materialRef} color={selected ? "#fff3d6" : "#f4e6c8"} toneMapped={false} />
    </mesh>
  );
}

function SatelliteDesignSprite({
  url,
  selected,
  onSelect,
  onHoverChange,
}: {
  url: string;
  selected: boolean;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const texture = useTexture(url);
  const scale = selected ? 0.24 : 0.18;
  return (
    <sprite
      scale={[scale, scale, 1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHoverChange(false);
        document.body.style.cursor = "auto";
      }}
    >
      <spriteMaterial map={texture} transparent toneMapped={false} />
    </sprite>
  );
}

function OrbitSatelliteMarker({
  post,
  position,
  selected,
  designUrl,
  onSelect,
}: {
  post: FeedPost;
  position: [number, number, number];
  selected: boolean;
  designUrl: string;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const starRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  // 마커마다 다른 위상으로 반짝이도록(전부 같은 박자로 깜빡이면 부자연
  // 스러워) post.id를 해시해 개별 seed를 만든다.
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < post.id.length; i++) h = (h * 31 + post.id.charCodeAt(i)) % 1000;
    return h;
  }, [post.id]);

  // 별 모양(기본값)일 때만 자전+트윙클 — 커스텀 디자인 스프라이트는
  // 항상 카메라를 바라보므로 별도 회전이 필요 없다.
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (starRef.current) {
      starRef.current.rotation.y = t * 0.6;
      starRef.current.rotation.x = t * 0.4;
      const twinkle = 0.8 + Math.sin(t * 2.2 + seed) * 0.2;
      starRef.current.scale.setScalar(twinkle);
    }
    if (materialRef.current) {
      const brightness = 0.7 + Math.sin(t * 2.2 + seed) * 0.3;
      materialRef.current.color.setRGB(brightness, brightness * 0.95, brightness * 0.82);
    }
  });

  return (
    <group position={position}>
      {designUrl ? (
        <AssetLoadErrorBoundary
          fallback={<DefaultStarShape selected={selected} starRef={starRef} materialRef={materialRef} onSelect={onSelect} onHoverChange={setHovered} />}
        >
          <Suspense fallback={null}>
            <SatelliteDesignSprite url={designUrl} selected={selected} onSelect={onSelect} onHoverChange={setHovered} />
          </Suspense>
        </AssetLoadErrorBoundary>
      ) : (
        <DefaultStarShape selected={selected} starRef={starRef} materialRef={materialRef} onSelect={onSelect} onHoverChange={setHovered} />
      )}
      {selected && (
        <mesh>
          <ringGeometry args={[0.13, 0.16, 24]} />
          <meshBasicMaterial color="#fff3d6" transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {post.photo_url && (
        // HOTFIX(사용자 신고 — "행성을 hover하는 특정 게시판의 게시물들이
        // 커서를 올렸을 때 아무런 반응이 없고, 클릭도 할 수 없는 상태야"):
        // 근본 원인은 이 썸네일이 실제 클릭 가능한 3D 마커(작은 팔면체
        // 별, position [0,0,0])보다 y로 0.24만큼 떨어진 위치에 렌더링되는
        // Html DOM 오버레이인데, pointerEvents:"none"이라 클릭이 그대로
        // 캔버스를 통과해버려 그 지점엔 아무 3D 지오메트리도 없어(별은
        // 저 아래 다른 화면 좌표에 있음) 아무 반응이 없었던 것 — 화면상
        // 가장 크고 눈에 띄는 게 이 사진이라 사용자는 자연히 사진을 직접
        // hover/클릭하는데 정작 반응은 안 하는 별에만 걸려 있던 것.
        // 사진 자체를 진짜 클릭/hover 대상으로 만들어 확실하게 반응하게
        // 하고, hover 시 CSS로 즉시 빛나는 테두리(glow)를 준다.
        <Html center distanceFactor={6} position={[0, 0.24, 0]} zIndexRange={[10, 0]}>
          <div
            className="silo-satellite-thumb"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              width: 72,
              height: 72,
              borderRadius: "9999px",
              overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.85)",
              boxShadow: hovered || selected ? "0 0 22px 6px rgba(255,243,214,0.85), 0 4px 16px rgba(0,0,0,0.45)" : "0 4px 16px rgba(0,0,0,0.45)",
              cursor: "pointer",
              pointerEvents: "auto",
              transition: "box-shadow 0.2s ease, transform 0.2s ease",
              transform: hovered || selected ? "scale(1.12)" : "scale(1)",
              animationDelay: `${(seed % 700) / 100}s`,
              ...(hovered || selected ? { opacity: 1, animationPlayState: "paused" as const } : {}),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.photo_url}
              alt={post.title ?? ""}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
            />
          </div>
        </Html>
      )}
    </group>
  );
}

// HOTFIX-123: 행성 하나를 도는 게시글 위성 무리 — SILO/유저 둘 다 같은
// 컴포넌트를 재사용(각자의 center/radius/boardSlug 소스/디자인만 다름).
function PlanetSatellites({
  posts,
  center,
  radius,
  orbitSpeed,
  designUrl,
  selectedId,
  onSelect,
}: {
  posts: FeedPost[];
  center: THREE.Vector3;
  radius: number;
  orbitSpeed: number;
  designUrl: string;
  selectedId: string | null;
  onSelect: (post: FeedPost, position: [number, number, number], normal: [number, number, number]) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const localPositions = useMemo(() => fibonacciSphere(posts.length, radius), [posts.length, radius]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.copy(center);
      groupRef.current.rotation.y += delta * orbitSpeed * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {posts.map((post, i) => {
        const localPos = localPositions[i];
        const normal = new THREE.Vector3(...localPos).normalize().toArray() as [number, number, number];
        return (
          <OrbitSatelliteMarker
            key={post.id}
            post={post}
            position={localPos}
            selected={selectedId === post.id}
            designUrl={designUrl}
            onSelect={() =>
              onSelect(post, [center.x + localPos[0], center.y + localPos[1], center.z + localPos[2]], normal)
            }
          />
        );
      })}
    </group>
  );
}

// ============================================================
// 기본 카테고리 마커(사일로 상점/온라인 도슨트/살롱데상/스튜디오) — 항상
// SILO 표면 위에 노출, 자전과 무관하게 고정(내비게이션 성격).
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
  const placements = useMemo(() => surfacePlacementsFor(CORE_CATEGORIES.length, SILO_SURFACE_RADIUS), []);
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
  siloPosts,
  userPosts,
  selectedPostId,
  onSelectPost,
  cameraControlsRef,
  config,
  onSiloClipsLoaded,
  onUserClipsLoaded,
  onFocusPlanet,
  onOpenPlanetSettings,
  onObjectError,
  selectedPlanetId,
  selectedObjectId,
  onSelectObject,
  objectRefs,
  onObjectMoved,
  spaceObjects,
  selectedSpaceObjectId,
  onSelectSpaceObject,
  onSpaceObjectError,
  onSpaceObjectMoved,
}: {
  siloPosts: FeedPost[];
  userPosts: FeedPost[];
  selectedPostId: string | null;
  onSelectPost: (post: FeedPost, position: [number, number, number], normal: [number, number, number]) => void;
  cameraControlsRef: RefObject<CameraControlsImpl | null>;
  config: UniverseConfig;
  onSiloClipsLoaded: (clips: string[]) => void;
  onUserClipsLoaded: (clips: string[]) => void;
  onFocusPlanet: (center: THREE.Vector3, radius: number) => void;
  onOpenPlanetSettings: (planetId: PlanetId) => void;
  onObjectError: (planetId: PlanetId, id: string) => void;
  selectedPlanetId: PlanetId | null;
  selectedObjectId: string | null;
  onSelectObject: (planetId: PlanetId, id: string) => void;
  objectRefs: RefObject<Map<string, THREE.Group>>;
  onObjectMoved: (planetId: PlanetId, id: string, position: [number, number, number]) => void;
  spaceObjects: SpaceObject[];
  selectedSpaceObjectId: string | null;
  onSelectSpaceObject: (id: string) => void;
  onSpaceObjectError: (id: string) => void;
  onSpaceObjectMoved: (id: string, position: [number, number, number]) => void;
}) {
  const router = useRouter();

  const selectedRadius = selectedPlanetId === "user" ? USER_SURFACE_RADIUS : SILO_SURFACE_RADIUS;
  const selectedKey = selectedObjectId && selectedPlanetId
    ? `${selectedPlanetId}:${selectedObjectId}`
    : selectedSpaceObjectId
      ? `space:${selectedSpaceObjectId}`
      : null;
  // EPIC-121: 선택된 오브젝트의 실제 THREE.Group을 TransformControls에
  // 붙인다 — objectRefs는 UniverseObjectsLayer가 커밋 시점에 채우므로
  // (렌더 중이 아니라 클릭 이벤트 핸들러에서 읽으므로) react-hooks/refs
  // 위반 없이 안전하다.
  const selectedGroup = selectedKey ? objectRefs.current.get(selectedKey) ?? null : null;
  // HOTFIX: 우주 공간 오브젝트는 "중력"(표면 스냅)이 없다 — 자유롭게
  // 아무 곳으로나 드래그할 수 있다.
  const isSpaceSelection = selectedSpaceObjectId !== null;

  return (
    <>
      <ambientLight intensity={0.8} color="#ffe0ba" />
      <directionalLight position={[4, 6, 5]} intensity={0.9} color="#ffe6c4" />
      <directionalLight position={[-5, -2, -4]} intensity={0.3} color="#c9d8ff" />

      <UniverseParticles />

      <CentralPlanet
        planetConfig={config.planets.silo}
        rotationSpeed={config.orbitSpeed}
        onFocus={() => onFocusPlanet(SILO_CENTER, PLANET_RADIUS)}
        onOpenSettings={() => onOpenPlanetSettings("silo")}
        onClipsLoaded={onSiloClipsLoaded}
        selectedObjectId={selectedPlanetId === "silo" ? selectedObjectId : null}
        onSelectObject={(id) => onSelectObject("silo", id)}
        onObjectError={(id) => onObjectError("silo", id)}
        registerObjectRef={(id, g) => {
          const key = `silo:${id}`;
          if (g) objectRefs.current.set(key, g);
          else objectRefs.current.delete(key);
        }}
      />
      <UserPlanet
        planetConfig={config.planets.user}
        rotationSpeed={config.orbitSpeed}
        onFocus={() => onFocusPlanet(USER_CENTER, USER_PLANET_RADIUS)}
        onOpenSettings={() => onOpenPlanetSettings("user")}
        onClipsLoaded={onUserClipsLoaded}
        selectedObjectId={selectedPlanetId === "user" ? selectedObjectId : null}
        onSelectObject={(id) => onSelectObject("user", id)}
        onObjectError={(id) => onObjectError("user", id)}
        registerObjectRef={(id, g) => {
          const key = `user:${id}`;
          if (g) objectRefs.current.set(key, g);
          else objectRefs.current.delete(key);
        }}
      />
      <ConnectingThread color={config.lineColor} />
      <CoreCategories router={router} chestVariant={config.chestVariant} cameraVariant={config.cameraVariant} />

      {selectedGroup && (
        <TransformControls
          object={selectedGroup}
          mode="translate"
          onMouseDown={() => {
            if (cameraControlsRef.current) cameraControlsRef.current.enabled = false;
          }}
          // "중력": 드래그하는 동안에도 매 프레임 이 행성의 로컬 원점 기준
          // 구면 위로 위치를 투영하고 방향을 그 지점 법선에 맞춰, 표면을
          // 따라 미끄러지듯 이동하는 느낌을 준다. 오브젝트가 이제 행성의
          // 자전 그룹 안에 중첩돼 있어 .position은 이미 행성 로컬 좌표다.
          // 우주 공간 오브젝트는 중력이 없어 자유롭게 어디로든 옮길 수
          // 있으므로 이 보정을 건너뛴다.
          onChange={
            isSpaceSelection
              ? undefined
              : () => {
                  const normal = selectedGroup.position.clone().normalize();
                  selectedGroup.position.copy(normal.clone().multiplyScalar(selectedRadius));
                  selectedGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
                }
          }
          onMouseUp={() => {
            if (cameraControlsRef.current) cameraControlsRef.current.enabled = true;
            const finalPosition = selectedGroup.position.toArray() as [number, number, number];
            if (isSpaceSelection && selectedSpaceObjectId) {
              onSpaceObjectMoved(selectedSpaceObjectId, finalPosition);
            } else if (selectedObjectId && selectedPlanetId) {
              onObjectMoved(selectedPlanetId, selectedObjectId, finalPosition);
            }
          }}
        />
      )}

      <SpaceObjectsLayer
        objects={spaceObjects}
        selectedId={selectedSpaceObjectId}
        onSelect={onSelectSpaceObject}
        onError={onSpaceObjectError}
        registerRef={(id, g) => {
          const key = `space:${id}`;
          if (g) objectRefs.current.set(key, g);
          else objectRefs.current.delete(key);
        }}
      />

      <PlanetSatellites
        posts={siloPosts}
        center={SILO_CENTER}
        radius={IMAGE_ORBIT_RADIUS}
        orbitSpeed={config.orbitSpeed}
        designUrl={config.planets.silo.satelliteDesignUrl}
        selectedId={selectedPostId}
        onSelect={onSelectPost}
      />
      <PlanetSatellites
        posts={userPosts}
        center={USER_CENTER}
        radius={USER_ORBIT_RADIUS}
        orbitSpeed={config.orbitSpeed}
        designUrl={config.planets.user.satelliteDesignUrl}
        selectedId={selectedPostId}
        onSelect={onSelectPost}
      />

      {/* HOTFIX-121(사용자 신고 — "행성 어디를 돌리든 자유롭게 움직이게
          해줘"): 극각(polar angle) 제한을 명시적으로 완전히 풀어(0~π)
          위/아래 어느 방향으로든 걸림 없이 회전할 수 있게 한다. */}
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
        {/* 선택된 오브젝트/썸네일 마커의 glow(가산 블렌딩 오라, 반짝이는
            별)가 실제로 빛나 보이도록 하는 블룸 — 임계값을 높게 잡아
            어두운 씬 전체가 뿌옇게 번지지 않고 밝은 요소만 번지게 한다. */}
        <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.25} intensity={0.6} mipmapBlur />
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
      <div className="flex gap-3">
        {/* HOTFIX(사용자 지시 — "클릭되면, 그 게시물의 썸네일과 제목을
            보이게 해줘"): 기존엔 제목/본문 요약 텍스트만 있고 정작
            썸네일 이미지가 빠져 있었다. */}
        {post.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.photo_url} alt={post.title ?? ""} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-white/50">{post.board_name}</p>
          <h3 className="mt-1 text-lg font-medium">{post.title || "제목 없음"}</h3>
        </div>
      </div>
      <p className="mt-2 min-h-[2.5em] text-sm text-white/75">{excerpt ?? "불러오는 중..."}</p>
      {post.board_slug && (
        <a href={`/boards/${post.board_slug}/${post.slug}`} className="mt-3 inline-block text-sm text-amber-200 hover:underline">
          자세히 보기 →
        </a>
      )}
    </div>
  );
}

// HOTFIX-123(사용자 지시 — "오브제를 클릭했을 때 나오는 썸네일과 요약,
// 그리고 링크를 설정할 수 있게 해줘"): 장식 오브젝트를 클릭하면 뜨는
// 공개용 정보 카드 — ObjectInspectorPanel(편집용, 우측 상단)과 별개로
// SelectedPostPanel과 같은 자리(하단 중앙)에 같은 스타일로 뜬다. 세 필드
// 모두 비어있으면(관리자가 아직 설정 안 함) 아무것도 띄우지 않는다.
function ObjectInfoCard({ obj, onClose }: { obj: UniverseObject; onClose: () => void }) {
  if (!obj.thumbnailUrl && !obj.summary && !obj.link) return null;
  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-50 w-[min(420px,88vw)] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/55 p-5 text-white shadow-2xl backdrop-blur-md">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 text-sm text-white/60 hover:text-white" aria-label="닫기">
        ✕
      </button>
      <div className="flex gap-3">
        {obj.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={obj.thumbnailUrl} alt={obj.label} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-medium">{obj.label || "오브젝트"}</h3>
          {obj.summary && <p className="mt-1 text-sm text-white/75">{obj.summary}</p>}
        </div>
      </div>
      {obj.link && (
        <a href={obj.link} className="mt-3 inline-block text-sm text-amber-200 hover:underline">
          자세히 보기 →
        </a>
      )}
    </div>
  );
}

// ============================================================
// AboutSiloUniverse — 최상위 컴포넌트. UniverseSettingsPanel(전역 설정) +
// PlanetSettingsPanel(행성별 설정, 클릭한 행성마다 별도 인스턴스) +
// ObjectInspectorPanel(선택된 오브젝트 설정)을 조합하고, 저장/자동저장을
// 관리한다.
// ============================================================

const UNIVERSE_SETTINGS_KEY = "about_silo_universe";
const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;

export function AboutSiloUniverse() {
  const [siloPosts, setSiloPosts] = useState<FeedPost[] | null>(null);
  const [userPosts, setUserPosts] = useState<FeedPost[] | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const cameraControlsRef = useRef<CameraControlsImpl>(null);

  const [panelConfig, setPanelConfig] = useState<UniverseConfig>(defaultUniverseConfig());
  const [siloClips, setSiloClips] = useState<string[]>([]);
  const [userClips, setUserClips] = useState<string[]>([]);
  // "planetId:objectId" 복합 키 — 두 행성의 오브젝트 id가 우연히 겹치는
  // 것까지 대비.
  const [failedObjectIds, setFailedObjectIds] = useState<Set<string>>(new Set());
  function handleObjectError(planetId: PlanetId, id: string) {
    const key = `${planetId}:${id}`;
    setFailedObjectIds((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [toast, setToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 3D 뷰에서 클릭해 선택한 오브젝트 — 우측 인스펙터 패널 + 하단 정보
  // 카드 + TransformControls 드래그 대상. 어느 행성 소속인지도 함께
  // 추적해야 objectRefs 조회/표면 반지름 계산이 맞는다.
  const [selectedPlanetId, setSelectedPlanetId] = useState<PlanetId | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const objectRefs = useRef<Map<string, THREE.Group>>(new Map());
  function handleSelectObject(planetId: PlanetId, id: string) {
    setSelectedPlanetId(planetId);
    setSelectedObjectId(id);
    setSelectedPost(null);
  }

  // HOTFIX-123(사용자 지시 — "행성을 클릭했을 때, 각 행성의 특정 설정을
  // 할 수 있는 창이 뜨게 해주고... '사일로 행성'의 설정과는 다른 창이
  // 뜨게 해줘"): 어느 행성의 설정 창이 열려 있는지 — silo/user 둘 다
  // PlanetSettingsPanel 하나를 재사용하지만, 한 번에 하나만(클릭한
  // 행성) 서로 다른 인스턴스처럼 뜬다.
  const [openPlanetSettings, setOpenPlanetSettings] = useState<PlanetId | null>(null);
  function handleOpenPlanetSettings(planetId: PlanetId) {
    setOpenPlanetSettings(planetId);
  }

  function updatePanelConfig(patch: Partial<UniverseConfig>) {
    setPanelConfig((prev) => ({ ...prev, ...patch }));
  }
  function updatePlanetConfig(planetId: PlanetId, patch: Partial<PlanetConfig>) {
    setPanelConfig((prev) => ({
      ...prev,
      planets: { ...prev.planets, [planetId]: { ...prev.planets[planetId], ...patch } },
    }));
  }
  function updateObject(planetId: PlanetId, id: string, patch: Partial<UniverseObject>) {
    setPanelConfig((prev) => ({
      ...prev,
      planets: {
        ...prev.planets,
        [planetId]: {
          ...prev.planets[planetId],
          objects: prev.planets[planetId].objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        },
      },
    }));
  }
  function removeSelectedObject() {
    if (!selectedObjectId || !selectedPlanetId) return;
    const planetId = selectedPlanetId;
    const id = selectedObjectId;
    setPanelConfig((prev) => ({
      ...prev,
      planets: {
        ...prev.planets,
        [planetId]: { ...prev.planets[planetId], objects: prev.planets[planetId].objects.filter((o) => o.id !== id) },
      },
    }));
    setSelectedObjectId(null);
    setSelectedPlanetId(null);
  }
  function handleObjectMoved(planetId: PlanetId, id: string, position: [number, number, number]) {
    updateObject(planetId, id, { position });
  }

  // HOTFIX(사용자 지시 — "universe setting에서 오브제를 업로드할 수
  // 있는 게 없네... 별, 은하수, 별똥별, asteroid 등등"): 어느 행성에도
  // 속하지 않는 우주 공간 오브젝트 — 선택 상태는 행성 오브젝트/게시글
  // 선택과 서로 배타적이다.
  const [selectedSpaceObjectId, setSelectedSpaceObjectId] = useState<string | null>(null);
  function handleSelectSpaceObject(id: string) {
    setSelectedSpaceObjectId(id);
    setSelectedObjectId(null);
    setSelectedPlanetId(null);
    setSelectedPost(null);
  }
  function handleSpaceObjectError(id: string) {
    const key = `space:${id}`;
    setFailedObjectIds((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }
  function updateSpaceObject(id: string, patch: Partial<SpaceObject>) {
    setPanelConfig((prev) => ({
      ...prev,
      spaceObjects: prev.spaceObjects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  }
  function removeSelectedSpaceObject() {
    if (!selectedSpaceObjectId) return;
    const id = selectedSpaceObjectId;
    setPanelConfig((prev) => ({ ...prev, spaceObjects: prev.spaceObjects.filter((o) => o.id !== id) }));
    setSelectedSpaceObjectId(null);
  }
  function handleSpaceObjectMoved(id: string, position: [number, number, number]) {
    updateSpaceObject(id, { position });
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
    setSaveError(null);
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
    } else {
      // HOTFIX(사용자 신고 — "오브제 설정을 수정하면 저장할 수가 없네"):
      // 기존엔 error를 그냥 버려서 RLS 거부/네트워크 실패가 완전히
      // 조용히 사라졌다 — 실패를 콘솔+토스트로 드러낸다.
      console.error("[about-silo universe] 저장 실패:", error);
      setSaveError(error.message || "저장에 실패했습니다.");
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
    fetchUniverseImages(panelConfig.planets.silo.boardSlug).then((items) => {
      if (!cancelled) setSiloPosts(items);
    });
    return () => {
      cancelled = true;
    };
  }, [panelConfig.planets.silo.boardSlug]);

  useEffect(() => {
    let cancelled = false;
    fetchUniverseImages(panelConfig.planets.user.boardSlug).then((items) => {
      if (!cancelled) setUserPosts(items);
    });
    return () => {
      cancelled = true;
    };
  }, [panelConfig.planets.user.boardSlug]);

  // CameraControls는 마운트 시 Canvas의 초기 camera position을 자기
  // 나름대로 재해석하고, R3F는 부모(DOM) 트리와 별도 리컨실러로 커밋하므로
  // 이 effect가 처음 돌 때 ref가 아직 null일 수 있다 — 매 프레임 재시도해
  // 실제로 준비된 다음에만 홈 구도로 스냅.
  useEffect(() => {
    if (!siloPosts) return;
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
  }, [siloPosts]);

  function handleSelectPost(post: FeedPost, position: [number, number, number], normal: [number, number, number]) {
    setSelectedPost(post);
    setSelectedObjectId(null);
    setSelectedPlanetId(null);
    const controls = cameraControlsRef.current;
    if (!controls) return;
    const target = new THREE.Vector3(...position);
    const camPos = target.clone().add(new THREE.Vector3(...normal).multiplyScalar(0.9));
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
    setSelectedPost(null);
    setSelectedObjectId(null);
    setSelectedPlanetId(null);
    setSelectedSpaceObjectId(null);
    cameraControlsRef.current?.setLookAt(
      HOME_CAMERA_POS.x, HOME_CAMERA_POS.y, HOME_CAMERA_POS.z,
      HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z,
      true,
    );
  }

  function handleCloseObjectPanels() {
    setSelectedObjectId(null);
    setSelectedPlanetId(null);
    setSelectedSpaceObjectId(null);
  }

  const selectedPlanetObject =
    selectedPlanetId && selectedObjectId
      ? panelConfig.planets[selectedPlanetId].objects.find((o) => o.id === selectedObjectId) ?? null
      : null;
  const selectedSpaceObject = selectedSpaceObjectId
    ? panelConfig.spaceObjects.find((o) => o.id === selectedSpaceObjectId) ?? null
    : null;
  // ObjectInfoCard/ObjectInspectorPanel은 행성 오브젝트든 우주 오브젝트든
  // 구조가 같은 UniverseObject 모양이라 그대로 재사용한다 — onChange/
  // onDelete만 어느 쪽이 선택됐는지에 따라 갈라 보낸다.
  const selectedObject = selectedPlanetObject ?? selectedSpaceObject;
  function handleSelectedObjectChange(patch: Partial<UniverseObject>) {
    if (selectedPlanetObject && selectedPlanetId && selectedObjectId) updateObject(selectedPlanetId, selectedObjectId, patch);
    else if (selectedSpaceObject && selectedSpaceObjectId) updateSpaceObject(selectedSpaceObjectId, patch);
  }
  function handleSelectedObjectDelete() {
    if (selectedPlanetObject) removeSelectedObject();
    else if (selectedSpaceObject) removeSelectedSpaceObject();
  }

  const planetSettingsFailedIds = openPlanetSettings
    ? new Set(
        Array.from(failedObjectIds)
          .filter((k) => k.startsWith(`${openPlanetSettings}:`))
          .map((k) => k.slice(openPlanetSettings.length + 1)),
      )
    : new Set<string>();

  return (
    <div className="relative h-[85vh] min-h-[560px] w-full overflow-hidden bg-transparent">
      {/* HOTFIX-123: 게시글 위성 썸네일이 hover 없이도 스스로 페이드
          인/아웃하도록 하는 CSS 애니메이션 — R3F Canvas 밖의 일반 DOM
          <style> 태그라 여기 한 번만 선언하면 된다. */}
      <style>{`
        @keyframes silo-satellite-fade {
          0%, 100% { opacity: 0; }
          18%, 42% { opacity: 1; }
          60% { opacity: 0; }
        }
        .silo-satellite-thumb { animation: silo-satellite-fade 7s ease-in-out infinite; }
      `}</style>

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
        {siloPosts && (
          <Scene
            siloPosts={siloPosts}
            userPosts={userPosts ?? []}
            selectedPostId={selectedPost?.id ?? null}
            onSelectPost={handleSelectPost}
            cameraControlsRef={cameraControlsRef}
            config={panelConfig}
            onSiloClipsLoaded={setSiloClips}
            onUserClipsLoaded={setUserClips}
            onFocusPlanet={handleFocusPlanet}
            onOpenPlanetSettings={handleOpenPlanetSettings}
            onObjectError={handleObjectError}
            selectedPlanetId={selectedPlanetId}
            selectedObjectId={selectedObjectId}
            onSelectObject={handleSelectObject}
            objectRefs={objectRefs}
            onObjectMoved={handleObjectMoved}
            spaceObjects={panelConfig.spaceObjects}
            selectedSpaceObjectId={selectedSpaceObjectId}
            onSelectSpaceObject={handleSelectSpaceObject}
            onSpaceObjectError={handleSpaceObjectError}
            onSpaceObjectMoved={handleSpaceObjectMoved}
          />
        )}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="pointer-events-auto flex items-start justify-between text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">About Silo</p>
            <h1 className="mt-1 text-2xl font-light drop-shadow">사일로의 우주</h1>
            <p className="mt-1 max-w-sm text-xs text-white/70">
              떠 있는 마커를 클릭해 가까이 다가가고, 휠을 굴려 자유롭게 둘러보세요. 행성 자체를 클릭하면 그 행성으로 다가가며 전용 설정 창이 열립니다.
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

        {!siloPosts && (
          <div className="pointer-events-auto self-center rounded-full bg-black/40 px-4 py-2 text-xs text-white/70">
            우주를 준비하는 중...
          </div>
        )}

        {selectedPost && <SelectedPostPanel post={selectedPost} onClose={handleReset} />}
        {selectedObject && <ObjectInfoCard obj={selectedObject} onClose={handleCloseObjectPanels} />}

        <UniverseSettingsPanel
          config={panelConfig}
          onChange={updatePanelConfig}
          onSave={handleSave}
          saving={saving}
          savedAt={savedAt}
          failedSpaceObjectIds={
            new Set(
              Array.from(failedObjectIds)
                .filter((k) => k.startsWith("space:"))
                .map((k) => k.slice("space:".length)),
            )
          }
          onSelectSpaceObjectId={handleSelectSpaceObject}
        />

        {openPlanetSettings && (
          <PlanetSettingsPanel
            title={openPlanetSettings === "silo" ? "SILO 행성 설정" : `${panelConfig.planets.user.name || "유저"} 행성 설정`}
            accentClass={openPlanetSettings === "silo" ? "text-amber-200" : "text-emerald-200"}
            config={panelConfig.planets[openPlanetSettings]}
            onChange={(patch) => updatePlanetConfig(openPlanetSettings, patch)}
            availableClips={openPlanetSettings === "silo" ? siloClips : userClips}
            onSave={handleSave}
            saving={saving}
            savedAt={savedAt}
            failedObjectIds={planetSettingsFailedIds}
            onSelectObjectId={(id) => handleSelectObject(openPlanetSettings, id)}
            onClose={() => setOpenPlanetSettings(null)}
          />
        )}

        {selectedObject && (
          <ObjectInspectorPanel
            object={selectedObject}
            onChange={handleSelectedObjectChange}
            onDelete={handleSelectedObjectDelete}
            onClose={handleCloseObjectPanels}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {toast && (
          <div className="pointer-events-none fixed right-6 top-6 z-50 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs text-white shadow-xl backdrop-blur-sm">
            ✓ 저장됨
          </div>
        )}
        {saveError && (
          <div className="pointer-events-auto fixed right-6 top-6 z-50 max-w-[260px] rounded-lg border border-red-400/40 bg-red-950/80 px-4 py-2 text-xs text-red-100 shadow-xl backdrop-blur-sm">
            ✕ 저장 실패: {saveError}
          </div>
        )}
      </div>
    </div>
  );
}
