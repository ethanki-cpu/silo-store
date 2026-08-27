"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { NumberField, ColorField } from "@/components/craft/shared/FieldControls";

export type RatingBlockProps = {
  value: number;
  caption: string;
  color: string;
};

function Star({ fillPercent, color }: { fillPercent: number; color: string }) {
  const id = `star-clip-${Math.round(fillPercent * 1000)}`;
  return (
    <svg viewBox="0 0 24 24" width={22} height={22}>
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={24 * fillPercent} height="24" />
        </clipPath>
      </defs>
      <path
        d="M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.4l-6.1 3.5 1.5-6.8L2.2 9.5l6.9-.7z"
        fill="none"
        stroke="#d1d5db"
        strokeWidth="1"
      />
      <g clipPath={`url(#${id})`}>
        <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.4l-6.1 3.5 1.5-6.8L2.2 9.5l6.9-.7z" fill={color} />
      </g>
    </svg>
  );
}

export function RatingBlock({ value, caption, color }: RatingBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const clamped = Math.max(0, Math.min(5, value));

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="별점">
        <div className="flex flex-col items-center gap-1.5 px-6 py-4">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} fillPercent={Math.max(0, Math.min(1, clamped - i))} color={color} />
            ))}
          </div>
          <EditableText
            as="span"
            value={caption}
            onCommit={(next) => setProp((p) => { p.caption = next; })}
            className="text-xs text-gray-500"
            placeholder="후기 문구(선택)"
          />
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function RatingSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as RatingBlockProps }));

  return (
    <div className="space-y-3">
      <NumberField
        label="점수(0~5)"
        min={0}
        max={5}
        value={props.value}
        onChange={(v) => setProp((p) => { p.value = Math.max(0, Math.min(5, v)); })}
        fallback={5}
      />
      <ColorField label="별 색상" value={props.color} onChange={(v) => setProp((p) => { p.color = v; })} fallback="#f59e0b" />
    </div>
  );
}

RatingBlock.craft = {
  displayName: "RatingBlock",
  props: {
    value: 5,
    caption: "",
    color: "#f59e0b",
  } satisfies RatingBlockProps,
  related: { settings: RatingSettings },
};
