"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";

export type TextBlockProps = {
  text: string;
  fontSizePx: number;
  fontWeight: "normal" | "medium" | "semibold" | "bold";
  align: "left" | "center" | "right";
  color: string;
  motion?: MotionConfig;
};

const WEIGHT_CLASS: Record<TextBlockProps["fontWeight"], string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const ALIGN_CLASS: Record<TextBlockProps["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function TextBlock({ text, fontSizePx, fontWeight, align, color, motion = DEFAULT_MOTION }: TextBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="텍스트">
        <RevealWrapper motion={motion}>
          <EditableText
            as="p"
            value={text}
            onCommit={(next) => setProp((p) => { p.text = next; })}
            className={`${WEIGHT_CLASS[fontWeight]} ${ALIGN_CLASS[align]}`}
            style={{ fontSize: fontSizePx, color }}
            placeholder="텍스트를 입력하세요"
          />
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function TextSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as TextBlockProps }));

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        정렬
        <select
          value={props.align}
          onChange={(e) => setProp((p) => { p.align = e.target.value as TextBlockProps["align"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="left">왼쪽</option>
          <option value="center">가운데</option>
          <option value="right">오른쪽</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        굵기
        <select
          value={props.fontWeight}
          onChange={(e) => setProp((p) => { p.fontWeight = e.target.value as TextBlockProps["fontWeight"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="normal">보통</option>
          <option value="medium">중간</option>
          <option value="semibold">약간 굵게</option>
          <option value="bold">굵게</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        크기(px)
        <input
          type="number"
          min={8}
          value={props.fontSizePx}
          onChange={(e) => setProp((p) => { p.fontSizePx = Number(e.target.value) || 16; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        색상
        <input
          type="text"
          value={props.color}
          placeholder="#111111"
          onChange={(e) => setProp((p) => { p.color = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
    </div>
  );
}

TextBlock.craft = {
  displayName: "TextBlock",
  props: {
    text: "새 텍스트",
    fontSizePx: 16,
    fontWeight: "normal",
    align: "left",
    color: "#111111",
    motion: DEFAULT_MOTION,
  } satisfies TextBlockProps,
  related: { settings: TextSettings },
};
