"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { TextField, ListFieldWrapper, ListItemCard } from "@/components/craft/shared/FieldControls";

export type StatItem = { number: string; label: string };

export type StatBlockProps = {
  items: StatItem[];
};

export function StatBlock({ items }: StatBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="통계/KPI">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 px-6 py-8">
          {items.map((item, i) => (
            <div key={i} className="text-center">
              <EditableText
                as="p"
                value={item.number}
                onCommit={(next) => setProp((p) => { p.items[i].number = next; })}
                className="font-serif text-3xl font-semibold text-gray-900"
                placeholder="123"
              />
              <EditableText
                as="p"
                value={item.label}
                onCommit={(next) => setProp((p) => { p.items[i].label = next; })}
                className="mt-1 text-xs uppercase tracking-wide text-gray-500"
                placeholder="라벨"
              />
            </div>
          ))}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function StatSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as StatBlockProps }));

  return (
    <div className="space-y-3">
      <ListFieldWrapper
        label="통계 항목"
        count={props.items.length}
        onAdd={() => setProp((p) => { p.items = [...p.items, { number: "0", label: "라벨" }]; })}
      >
        {props.items.map((item, i) => (
          <ListItemCard key={i} onRemove={() => setProp((p) => { p.items = props.items.filter((_, idx) => idx !== i); })}>
            <TextField label="숫자/값" value={item.number} onChange={(v) => setProp((p) => { p.items[i].number = v; })} />
            <TextField label="라벨" value={item.label} onChange={(v) => setProp((p) => { p.items[i].label = v; })} />
          </ListItemCard>
        ))}
      </ListFieldWrapper>
    </div>
  );
}

StatBlock.craft = {
  displayName: "StatBlock",
  props: {
    items: [
      { number: "500+", label: "회원" },
      { number: "12", label: "클럽" },
      { number: "3년", label: "함께한 시간" },
    ],
  } satisfies StatBlockProps,
  related: { settings: StatSettings },
};
