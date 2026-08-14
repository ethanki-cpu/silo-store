"use client";

// EPIC-113/114: /about-silo를 "어린 왕자" 감성의 3D 우주(행성+궤도 이미지+
// 위성)로 개편하는 프로토타입. React Three Fiber(three.js) 기반.
//
// 아키텍처 결정 메모:
// - 지시문은 "Framer Motion 3D (또는 @react-three/drei의 CameraControls)"를
//   양자택일로 제시했다 — framer-motion-3d@12.x는 @react-three/fiber@8.2.2를
//   peer로 요구해(마지막 업데이트가 fiber v8 시절), drei@10(fiber v9 필수)과
//   설치 자체가 충돌한다(npm ERESOLVE). 지시문이 명시한 대안대로
//   `@react-three/drei`의 `<CameraControls>`(camera-controls 라이브러리
//   래퍼, setLookAt으로 부드러운 fly-to 지원)만 사용하고 framer-motion-3d는
//   설치하지 않았다.
// - 카메라 거리 기반 페이드(LOD)는 매 프레임 React state를 갱신하는 대신
//   ref(뮤터블 객체)에 거리값을 담아 각 메시가 자기 자신의 useFrame에서
//   직접 읽어 opacity를 보간한다 — 60fps로 최상위 컴포넌트를 리렌더하는
//   대신 Three.js 객체를 직접 mutate하는 R3F 성능 관례를 따른다.
// - 사진 캡션 등 사이트 폰트를 그대로 쓰는 텍스트는 drei의 `<Html>`로,
//   내핵 카테고리 라벨처럼 "3D 공간 안의 사물"로 느껴져야 하는 텍스트는
//   (EPIC-114 지시문 요구대로) drei `<Text>`(troika-three-text, drei의
//   기존 의존성이라 별도 설치 불필요)로 그린다 — 용도가 다르다.
// - EPIC-114: SILO 행성과 유저 행성이 동시에 프레임 안에 들어오도록 두
//   행성을 원점이 아니라 좌/우로 벌려 고정 배치한다 — 이에 따라 "행성
//   내부로 들어갔는지"를 판정하는 거리 기준도 세계 원점이 아니라 SILO
//   행성 중심까지의 거리로 바꿨다(핵심 카테고리는 SILO 행성 소관이라
//   유저 행성 쪽에서는 반응할 이유가 없다).

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
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Html, Text, useTexture, type CameraControls as CameraControlsImpl } from "@react-three/drei";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { fibonacciSphere } from "@/lib/fibonacciSphere";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";
import { YoutubeBackground } from "./YoutubeBackground";

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

async function fetchUniverseImages(): Promise<FeedPost[]> {
  const res = await fetch("/api/boards/feed");
  if (!res.ok) return [];
  const data = (await res.json()) as {
    recommended?: FeedPost[];
    popular?: FeedPost[];
    latest?: FeedPost[];
  };
  // "사일로의 가치를 담은 대표 이미지" — 추천글(개념글)을 최우선으로 하고,
  // 개수가 모자라면 인기글/최신글로 채운다.
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

// EPIC-114: 내핵(內核)에서 드러나는 실제 플랫폼 카테고리 4종 — 각각
// 상징하는 임시 3D 형상(아래 CoreCategoryShape)과 짝을 이룬다.
const CORE_CATEGORIES = [
  {
    key: "silostore",
    label: "사일로 상점",
    sub: "Silo Store",
    href: "/silo-store",
    color: "#c99a5b",
    shape: "chest",
  },
  {
    key: "docent",
    label: "온라인 도슨트",
    sub: "Online Docent",
    href: "/online-docent",
    color: "#e7ddce",
    shape: "statue",
  },
  {
    key: "salon",
    label: "살롱데상",
    sub: "Salon des Cent",
    href: "/salon-des-cent",
    color: "#3f4a3d",
    shape: "phone",
  },
  {
    key: "studio",
    label: "스튜디오",
    sub: "Studio",
    href: "/studio",
    color: "#4a3626",
    shape: "camera",
  },
] as const;

// ============================================================
// 씬 레이아웃 — EPIC-114: 두 행성을 원점이 아니라 좌/우로 벌려 고정
// 배치한다("행성 동시 등장" 요구사항).
// ============================================================

const PLANET_RADIUS = 2.1;
const SILO_CENTER = new THREE.Vector3(-3.1, 0, 0);
const USER_PLANET_RADIUS = 1.05;
const USER_CENTER = new THREE.Vector3(3.3, -0.4, -0.6);

const IMAGE_ORBIT_RADIUS = 2.55;
const SURFACE_VISIBLE_DISTANCE = 4.2; // 이보다 멀면(SILO 중심 기준) 궤도 사진 완전히 보임
const CORE_VISIBLE_DISTANCE = 1.55; // 이보다 가까우면(SILO 내부) 핵심 카테고리 노드 완전히 보임
// 처음 진입 시 카메라 위치/시선 — 두 행성이 동시에 프레임에 들어오도록
// 두 중심의 중점보다 살짝 위, 충분히 뒤에서 넓은 화각으로 바라본다.
const HOME_TARGET = new THREE.Vector3(0.1, -0.1, 0);
const HOME_CAMERA_POS = new THREE.Vector3(0.6, 2.2, 11.5);
// EPIC-114: 줌아웃 한계 해제 — 우주 전체를 멀리서 조망할 수 있도록.
const MAX_ZOOM_DISTANCE = 120;

type DistanceRef = { current: number };
const DistanceContext = createContext<DistanceRef>({ current: HOME_CAMERA_POS.length() });

/** 카메라 ↔ SILO 행성 중심 사이 거리를 매 프레임 ref에 기록(리렌더 없이). */
function CameraDistanceTracker({ distanceRef }: { distanceRef: DistanceRef }) {
  useFrame(({ camera }) => {
    distanceRef.current = camera.position.distanceTo(SILO_CENTER);
  });
  return null;
}

/** 표면 궤도(사진)용 — 멀리서는 1, SILO 내부로 들어가면 0으로 사라진다. */
function surfaceOpacityFor(distance: number): number {
  if (distance >= SURFACE_VISIBLE_DISTANCE) return 1;
  if (distance <= CORE_VISIBLE_DISTANCE) return 0;
  return (distance - CORE_VISIBLE_DISTANCE) / (SURFACE_VISIBLE_DISTANCE - CORE_VISIBLE_DISTANCE);
}

/** 내핵(카테고리 노드)용 — surfaceOpacityFor의 정반대. */
function coreOpacityFor(distance: number): number {
  return 1 - surfaceOpacityFor(distance);
}

// ============================================================
// 툰 셰이딩 — MeshToonMaterial용 3단계 명암 그라디언트 맵을 코드로
// 직접 생성한다(별도 텍스처 에셋 파일 불필요). EPIC-114: 종이에 그린
// 듯한 질감을 위해 밴드 값을 더 낮춰(부드러운 파스텔) 대비를 완화.
// ============================================================

function useToonGradientMap(): THREE.DataTexture {
  return useMemo(() => {
    const bands = new Uint8Array([110, 190, 245]);
    const texture = new THREE.DataTexture(bands, bands.length, 1, THREE.RedFormat);
    texture.needsUpdate = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);
}

// ============================================================
// 사람 실루엣 플레이스홀더 — 각 행성 가장자리에 걸터앉은 모습(원화 스케치
// 참고). 상세 리깅 대신 원기둥(몸)+구(머리)로만 구성한 임시 오브젝트.
// ============================================================

function SittingFigure({
  position,
  rotationY = 0,
  scale = 1,
  color = "#2b2118",
}: {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* 몸(웅크려 앉은 자세를 살짝 기울인 캡슐로 흉내) */}
      <mesh position={[0, 0.16, 0]} rotation={[0.15, 0, 0]}>
        <capsuleGeometry args={[0.09, 0.22, 4, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* 머리 */}
      <mesh position={[0, 0.38, 0.03]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* 목도리(어린 왕자 실루엣의 상징 — 뒤로 흩날리는 얇은 판) */}
      <mesh position={[0, 0.3, -0.1]} rotation={[0.3, 0, 0]}>
        <planeGeometry args={[0.16, 0.22]} />
        <meshBasicMaterial color="#d98a4a" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ============================================================
// 중심 행성(SILO) & 유저 행성 — 파스텔 어스톤 + 부드러운 툰 셰이딩.
// ============================================================

function CentralPlanet() {
  const gradientMap = useToonGradientMap();
  return (
    <group position={SILO_CENTER}>
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <meshToonMaterial color="#e3a874" gradientMap={gradientMap} />
      </mesh>
      <SittingFigure position={[0.3, PLANET_RADIUS - 0.05, 0.55]} rotationY={-0.4} scale={1.3} />
    </group>
  );
}

// EPIC-114: 기존 "빠르게 공전하는 위성"에서 "화면 우측에 항상 보이는
// 유저 행성"으로 변경(요구사항 2 "행성 동시 등장") — 완전히 정적이면
// 죽어 보이니 아주 느린 제자리 부양(bobbing)만 남겨둔다.
function UserPlanet() {
  const gradientMap = useToonGradientMap();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.set(
        USER_CENTER.x,
        USER_CENTER.y + Math.sin(t * 0.35) * 0.12,
        USER_CENTER.z,
      );
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[USER_PLANET_RADIUS, 32, 32]} />
        <meshToonMaterial color="#c3d8b8" gradientMap={gradientMap} />
      </mesh>
      <SittingFigure position={[-0.15, USER_PLANET_RADIUS - 0.02, 0.4]} rotationY={0.5} scale={0.9} />
      {/* EPIC-113: 향후 "찜한 아이템" 등 마이페이지 데이터가 이 자리에
          식물/장식 Object3D로 자라난다 — 지금은 뼈대(빈 그룹)만. */}
      <group name="user-planet-decoration-bone" />
      <Html
        position={[0, -USER_PLANET_RADIUS - 0.35, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-center text-white backdrop-blur-sm">
          <div className="text-xs font-medium">My Page</div>
        </div>
      </Html>
    </group>
  );
}

// ============================================================
// 연결선(실뜨개 끈) — 두 행성 사이를 잇는, 우주를 유영하는 실처럼
// 부드러운 곡선(CatmullRomCurve3 + TubeGeometry).
// ============================================================

function ConnectingThread() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const from = SILO_CENTER.clone().add(new THREE.Vector3(1.5, 0.5, 1.1)); // SILO 표면 근처에서 시작
    const to = USER_CENTER.clone().add(new THREE.Vector3(-0.75, 0.3, 0.6)); // 유저 행성 표면 근처에서 끝
    // 직선이 아니라 완만하게 출렁이도록 중간 제어점 2개를 위/아래로 어긋나게 둔다.
    const mid1 = from.clone().lerp(to, 0.33).add(new THREE.Vector3(0, 0.9, 0.8));
    const mid2 = from.clone().lerp(to, 0.66).add(new THREE.Vector3(0, -0.6, -0.5));
    const curve = new THREE.CatmullRomCurve3([from, mid1, mid2, to]);
    return new THREE.TubeGeometry(curve, 64, 0.025, 8, false);
  }, []);

  // 살짝 떠다니는 느낌 — 전체를 아주 미세하게 위아래로 흔든다(비용이 큰
  // 커브 재계산 대신 그룹 position만 sin으로 흔든다).
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.6) * 0.04;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color="#f2e2b8" transparent opacity={0.75} toneMapped={false} />
    </mesh>
  );
}

// ============================================================
// 궤도를 도는 대표 이미지 — 피보나치 구면 좌표에 고정된 billboard.
//
// 대표 이미지 중 일부(예: 인스타그램 CDN에서 가져온 임베드 썸네일)는
// 외부 서버가 CORS/hotlink를 막아 WebGL 텍스처로 로드할 수 없다 — 실측 중
// 실제로 재현됨(콘솔에 THREE 텍스처 로드 실패로 컴포넌트 트리 전체가
// 죽는 Uncaught Error). `useTexture`(drei, suspend-react 기반)는 로드
// 실패 시 그 에러를 다음 렌더에서 던지므로, 이미지 하나마다 자체
// Suspense+ErrorBoundary로 감싸 그 하나만 조용히 자리표시자로 대체하고
// 나머지 궤도 사진/우주 전체는 영향받지 않게 한다.
// ============================================================

class ImageLoadErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[about-silo universe] 이미지 텍스처 로드 실패, 자리표시자로 대체:", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

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
    // 이미지가 항상 카메라를 정면으로 바라보게(billboard) 한다 — 구
    // 표면에 "붙어" 있으면서도 늘 평평하게 보인다(어린 왕자 그림책 느낌).
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

// ============================================================
// 내핵 카테고리 노드 — SILO 행성 내부로 들어오면 페이드인. EPIC-114:
// 추상 다면체 대신 각 카테고리를 상징하는 임시 형상 + 3D 텍스트 라벨.
// ============================================================

function CoreCategoryShape({ shape, color }: { shape: (typeof CORE_CATEGORIES)[number]["shape"]; color: string }) {
  switch (shape) {
    // 사일로 상점 — 보물상자(몸체 + 살짝 열린 뚜껑).
    case "chest":
      return (
        <group>
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.46, 0.28, 0.32]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.12, -0.1]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.46, 0.22, 0.3]} />
            <meshToonMaterial color="#a97c3f" />
          </mesh>
          <mesh position={[0, 0.02, 0.17]}>
            <torusGeometry args={[0.035, 0.012, 8, 16]} />
            <meshToonMaterial color="#e9c877" />
          </mesh>
        </group>
      );
    // 온라인 도슨트 — 밀로의 비너스를 연상시키는 팔 없는 대리석 흉상.
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
    // 살롱데상 — 빈티지 다이얼(로터리) 전화기.
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
        </group>
      );
    // 스튜디오 — 빈티지 필름 카메라 + 흩어진 폴라로이드 사진들.
    case "camera":
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.4, 0.26, 0.22]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.05, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.16, 20]} />
            <meshToonMaterial color="#161311" />
          </mesh>
          <mesh position={[-0.12, 0.16, 0]}>
            <boxGeometry args={[0.1, 0.06, 0.08]} />
            <meshToonMaterial color="#8a6a4a" />
          </mesh>
          {[[-0.28, -0.24, 0.12, -0.2], [-0.14, -0.32, 0.2, 0.3], [0.05, -0.3, -0.05, 0.1]].map(
            ([x, y, z, rot], i) => (
              <mesh key={i} position={[x, y, z]} rotation={[0, 0, rot]}>
                <boxGeometry args={[0.16, 0.18, 0.01]} />
                <meshToonMaterial color="#f4efe4" />
              </mesh>
            ),
          )}
        </group>
      );
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
  onNavigate,
}: {
  label: string;
  sub: string;
  color: string;
  shape: (typeof CORE_CATEGORIES)[number]["shape"];
  position: [number, number, number];
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
      // 그룹 안의 모든 머티리얼에 일괄 적용(형상마다 mesh 개수가 다르므로
      // 개별 ref 대신 traverse로 한 번에 처리).
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
        onClick={onNavigate}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <CoreCategoryShape shape={shape} color={color} />
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

function CoreCategories({ router }: { router: ReturnType<typeof useRouter> }) {
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
}: {
  posts: FeedPost[];
  selectedId: string | null;
  onSelect: (post: FeedPost, position: [number, number, number]) => void;
  cameraControlsRef: RefObject<CameraControlsImpl | null>;
  distanceRef: DistanceRef;
}) {
  const router = useRouter();
  const positions = useMemo(() => {
    const base = fibonacciSphere(posts.length, IMAGE_ORBIT_RADIUS);
    return base.map(([x, y, z]) => [x + SILO_CENTER.x, y + SILO_CENTER.y, z + SILO_CENTER.z] as [number, number, number]);
  }, [posts.length]);

  return (
    <DistanceContext.Provider value={distanceRef}>
      {/* 따뜻한 색감의 조명 파이프라인 — 사실적 조명 대신 동화적 톤.
          EPIC-114: 종이/수채화 느낌을 위해 강도를 한 단계 더 낮췄다. */}
      <ambientLight intensity={0.7} color="#ffe0ba" />
      <directionalLight position={[4, 6, 5]} intensity={0.8} color="#ffe6c4" />
      <directionalLight position={[-5, -2, -4]} intensity={0.2} color="#c9d8ff" />

      <CentralPlanet />
      <UserPlanet />
      <ConnectingThread />
      <CoreCategories router={router} />

      {posts.map((post, i) => (
        <ImageLoadErrorBoundary key={post.id} fallback={<SurfaceImageFallback position={positions[i]} />}>
          <Suspense fallback={null}>
            <SurfaceImage post={post} position={positions[i]} selected={selectedId === post.id} onSelect={onSelect} />
          </Suspense>
        </ImageLoadErrorBoundary>
      ))}

      <CameraDistanceTracker distanceRef={distanceRef} />
      <CameraControls ref={cameraControlsRef} minDistance={0.6} maxDistance={MAX_ZOOM_DISTANCE} dollySpeed={0.55} />

      {/* EPIC-114: 종이/유화 질감 — 약간의 Noise + Vignette로 "디지털
          렌더링 느낌"을 중화한다. */}
      <EffectComposer multisampling={0}>
        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </DistanceContext.Provider>
  );
}

// ============================================================
// 선택된 게시글 요약 패널(Canvas 바깥 HTML — 사이트 폰트/디자인 재사용).
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
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 text-sm text-white/60 hover:text-white"
        aria-label="닫기"
      >
        ✕
      </button>
      <p className="text-[11px] uppercase tracking-wide text-white/50">{post.board_name}</p>
      <h3 className="mt-1 text-lg font-medium">{post.title || "제목 없음"}</h3>
      <p className="mt-2 min-h-[2.5em] text-sm text-white/75">{excerpt ?? "불러오는 중..."}</p>
      {post.board_slug && (
        <a
          href={`/boards/${post.board_slug}/${post.slug}`}
          className="mt-3 inline-block text-sm text-amber-200 hover:underline"
        >
          자세히 보기 →
        </a>
      )}
    </div>
  );
}

// ============================================================
// AboutSiloUniverse — 최상위 컴포넌트.
// ============================================================

export function AboutSiloUniverse() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [selected, setSelected] = useState<FeedPost | null>(null);
  const cameraControlsRef = useRef<CameraControlsImpl>(null);
  const distanceRef = useRef<number>(HOME_CAMERA_POS.distanceTo(SILO_CENTER));

  useEffect(() => {
    let cancelled = false;
    fetchUniverseImages().then((items) => {
      if (!cancelled) setPosts(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // EPIC-114: CameraControls는 마운트 시 Canvas의 초기 camera position을
  // 자기 나름대로 재해석해(내부적으로 target을 원점으로 가정) 우리가 의도한
  // "SILO 행성과 유저 행성이 동시에 보이는" 구도와 어긋나게 초기화될 수
  // 있음을 실측으로 확인 — 마운트 직후 애니메이션 없이(false) 정확한 홈
  // 구도로 한 번 스냅해 항상 같은 최초 화면을 보장한다.
  useEffect(() => {
    if (!posts) return;
    // R3F는 자체 리컨실러로 Canvas 내부 트리를 커밋하기 때문에, 부모(DOM
    // 트리)의 useEffect가 실행되는 시점에는 <CameraControls ref=.../>가
    // 아직 붙지 않았을 수 있다(실측으로 확인 — 이 effect가 돌 때
    // cameraControlsRef.current가 null이었다). 매 프레임 재시도해 ref가
    // 실제로 준비된 다음에만 스냅한다.
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
    // 이미지 "코앞"으로 날아간다 — SILO 중심→이미지 방향(표면 법선)을
    // 따라 살짝 바깥쪽에 카메라를 두고, 이미지 자체를 바라보게 한다.
    const target = new THREE.Vector3(...position);
    const normal = target.clone().sub(SILO_CENTER).normalize();
    const camPos = SILO_CENTER.clone().add(normal.multiplyScalar(IMAGE_ORBIT_RADIUS + 0.9));
    controls.setLookAt(camPos.x, camPos.y, camPos.z, target.x, target.y, target.z, true);
  }

  function handleReset() {
    setSelected(null);
    cameraControlsRef.current?.setLookAt(
      HOME_CAMERA_POS.x,
      HOME_CAMERA_POS.y,
      HOME_CAMERA_POS.z,
      HOME_TARGET.x,
      HOME_TARGET.y,
      HOME_TARGET.z,
      true,
    );
  }

  return (
    <div className="relative h-[85vh] min-h-[560px] w-full overflow-hidden bg-transparent">
      {/* EPIC-114: 3D 캔버스 뒤의 몰입형 유튜브 배경(fixed, 뷰포트 전체). */}
      <YoutubeBackground />

      <Canvas
        // 성능 방어: 고해상도 디스플레이에서도 dpr을 최대 1.5로 제한.
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
          />
        )}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="pointer-events-auto flex items-start justify-between text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">About Silo</p>
            <h1 className="mt-1 text-2xl font-light drop-shadow">사일로의 우주</h1>
            <p className="mt-1 max-w-sm text-xs text-white/70">
              떠 있는 사진을 클릭해 가까이 다가가고, 휠을 굴려 행성 안쪽 세계로 들어가 보세요.
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
      </div>
    </div>
  );
}
