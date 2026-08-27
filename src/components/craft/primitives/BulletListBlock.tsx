"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { SelectField, ListFieldWrapper, ListItemCard, TextField } from "@/components/craft/shared/FieldControls";

export type BulletIcon = "dot" | "check" | "arrow";

export type BulletListBlockProps = {
  icon: BulletIcon;
  items: string[];
};

const ICON_GLYPH: Record<BulletIcon, string> = {
  dot: "•",
  check: "✓",
  arrow: "→",
};

export function BulletListBlock({ icon, items }: BulletListBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="불릿 리스트">
        <ul className="mx-auto max-w-xl space-y-2 px-6 py-4">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700">
              <span aria-hidden className="shrink-0 text-gray-400">{ICON_GLYPH[icon]}</span>
              <EditableText
                as="span"
                value={item}
                onCommit={(next) => setProp((p) => { p.items[i] = next; })}
                className="flex-1"
                placeholder="항목을 입력하세요"
              />
            </li>
          ))}
        </ul>
      </EditableBlockFrame>
    </div>
  );
}

function BulletListSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as BulletListBlockProps }));

  return (
    <div className="space-y-3">
      <SelectField
        label="아이콘"
        value={props.icon}
        onChange={(v) => setProp((p) => { p.icon = v; })}
        options={[
          { value: "dot", label: "점" },
          { value: "check", label: "체크" },
          { value: "arrow", label: "화살표" },
        ]}
      />
      <ListFieldWrapper
        label="항목"
        count={props.items.length}
        onAdd={() => setProp((p) => { p.items = [...p.items, "새 항목"]; })}
      >
        {props.items.map((item, i) => (
          <ListItemCard key={i} onRemove={() => setProp((p) => { p.items = props.items.filter((_, idx) => idx !== i); })}>
            <TextField label={`항목 ${i + 1}`} value={item} onChange={(v) => setProp((p) => { p.items[i] = v; })} />
          </ListItemCard>
        ))}
      </ListFieldWrapper>
    </div>
  );
}

BulletListBlock.craft = {
  displayName: "BulletListBlock",
  props: {
    icon: "check",
    items: ["첫 번째 항목", "두 번째 항목", "세 번째 항목"],
  } satisfies BulletListBlockProps,
  related: { settings: BulletListSettings },
};
