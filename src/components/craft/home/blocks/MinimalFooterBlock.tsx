"use client";

// EPIC-098: 극도로 절제된 하단 푸터 — 얇은 링크 행 + 저작권 한 줄.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "../editable";

export type MinimalFooterItem = { label: string; href: string };
export type MinimalFooterProps = { items: MinimalFooterItem[]; copyright: string };

export function MinimalFooterBlock({ items, copyright }: MinimalFooterProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<MinimalFooterItem>) {
    setProp((p) => {
      p.items = (p.items as MinimalFooterItem[]).map((it: MinimalFooterItem, i: number) => (i === index ? { ...it, ...patch } : it));
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Footer">
        <footer className="flex flex-col items-center gap-4 border-t border-gray-200 px-6 py-10 text-xs uppercase tracking-wide text-gray-400 md:flex-row md:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {items.map((item, i) => (
              <a key={i} href={item.href}>
                <EditableText
                  as="span"
                  value={item.label}
                  onCommit={(next) => updateItem(i, { label: next })}
                />
              </a>
            ))}
          </div>
          <EditableText
            as="span"
            value={copyright}
            onCommit={(next) => setProp((p) => (p.copyright = next))}
          />
        </footer>
      </EditableBlockFrame>
    </div>
  );
}

MinimalFooterBlock.craft = {
  displayName: "MinimalFooterBlock",
  props: {
    items: [
      { label: "About Silo", href: "/about-silo" },
      { label: "이용약관", href: "#" },
      { label: "개인정보처리방침", href: "#" },
    ],
    copyright: "© Silo Store. All rights reserved.",
  } satisfies MinimalFooterProps,
};
