"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { NumberField, ColorField } from "@/components/craft/shared/FieldControls";

export type ProgressBarBlockProps = {
  label: string;
  percent: number;
  color: string;
  trackColor: string;
};

export function ProgressBarBlock({ label, percent, color, trackColor }: ProgressBarBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="진행률 바">
        <div className="px-6 py-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600">
            <EditableText
              as="span"
              value={label}
              onCommit={(next) => setProp((p) => { p.label = next; })}
              placeholder="라벨"
            />
            <span>{clamped}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, backgroundColor: color }} />
          </div>
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function ProgressBarSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ProgressBarBlockProps }));

  return (
    <div className="space-y-3">
      <NumberField label="진행률(%)" min={0} max={100} value={props.percent} onChange={(v) => setProp((p) => { p.percent = Math.max(0, Math.min(100, v)); })} fallback={50} />
      <ColorField label="바 색상" value={props.color} onChange={(v) => setProp((p) => { p.color = v; })} fallback="#166534" />
      <ColorField label="배경(트랙) 색상" value={props.trackColor} onChange={(v) => setProp((p) => { p.trackColor = v; })} fallback="#e5e7eb" />
    </div>
  );
}

ProgressBarBlock.craft = {
  displayName: "ProgressBarBlock",
  props: {
    label: "진행률",
    percent: 50,
    color: "#166534",
    trackColor: "#e5e7eb",
  } satisfies ProgressBarBlockProps,
  related: { settings: ProgressBarSettings },
};
