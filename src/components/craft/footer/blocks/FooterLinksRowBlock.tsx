"use client";

// EPIC-105: 기존 footer_config의 legalLinks/faqLinks/extraLinks(전부 한
// 줄로 이어붙여 렌더링되던 것, Footer.tsx 참고)와 socialLinks를 하나의
// 재사용 가능한 "링크 행" 블록으로 표현 — openInNewTab 하나로 두 용도(사이트
// 내부 링크 행 vs 새 탭으로 여는 SNS 링크 행) 모두 커버한다.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";

export type FooterLinkItem = { label: string; href: string };
export type FooterLinksRowProps = { items: FooterLinkItem[]; openInNewTab: boolean };

export function FooterLinksRowBlock({ items, openInNewTab }: FooterLinksRowProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<FooterLinkItem>) {
    const nextItems = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    setProp((p) => { p.items = nextItems; });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="링크 행">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {items.map((item, i) => (
            <a key={i} href={item.href} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noreferrer" : undefined} className="hover:text-gray-800 hover:underline">
              <EditableText as="span" value={item.label} onCommit={(next) => updateItem(i, { label: next })} />
            </a>
          ))}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function FooterLinksRowSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as FooterLinksRowProps }));

  function addItem() {
    const next = [...props.items, { label: "새 링크", href: "/" }];
    setProp((p) => { p.items = next; });
  }
  function removeItem(index: number) {
    const next = props.items.filter((_, i) => i !== index);
    setProp((p) => { p.items = next; });
  }
  function updateHref(index: number, href: string) {
    const next = props.items.map((it, i) => (i === index ? { ...it, href } : it));
    setProp((p) => { p.items = next; });
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={props.openInNewTab}
          onChange={(e) => setProp((p) => { p.openInNewTab = e.target.checked; })}
        />
        새 탭으로 열기(SNS 링크용)
      </label>
      <div className="space-y-2">
        {props.items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              type="text"
              value={item.href}
              placeholder="URL"
              onChange={(e) => updateHref(i, e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <button type="button" onClick={() => removeItem(i)} className="text-[10px] text-red-500 hover:underline">
              삭제
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="w-full rounded border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-gray-400"
      >
        + 링크 추가
      </button>
    </div>
  );
}

FooterLinksRowBlock.craft = {
  displayName: "FooterLinksRowBlock",
  props: {
    items: [],
    openInNewTab: false,
  } satisfies FooterLinksRowProps,
  related: { settings: FooterLinksRowSettings },
};
