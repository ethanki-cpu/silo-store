"use client";

// EPIC-102: 프리폼 에디터의 그릇 역할을 하는 nestable 컨테이너 — 다른 원자
// 블록(텍스트/이미지/버튼/영상/슬라이드쇼/게시판연동/타임라인)이나 다른
// ContainerBlock을 그 안에 자유롭게 드래그해 넣을 수 있다. isCanvas는
// RootContainer와 같은 방식(정적 craft.isCanvas가 아니라 `<Element canvas>`
// 래핑, defaultTree.tsx/Toolbox의 buildElement에서 처리)으로 지정한다.
import { useNode } from "@craftjs/core";
import type { ReactNode } from "react";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";

export type ContainerBlockProps = {
  layout: "row" | "col";
  gap: number;
  paddingY: number;
  paddingX: number;
  background: string;
  maxWidthPx: number | null;
  align: "start" | "center" | "end";
  motion?: MotionConfig;
  children?: ReactNode;
};

export function ContainerBlock({
  layout,
  gap,
  paddingY,
  paddingX,
  background,
  maxWidthPx,
  align,
  motion = DEFAULT_MOTION,
  children,
}: ContainerBlockProps) {
  const {
    connectors: { connect },
  } = useNode();

  const alignClass = { start: "items-start", center: "items-center", end: "items-end" }[align];

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="컨테이너">
        <RevealWrapper motion={motion}>
          <div
            className={`flex flex-wrap ${layout === "row" ? "flex-row" : "flex-col"} ${alignClass}`}
            style={{
              gap,
              paddingTop: paddingY,
              paddingBottom: paddingY,
              paddingLeft: paddingX,
              paddingRight: paddingX,
              background,
              maxWidth: maxWidthPx ?? undefined,
              marginLeft: maxWidthPx ? "auto" : undefined,
              marginRight: maxWidthPx ? "auto" : undefined,
              minHeight: 48,
            }}
          >
            {children}
          </div>
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function ContainerSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ContainerBlockProps }));

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        방향
        <select
          value={props.layout}
          onChange={(e) => setProp((p) => { p.layout = e.target.value as ContainerBlockProps["layout"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="row">가로</option>
          <option value="col">세로</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        정렬
        <select
          value={props.align}
          onChange={(e) => setProp((p) => { p.align = e.target.value as ContainerBlockProps["align"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="start">시작</option>
          <option value="center">가운데</option>
          <option value="end">끝</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        요소 간 간격(px)
        <input
          type="number"
          min={0}
          value={props.gap}
          onChange={(e) => setProp((p) => { p.gap = Number(e.target.value) || 0; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        상하 여백(px)
        <input
          type="number"
          min={0}
          value={props.paddingY}
          onChange={(e) => setProp((p) => { p.paddingY = Number(e.target.value) || 0; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        좌우 여백(px)
        <input
          type="number"
          min={0}
          value={props.paddingX}
          onChange={(e) => setProp((p) => { p.paddingX = Number(e.target.value) || 0; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        배경색
        <input
          type="text"
          value={props.background}
          placeholder="transparent, #ffffff, ..."
          onChange={(e) => setProp((p) => { p.background = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        최대 너비(px, 비우면 전체 너비)
        <input
          type="number"
          min={0}
          value={props.maxWidthPx ?? ""}
          onChange={(e) => setProp((p) => { p.maxWidthPx = e.target.value ? Number(e.target.value) : null; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
    </div>
  );
}

ContainerBlock.craft = {
  displayName: "ContainerBlock",
  props: {
    layout: "col",
    gap: 16,
    paddingY: 16,
    paddingX: 16,
    background: "transparent",
    maxWidthPx: null,
    align: "start",
    motion: DEFAULT_MOTION,
  } satisfies ContainerBlockProps,
  related: { settings: ContainerSettings },
};
