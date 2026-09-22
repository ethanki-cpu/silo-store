"use client";

// EPIC-161 Phase 3: 실로플래닛 회원별 행성 — 기존 AboutSiloUniverse.tsx(3081줄,
// SILO/User 행성 전용의 복잡한 드래그·오브젝트·GLB 로딩 기계)는 건드리지 않고
// 완전히 독립된 얇은 레이어로 추가한다. 각 회원 행성은 작은 구체 + Html 라벨
// 하나뿐 — SILO/User 행성처럼 표면 오브젝트/캐릭터/자전 궤도 위성을 붙이지
// 않는다(그건 그 두 "메인" 행성만의 특별 취급으로 남겨둔다).

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { fibonacciSphere } from "@/lib/fibonacciSphere";

export type MemberPlanet = {
  id: string;
  member_id: string;
  member_name: string;
  glb_url: string | null;
  like_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
};

const MARKER_RADIUS = 0.22;
const SCATTER_RADIUS = 20; // SILO/User 행성(반지름 ~1~1.6, 장식 오브젝트 7~9)보다 훨씬 바깥 — 별도 "성단"처럼 읽히게.

export function MemberPlanetMarkers({
  planets,
  center,
  selectedMemberId,
  onSelect,
}: {
  planets: MemberPlanet[];
  center: THREE.Vector3;
  selectedMemberId: string | null;
  onSelect: (memberId: string) => void;
}) {
  const positions = useMemo(() => fibonacciSphere(planets.length, SCATTER_RADIUS), [planets.length]);

  if (planets.length === 0) return null;

  return (
    <group position={center}>
      {planets.map((planet, i) => (
        <MemberPlanetMarker
          key={planet.member_id}
          planet={planet}
          position={positions[i]}
          selected={selectedMemberId === planet.member_id}
          onSelect={() => onSelect(planet.member_id)}
        />
      ))}
    </group>
  );
}

function MemberPlanetMarker({
  planet,
  position,
  selected,
  onSelect,
}: {
  planet: MemberPlanet;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={planet.is_mine ? "#f6c453" : selected ? "#ffffff" : "#9fb8ff"}
          emissive={planet.is_mine ? "#f6c453" : "#5b74c9"}
          emissiveIntensity={selected ? 0.9 : 0.4}
        />
      </mesh>
      <Html position={[0, MARKER_RADIUS + 0.28, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-full bg-black/50 px-2.5 py-0.5 text-center text-white backdrop-blur-sm">
          <div className="text-[10px] font-medium">
            {planet.member_name}
            {planet.like_count > 0 ? ` · ♥${planet.like_count}` : ""}
          </div>
        </div>
      </Html>
    </group>
  );
}
