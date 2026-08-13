"use client";

import { useNode } from "@craftjs/core";
import { useRef } from "react";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { FreePositionHandles } from "@/components/craft/shared/FreePositionHandles";
import { FreePositionSettingsSection } from "@/components/craft/shared/FreePositionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { DEFAULT_FREE_POSITION, freePositionStyle, type FreePosition } from "@/lib/useFreePosition";

export type ButtonBlockProps = {
  label: string;
  href: string;
  variant: "primary" | "outline" | "text";
  motion?: MotionConfig;
  position?: FreePosition;
};

const VARIANT_CLASS: Record<ButtonBlockProps["variant"], string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-700",
  outline: "border border-gray-900 text-gray-900 hover:bg-gray-100",
  text: "text-gray-900 underline underline-offset-4 hover:text-gray-600",
};

export function ButtonBlock({ label, href, variant, motion = DEFAULT_MOTION, position = DEFAULT_FREE_POSITION }: ButtonBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const editable = useCraftEditable();
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={(dom) => { if (dom) { connect(dom); boxRef.current = dom; } }} style={freePositionStyle(position)}>
      <FreePositionHandles
        position={position}
        onChange={(next) => setProp((p) => { p.position = next; })}
        anchorRef={boxRef}
      />
      <EditableBlockFrame label="버튼">
        <RevealWrapper motion={motion} className="inline-block">
          {editable ? (
            <span className={`inline-block rounded-md px-4 py-2 text-sm font-medium transition-colors ${VARIANT_CLASS[variant]}`}>
              <EditableText
                as="span"
                value={label}
                onCommit={(next) => setProp((p) => { p.label = next; })}
                placeholder="버튼 텍스트"
              />
            </span>
          ) : (
            <a href={href} className={`inline-block rounded-md px-4 py-2 text-sm font-medium transition-colors ${VARIANT_CLASS[variant]}`}>
              {label}
            </a>
          )}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function ButtonSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ButtonBlockProps }));

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        링크(href)
        <input
          type="text"
          value={props.href}
          onChange={(e) => setProp((p) => { p.href = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        스타일
        <select
          value={props.variant}
          onChange={(e) => setProp((p) => { p.variant = e.target.value as ButtonBlockProps["variant"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="primary">채움</option>
          <option value="outline">테두리</option>
          <option value="text">텍스트만</option>
        </select>
      </label>
      <MotionSettingsSection />
      <FreePositionSettingsSection />
    </div>
  );
}

ButtonBlock.craft = {
  displayName: "ButtonBlock",
  props: {
    label: "더 알아보기",
    href: "/",
    variant: "primary",
    motion: DEFAULT_MOTION,
    position: DEFAULT_FREE_POSITION,
  } satisfies ButtonBlockProps,
  related: { settings: ButtonSettings },
};
