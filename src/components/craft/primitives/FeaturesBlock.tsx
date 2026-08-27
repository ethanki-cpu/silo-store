"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { NumberField, TextField, ListFieldWrapper, ListItemCard } from "@/components/craft/shared/FieldControls";

export type FeatureItem = { icon: string; title: string; description: string };

export type FeaturesBlockProps = {
  items: FeatureItem[];
  columns: number;
};

export function FeaturesBlock({ items, columns }: FeaturesBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="기능 카드">
        <div
          className="mx-auto grid max-w-5xl gap-8 px-6 py-10 text-center"
          style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, columns))}, minmax(0, 1fr))` }}
        >
          {items.map((item, i) => (
            <div key={i}>
              <EditableText
                as="span"
                value={item.icon}
                onCommit={(next) => setProp((p) => { p.items[i].icon = next; })}
                className="block text-3xl"
                placeholder="🎁"
              />
              <EditableText
                as="p"
                value={item.title}
                onCommit={(next) => setProp((p) => { p.items[i].title = next; })}
                className="mt-2 text-sm font-semibold text-gray-900"
                placeholder="제목"
              />
              <EditableText
                as="p"
                value={item.description}
                onCommit={(next) => setProp((p) => { p.items[i].description = next; })}
                className="mt-1 text-xs leading-relaxed text-gray-500"
                placeholder="설명"
              />
            </div>
          ))}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function FeaturesSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as FeaturesBlockProps }));

  return (
    <div className="space-y-3">
      <NumberField label="열 수" min={1} max={4} value={props.columns} onChange={(v) => setProp((p) => { p.columns = v; })} fallback={3} />
      <ListFieldWrapper
        label="카드"
        count={props.items.length}
        onAdd={() => setProp((p) => { p.items = [...p.items, { icon: "✨", title: "새 카드", description: "설명" }]; })}
      >
        {props.items.map((item, i) => (
          <ListItemCard key={i} onRemove={() => setProp((p) => { p.items = props.items.filter((_, idx) => idx !== i); })}>
            <TextField label="아이콘(이모지)" value={item.icon} onChange={(v) => setProp((p) => { p.items[i].icon = v; })} />
            <TextField label="제목" value={item.title} onChange={(v) => setProp((p) => { p.items[i].title = v; })} />
            <TextField label="설명" value={item.description} onChange={(v) => setProp((p) => { p.items[i].description = v; })} />
          </ListItemCard>
        ))}
      </ListFieldWrapper>
    </div>
  );
}

FeaturesBlock.craft = {
  displayName: "FeaturesBlock",
  props: {
    items: [
      { icon: "🕰️", title: "빈티지 큐레이션", description: "정성껏 고른 물건들" },
      { icon: "🤝", title: "커뮤니티", description: "함께 나누는 이야기" },
      { icon: "📚", title: "아카이브", description: "기록으로 남기는 순간들" },
    ],
    columns: 3,
  } satisfies FeaturesBlockProps,
  related: { settings: FeaturesSettings },
};
