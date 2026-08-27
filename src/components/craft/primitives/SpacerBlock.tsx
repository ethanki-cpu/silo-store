"use client";

import { useNode } from "@craftjs/core";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { NumberField } from "@/components/craft/shared/FieldControls";

export type SpacerBlockProps = {
  heightPx: number;
};

export function SpacerBlock({ heightPx }: SpacerBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const editable = useCraftEditable();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="여백">
        <div
          style={{ height: heightPx }}
          className={editable ? "border-y border-dashed border-gray-200 bg-gray-50/50" : undefined}
        />
      </EditableBlockFrame>
    </div>
  );
}

function SpacerSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as SpacerBlockProps }));

  return (
    <div className="space-y-3">
      <NumberField label="높이(px)" min={4} max={400} value={props.heightPx} onChange={(v) => setProp((p) => { p.heightPx = v; })} fallback={40} />
    </div>
  );
}

SpacerBlock.craft = {
  displayName: "SpacerBlock",
  props: {
    heightPx: 40,
  } satisfies SpacerBlockProps,
  related: { settings: SpacerSettings },
};
