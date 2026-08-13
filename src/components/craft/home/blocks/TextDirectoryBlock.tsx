"use client";

// EPIC-098: 텍스트 전용 카테고리 디렉토리 — 이미지 없이 세리프 텍스트만
// 격자로 나열한다(매거진 목차/색인 페이지 느낌).
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "../editable";

export type TextDirectoryItem = { label: string; href: string };
export type TextDirectoryProps = { heading: string; items: TextDirectoryItem[] };

export function TextDirectoryBlock({ heading, items }: TextDirectoryProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<TextDirectoryItem>) {
    setProp((p) => {
      p.items = (p.items as TextDirectoryItem[]).map((it: TextDirectoryItem, i: number) => (i === index ? { ...it, ...patch } : it));
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Text Directory">
        <section className="border-t border-gray-200 px-6 py-20 text-center">
          <EditableText
            as="span"
            value={heading}
            className="mb-10 block text-xs font-medium uppercase tracking-[0.25em] text-gray-400"
            onCommit={(next) => setProp((p) => (p.heading = next))}
          />
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-8 @[768px]:grid-cols-4">
            {items.map((item, i) => (
              <a key={i} href={item.href} className="block">
                <EditableText
                  as="span"
                  value={item.label}
                  className="font-serif text-lg text-gray-800 hover:underline"
                  onCommit={(next) => updateItem(i, { label: next })}
                />
              </a>
            ))}
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

TextDirectoryBlock.craft = {
  displayName: "TextDirectoryBlock",
  props: {
    heading: "카테고리",
    items: [
      { label: "사일로 상점", href: "/silo-store" },
      { label: "온라인 도슨트", href: "/online-docent" },
      { label: "살롱데상", href: "/salon-des-cent" },
      { label: "스튜디오", href: "/studio" },
      { label: "커뮤니티", href: "/salon-des-cent/community" },
      { label: "갤러리", href: "/salon-des-cent/community/gallery" },
      { label: "아카이브", href: "/salon-des-cent/community/archives" },
      { label: "마이 페이지", href: "/mypage" },
    ],
  } satisfies TextDirectoryProps,
};
