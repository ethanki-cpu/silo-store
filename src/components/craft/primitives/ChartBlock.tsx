"use client";

import { useNode } from "@craftjs/core";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { SelectField, ColorField, TextField, NumberField, ListFieldWrapper, ListItemCard } from "@/components/craft/shared/FieldControls";

export type ChartDatum = { label: string; value: number };
export type ChartKind = "bar" | "line";

export type ChartBlockProps = {
  kind: ChartKind;
  data: ChartDatum[];
  color: string;
};

// 별도 차트 라이브러리 의존성 없이(이메일/정적 페이지에서도 항상 렌더되도록)
// inline SVG로 최소한의 막대/선 그래프만 그린다 — 인터랙션(툴팁 등)은
// 없음, BuilderJS 같은 이메일 빌더의 차트 블록도 정적 이미지에 가깝다.
const WIDTH = 480;
const HEIGHT = 220;
const PADDING = 28;

export function ChartBlock({ kind, data, color }: ChartBlockProps) {
  const {
    connectors: { connect },
  } = useNode();

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;
  const step = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;
  const barWidth = data.length > 0 ? (innerWidth / data.length) * 0.6 : 0;

  const points = data.map((d, i) => {
    const x = PADDING + (data.length > 1 ? i * step : innerWidth / 2);
    const y = PADDING + innerHeight - (d.value / maxValue) * innerHeight;
    return { x, y, d };
  });

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="차트">
        <div className="flex justify-center px-6 py-4">
          {data.length === 0 ? (
            <div className="flex h-24 w-full items-center justify-center bg-gray-50 text-xs text-gray-400">데이터를 추가하세요</div>
          ) : (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-lg">
              <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} stroke="#e5e7eb" />
              <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="#e5e7eb" />
              {kind === "bar"
                ? points.map((p, i) => (
                    <rect
                      key={i}
                      x={p.x - barWidth / 2}
                      y={p.y}
                      width={barWidth}
                      height={HEIGHT - PADDING - p.y}
                      fill={color}
                      rx={2}
                    />
                  ))
                : (
                    <polyline
                      points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                    />
                  )}
              {kind === "line" && points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
              {points.map((p, i) => (
                <text key={i} x={p.x} y={HEIGHT - PADDING + 14} fontSize={10} fill="#6b7280" textAnchor="middle">
                  {p.d.label}
                </text>
              ))}
            </svg>
          )}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function ChartSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ChartBlockProps }));

  return (
    <div className="space-y-3">
      <SelectField
        label="종류"
        value={props.kind}
        onChange={(v) => setProp((p) => { p.kind = v; })}
        options={[
          { value: "bar", label: "막대 그래프" },
          { value: "line", label: "선 그래프" },
        ]}
      />
      <ColorField label="색상" value={props.color} onChange={(v) => setProp((p) => { p.color = v; })} fallback="#166534" />
      <ListFieldWrapper
        label="데이터"
        count={props.data.length}
        onAdd={() => setProp((p) => { p.data = [...p.data, { label: "항목", value: 1 }]; })}
      >
        {props.data.map((d, i) => (
          <ListItemCard key={i} onRemove={() => setProp((p) => { p.data = props.data.filter((_, idx) => idx !== i); })}>
            <TextField label="라벨" value={d.label} onChange={(v) => setProp((p) => { p.data[i].label = v; })} />
            <NumberField label="값" min={0} value={d.value} onChange={(v) => setProp((p) => { p.data[i].value = v; })} fallback={0} />
          </ListItemCard>
        ))}
      </ListFieldWrapper>
    </div>
  );
}

ChartBlock.craft = {
  displayName: "ChartBlock",
  props: {
    kind: "bar",
    data: [
      { label: "1월", value: 12 },
      { label: "2월", value: 18 },
      { label: "3월", value: 9 },
      { label: "4월", value: 24 },
    ],
    color: "#166534",
  } satisfies ChartBlockProps,
  related: { settings: ChartSettings },
};
