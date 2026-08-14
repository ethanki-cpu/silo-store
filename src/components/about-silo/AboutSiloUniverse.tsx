"use client";

// EPIC-113: /about-silo를 "어린 왕자" 감성의 3D 우주(행성+궤도 이미지+
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
// - 텍스트(제목/폰트)는 3D 지오메트리(troika-three-text 등 추가 의존성)
//   대신 drei의 `<Html>`으로 렌더링 — 이미 만들어진 사이트 폰트/디자인
//   시스템을 그대로 재사용할 수 있고 새 폰트 렌더링 파이프라인이 필요 없다.

import { useEffect, useMemo, useRef, useState, createContext, useContext, Component, Suspense, type RefObject, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Html, BakeShadows, useTexture, type CameraControls as CameraControlsImpl } from "@react-three/drei";
import * as THREE from "three";
import { fibonacciSphere } from "@/lib/fibonacciSphere";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";

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

// 내핵(內核)에서 드러나는 실제 플랫폼 카테고리 3종.
const CORE_CATEGORIES = [
  { key: "silostore", label: "사일로 상점", sub: "Silo Store", href: "/silo-store", color: "#e2a76f" },
  { key: "salon", label: "살롱데상", sub: "Salon des Cent", href: "/salon-des-cent", color: "#c98a9c" },
  { key: "docent", label: "온라인 도슨트", sub: "Online Docent", href: "/online-docent", color: "#8fb3c9" },
] as const;

// ============================================================
// 거리 기반 LOD — 카메라가 원점(행성 중심)에서 얼마나 떨어져 있는지를
// ref로 공유해, 매 프레임 각 메시가 자기 opacity를 스스로 보간한다.
// ============================================================

const PLANET_RADIUS = 2.1;
const IMAGE_ORBIT_RADIUS = 2.55;
const SURFACE_VISIBLE_DISTANCE = 4.2; // 이보다 멀면(또는 같으면) 궤도 사진 완전히 보임
const CORE_VISIBLE_DISTANCE = 1.55; // 이보다 가까우면(행성 내부) 핵심 카테고리 노드 완전히 보임
const DEFAULT_CAMERA_DISTANCE = 7;

type DistanceRef = { current: number };
const DistanceContext = createContext<DistanceRef>({ current: DEFAULT_CAMERA_DISTANCE });

function CameraDistanceTracker({ distanceRef }: { distanceRef: DistanceRef }) {
  useFrame(({ camera }) => {
    distanceRef.current = camera.position.length();
  });
  return null;
}

/** 표면 궤도(사진)용 — 멀리서는 1, 행성 내부로 들어가면 0으로 사라진다. */
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
// 직접 생성한다(별도 텍스처 에셋 파일 불필요).
// ============================================================

function useToonGradientMap(): THREE.DataTexture {
  return useMemo(() => {
    const bands = new Uint8Array([70, 170, 255]);
    const texture = new THREE.DataTexture(bands, bands.length, 1, THREE.RedFormat);
    texture.needsUpdate = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);
}

// ============================================================
// 중심 행성(SILO)
// ============================================================

function CentralPlanet() {
  const gradientMap = useToonGradientMap();
  return (
    <mesh>
      <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
      <meshToonMaterial color="#f2b880" gradientMap={gradientMap} />
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
// 유저 위성 — 은유적 마이페이지. 지금은 빈 Object3D("bone")만 준비해두고,
// 향후 마이페이지 데이터(찜한 아이템 등)가 여기 식물/장식으로 피어난다.
// ============================================================

function UserSatellite() {
  const gradientMap = useToonGradientMap();
  const groupRef = useRef<THREE.Group>(null);
  const orbitRadius = 3.9;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.12;
    groupRef.current?.position.set(Math.cos(t) * orbitRadius, Math.sin(t * 0.55) * 0.7, Math.sin(t) * orbitRadius);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshToonMaterial color="#bfe3c8" gradientMap={gradientMap} />
      </mesh>
      {/* EPIC-113: 향후 "찜한 아이템" 등 마이페이지 데이터가 이 자리에
          식물/장식 Object3D로 자라난다 — 지금은 뼈대(빈 그룹)만. */}
      <group name="user-satellite-decoration-bone" />
    </group>
  );
}

// ============================================================
// 내핵 카테고리 노드 — 행성 내부로 들어오면 페이드인.
// ============================================================

function CoreCategoryNode({
  label,
  sub,
  color,
  position,
  onNavigate,
}: {
  label: string;
  sub: string;
  color: string;
  position: [number, number, number];
  onNavigate: () => void;
}) {
  const distanceRef = useContext(DistanceContext);
  const materialRef = useRef<THREE.MeshToonMaterial>(null);
  const [opacity, setOpacity] = useState(0);
  const gradientMap = useToonGradientMap();

  useFrame(() => {
    const target = coreOpacityFor(distanceRef.current);
    if (materialRef.current) {
      const next = THREE.MathUtils.lerp(materialRef.current.opacity, target, 0.08);
      materialRef.current.opacity = next;
      materialRef.current.visible = next > 0.02;
      // Html 라벨은 three 머티리얼이 아니라 React state로만 투명도를 표현할
      // 수 있어(DOM), 값이 눈에 띄게 바뀔 때만 리렌더하도록 반올림해 갱신한다.
      const rounded = Math.round(next * 20) / 20;
      setOpacity((prev) => (prev === rounded ? prev : rounded));
    }
  });

  return (
    <group position={position}>
      <mesh onClick={onNavigate} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "auto")}>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshToonMaterial ref={materialRef} color={color} gradientMap={gradientMap} transparent opacity={0} />
      </mesh>
      {opacity > 0.05 && (
        <Html center distanceFactor={4} style={{ pointerEvents: "none", opacity, transition: "opacity 120ms linear" }}>
          <div className="whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-center text-white backdrop-blur-sm">
            <div className="text-xs font-medium">{label}</div>
            <div className="text-[10px] text-white/70">{sub}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function CoreCategories({ router }: { router: ReturnType<typeof useRouter> }) {
  const positions = fibonacciSphere(CORE_CATEGORIES.length, 0.85);
  return (
    <>
      {CORE_CATEGORIES.map((cat, i) => (
        <CoreCategoryNode
          key={cat.key}
          label={cat.label}
          sub={cat.sub}
          color={cat.color}
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
  const positions = useMemo(() => fibonacciSphere(posts.length, IMAGE_ORBIT_RADIUS), [posts.length]);

  return (
    <DistanceContext.Provider value={distanceRef}>
      {/* 따뜻한 색감의 조명 파이프라인 — 사실적 조명 대신 동화적 톤. */}
      <ambientLight intensity={0.6} color="#ffdcb2" />
      <directionalLight position={[4, 6, 5]} intensity={1.05} color="#ffe6c4" />
      <directionalLight position={[-5, -2, -4]} intensity={0.25} color="#c9d8ff" />

      <CentralPlanet />
      <UserSatellite />
      <CoreCategories router={router} />

      {posts.map((post, i) => (
        <ImageLoadErrorBoundary key={post.id} fallback={<SurfaceImageFallback position={positions[i]} />}>
          <Suspense fallback={null}>
            <SurfaceImage post={post} position={positions[i]} selected={selectedId === post.id} onSelect={onSelect} />
          </Suspense>
        </ImageLoadErrorBoundary>
      ))}

      <CameraDistanceTracker distanceRef={distanceRef} />
      <CameraControls ref={cameraControlsRef} minDistance={0.6} maxDistance={9.5} dollySpeed={0.55} />
      {/* 성능 방어: 정적 라이팅 결과를 한 번만 굽고(BakeShadows), 아래
          Canvas의 dpr 상한/프레임 제한과 함께 과부하를 막는다. */}
      <BakeShadows />
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
  const distanceRef = useRef<number>(DEFAULT_CAMERA_DISTANCE);

  useEffect(() => {
    let cancelled = false;
    fetchUniverseImages().then((items) => {
      if (!cancelled) setPosts(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelect(post: FeedPost, position: [number, number, number]) {
    setSelected(post);
    const controls = cameraControlsRef.current;
    if (!controls) return;
    // 이미지 "코앞"으로 날아간다 — 표면 법선(원점→이미지 방향)을 따라
    // 살짝 바깥쪽에 카메라를 두고, 이미지 자체를 바라보게 한다.
    const normal = new THREE.Vector3(...position).normalize();
    const camPos = normal.clone().multiplyScalar(IMAGE_ORBIT_RADIUS + 0.9);
    controls.setLookAt(camPos.x, camPos.y, camPos.z, position[0], position[1], position[2], true);
  }

  function handleReset() {
    setSelected(null);
    cameraControlsRef.current?.setLookAt(0, 1.2, DEFAULT_CAMERA_DISTANCE, 0, 0, 0, true);
  }

  return (
    <div className="relative h-[85vh] min-h-[560px] w-full overflow-hidden bg-gradient-to-b from-[#1c1730] via-[#241d3a] to-[#120f22]">
      <Canvas
        // 성능 방어: 고해상도 디스플레이에서도 dpr을 최대 1.5로 제한.
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 1.2, DEFAULT_CAMERA_DISTANCE], fov: 50 }}
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
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">About Silo</p>
            <h1 className="mt-1 text-2xl font-light">사일로의 우주</h1>
            <p className="mt-1 max-w-sm text-xs text-white/60">
              떠 있는 사진을 클릭해 가까이 다가가고, 휠을 굴려 행성 안쪽 세계로 들어가 보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs text-white hover:bg-white/20"
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
