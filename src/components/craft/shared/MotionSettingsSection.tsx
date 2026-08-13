"use client";

// EPIC-102: 모든 원자 블록의 설정 패널(craft.related.settings)이 공통으로
// 붙이는 "모션" 섹션 — 각 블록 Props가 `motion?: MotionConfig`를 갖고 있기만
// 하면 그대로 재사용 가능하다(블록마다 새로 구현할 필요 없음).
import { useNode } from "@craftjs/core";
import { DEFAULT_MOTION, MOTION_TYPE_LABELS, type MotionConfig, type MotionType } from "@/lib/useScrollReveal";

export function MotionSettingsSection() {
  const { motion, setProp } = useNode((node) => ({
    motion: (node.data.props.motion as MotionConfig | undefined) ?? DEFAULT_MOTION,
  }));

  function update(patch: Partial<MotionConfig>) {
    setProp((props) => {
      props.motion = { ...motion, ...patch };
    });
  }

  return (
    <div className="space-y-2 border-t border-gray-200 pt-3">
      <h4 className="text-xs font-semibold text-gray-500">모션</h4>
      <label className="block text-xs text-gray-600">
        타입
        <select
          value={motion.type}
          onChange={(e) => update({ type: e.target.value as MotionType })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          {Object.entries(MOTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {motion.type !== "none" && (
        <>
          <label className="block text-xs text-gray-600">
            지연(ms)
            <input
              type="number"
              min={0}
              step={50}
              value={motion.delayMs}
              onChange={(e) => update({ delayMs: Number(e.target.value) || 0 })}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </label>
          <label className="block text-xs text-gray-600">
            길이(ms)
            <input
              type="number"
              min={100}
              step={50}
              value={motion.durationMs}
              onChange={(e) => update({ durationMs: Number(e.target.value) || 100 })}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </label>
        </>
      )}
    </div>
  );
}
