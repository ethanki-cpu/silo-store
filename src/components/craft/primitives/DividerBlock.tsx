"use client";

import { useNode } from "@craftjs/core";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { NumberField, ColorField, SelectField } from "@/components/craft/shared/FieldControls";

export type DividerBlockProps = {
  heightPx: number;
  lineStyle: "solid" | "dashed" | "dotted";
  color: string;
  widthPercent: number;
};

export function DividerBlock({ heightPx, lineStyle, color, widthPercent }: DividerBlockProps) {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="구분선">
        <div className="px-6 py-3">
          <hr
            style={{
              borderTopWidth: heightPx,
              borderTopStyle: lineStyle,
              borderTopColor: color,
              width: `${widthPercent}%`,
              margin: "0 auto",
            }}
          />
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function DividerSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as DividerBlockProps }));

  return (
    <div className="space-y-3">
      <NumberField label="굵기(px)" min={1} max={20} value={props.heightPx} onChange={(v) => setProp((p) => { p.heightPx = v; })} fallback={2} />
      <SelectField
        label="선 스타일"
        value={props.lineStyle}
        onChange={(v) => setProp((p) => { p.lineStyle = v; })}
        options={[
          { value: "solid", label: "실선" },
          { value: "dashed", label: "파선" },
          { value: "dotted", label: "점선" },
        ]}
      />
      <ColorField label="색상" value={props.color} onChange={(v) => setProp((p) => { p.color = v; })} fallback="#333333" />
      <NumberField label="너비(%)" min={1} max={100} value={props.widthPercent} onChange={(v) => setProp((p) => { p.widthPercent = v; })} fallback={100} />
    </div>
  );
}

DividerBlock.craft = {
  displayName: "DividerBlock",
  props: {
    heightPx: 2,
    lineStyle: "solid",
    color: "#333333",
    widthPercent: 100,
  } satisfies DividerBlockProps,
  related: { settings: DividerSettings },
};
