"use client";

// EPIC-102: 프리폼 에디터의 그릇 역할을 하는 nestable 컨테이너 — 다른 원자
// 블록(텍스트/이미지/버튼/영상/슬라이드쇼/게시판연동/타임라인)이나 다른
// ContainerBlock을 그 안에 자유롭게 드래그해 넣을 수 있다. isCanvas는
// RootContainer와 같은 방식(정적 craft.isCanvas가 아니라 `<Element canvas>`
// 래핑, defaultTree.tsx/Toolbox의 buildElement에서 처리)으로 지정한다.
//
// EPIC-108(콜라주): 이 컨테이너의 자식들(텍스트/이미지 등)이 "자유 배치"를
// 켜면 이 컨테이너를 기준으로 겹쳐서 뜬다 — 그러려면 자식을 담는 내부
// flex div가 항상 `position: relative`여야 한다(아래 innerRef가 붙는 div).
// 컨테이너 자기 자신도 더 바깥 컨테이너 위에 자유 배치될 수 있어 동일한
// FreePositionHandles/freePositionStyle을 그대로 쓴다.
import { useNode } from "@craftjs/core";
import { useRef, type ReactNode } from "react";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { FreePositionHandles } from "@/components/craft/shared/FreePositionHandles";
import { FreePositionSettingsSection } from "@/components/craft/shared/FreePositionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { DEFAULT_FREE_POSITION, freePositionStyle, type FreePosition } from "@/lib/useFreePosition";

export type ContainerBlockProps = {
  layout: "row" | "col";
  gap: number;
  paddingY: number;
  paddingX: number;
  background: string;
  maxWidthPx: number | null;
  align: "start" | "center" | "end";
  motion?: MotionConfig;
  position?: FreePosition;
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
  position = DEFAULT_FREE_POSITION,
  children,
}: ContainerBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const boxRef = useRef<HTMLDivElement>(null);

  const alignClass = { start: "items-start", center: "items-center", end: "items-end" }[align];

  return (
    <div
      ref={(dom) => { if (dom) { connect(dom); boxRef.current = dom; } }}
      style={freePositionStyle(position)}
    >
      <FreePositionHandles
        position={position}
        onChange={(next) => setProp((p) => { p.position = next; })}
        anchorRef={boxRef}
      />
      <EditableBlockFrame label="컨테이너">
        <RevealWrapper motion={motion}>
          <div
            className={`relative flex flex-wrap ${layout === "row" ? "flex-row" : "flex-col"} ${alignClass}`}
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
      <FreePositionSettingsSection />
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
    position: DEFAULT_FREE_POSITION,
  } satisfies ContainerBlockProps,
  related: { settings: ContainerSettings },
};
