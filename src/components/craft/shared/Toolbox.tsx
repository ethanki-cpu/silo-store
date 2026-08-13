"use client";

// EPIC-102: 진짜 드래그 소스 툴박스 — Craft.js 공식 패턴
// (`connectors.create(ref, buildElement)`)으로 각 항목을 캔버스 어디로든
// 드래그해 놓을 수 있게 한다. 기존 "+ 섹션 추가"(클릭 → ROOT 끝에 추가)는
// 클릭 시 폴백으로 그대로 남겨 접근성을 유지한다(드래그가 불편한 환경에서도
// 추가는 가능해야 함). "섹션"(정해진 6~7종 완성 레이아웃)과 "요소"(자유
// 조합용 원자 블록)를 그룹으로 나눠 보여준다.
import { useEditor } from "@craftjs/core";
import type { CraftBlockOption } from "./types";

function ToolboxItem({ option, onFallbackClick }: { option: CraftBlockOption; onFallbackClick: () => void }) {
  const { connectors } = useEditor();
  return (
    <button
      type="button"
      ref={(ref) => {
        if (ref) connectors.create(ref, option.buildElement);
      }}
      onClick={onFallbackClick}
      title="드래그해서 캔버스에 놓거나, 클릭하면 맨 끝에 추가돼요"
      className="w-full cursor-grab rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-xs text-gray-700 hover:border-gray-400 hover:bg-gray-50 active:cursor-grabbing"
    >
      {option.label}
    </button>
  );
}

function ToolboxGroup({
  title,
  options,
  onAdd,
}: {
  title: string;
  options: CraftBlockOption[];
  onAdd: (option: CraftBlockOption) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{title}</h4>
      <div className="space-y-1">
        {options.map((option) => (
          <ToolboxItem key={option.label} option={option} onFallbackClick={() => onAdd(option)} />
        ))}
      </div>
    </div>
  );
}

export function Toolbox({
  sections,
  elements,
  onAdd,
}: {
  sections: CraftBlockOption[];
  elements: CraftBlockOption[];
  onAdd: (option: CraftBlockOption) => void;
}) {
  return (
    <aside className="w-60 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-4">
      <ToolboxGroup title="섹션" options={sections} onAdd={onAdd} />
      <ToolboxGroup title="요소" options={elements} onAdd={onAdd} />
    </aside>
  );
}
