"use client";

// EPIC-121(사용자 지시 — "오른쪽에는 각 오브젝트에 대한 설정을 하는 창이
// 나오게 해줘"): 3D 뷰에서 오브젝트(장식 .glb)를 클릭해 선택하면 화면
// 우측에 뜨는 인스펙터 — 라벨/크기 편집 + 삭제. 위치 자체는 3D 뷰의
// TransformControls 기즈모로 직접 드래그하고(AboutSiloUniverse.tsx
// 참고), 여기서는 그 결과 좌표를 읽기 전용으로 보여준다.
import type { UniverseObject } from "@/lib/aboutSiloUniverseConfig";

export function ObjectInspectorPanel({
  object,
  onChange,
  onDelete,
  onClose,
}: {
  object: UniverseObject;
  onChange: (patch: Partial<UniverseObject>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto fixed right-6 top-24 z-40 w-[260px] rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">오브젝트 설정</p>
        <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
          ✕
        </button>
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] text-white/60">
          이름
          <input
            className="mt-1 w-full rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white"
            value={object.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
        <label className="block text-[10px] text-white/60">
          크기(스케일)
          <input
            type="range"
            min={0.05}
            max={2}
            step={0.05}
            className="mt-1 w-full"
            value={object.scale}
            onChange={(e) => onChange({ scale: Number(e.target.value) || 0.3 })}
          />
          <span className="text-white/50">{object.scale.toFixed(2)}</span>
        </label>
        <div className="text-[10px] text-white/40">
          위치는 3D 화면에서 오브젝트를 직접 드래그해 옮기세요(파란 화살표 기즈모).
          {object.position && (
            <p className="mt-1">
              현재: x {object.position[0].toFixed(2)} / y {object.position[1].toFixed(2)} / z {object.position[2].toFixed(2)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded border border-red-400/40 bg-red-500/10 py-1.5 text-[11px] text-red-200 hover:bg-red-500/20"
        >
          이 오브젝트 삭제
        </button>
      </div>
    </div>
  );
}
