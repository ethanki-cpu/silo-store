"use client";

// BuilderJS "Text" 섹션(제목/본문/버튼 조합 3가지)에 대응 — ImageTextBlock과
// 같은 이유로 하나의 블록에 레이아웃 선택지를 둔다.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";

export type TextCTALayout = "single" | "with-heading" | "two-column";

export type TextCTABlockProps = {
  layout: TextCTALayout;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export function TextCTABlock({ layout, heading, body, ctaLabel, ctaHref }: TextCTABlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const editable = useCraftEditable();

  const ctaEl = editable ? (
    <span className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
      <EditableText as="span" value={ctaLabel} onCommit={(next) => setProp((p) => { p.ctaLabel = next; })} placeholder="버튼" />
    </span>
  ) : (
    <a href={ctaHref} className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
      {ctaLabel}
    </a>
  );

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="텍스트 + 버튼">
        {layout === "two-column" ? (
          <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10 @[600px]:flex-row @[600px]:items-center">
            <div className="flex-1">
              <EditableText
                as="p"
                value={body}
                onCommit={(next) => setProp((p) => { p.body = next; })}
                className="text-sm leading-relaxed text-gray-600"
                placeholder="본문 내용을 입력하세요"
              />
            </div>
            <div className="shrink-0">{ctaEl}</div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-10 text-center">
            {layout === "with-heading" && (
              <EditableText
                as="h3"
                value={heading}
                onCommit={(next) => setProp((p) => { p.heading = next; })}
                className="text-xl font-semibold text-gray-900"
                placeholder="제목"
              />
            )}
            <EditableText
              as="p"
              value={body}
              onCommit={(next) => setProp((p) => { p.body = next; })}
              className="mt-2 text-sm leading-relaxed text-gray-600"
              placeholder="본문 내용을 입력하세요"
            />
            {ctaEl}
          </div>
        )}
      </EditableBlockFrame>
    </div>
  );
}

function TextCTASettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as TextCTABlockProps }));

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        레이아웃
        <select
          value={props.layout}
          onChange={(e) => setProp((p) => { p.layout = e.target.value as TextCTALayout; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="single">본문 + 버튼</option>
          <option value="with-heading">제목 + 본문 + 버튼</option>
          <option value="two-column">본문 · 버튼 2단 배치</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        버튼 링크
        <input
          type="text"
          value={props.ctaHref}
          onChange={(e) => setProp((p) => { p.ctaHref = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
    </div>
  );
}

TextCTABlock.craft = {
  displayName: "TextCTABlock",
  props: {
    layout: "with-heading",
    heading: "제목을 입력하세요",
    body: "본문 내용을 입력하세요",
    ctaLabel: "더 알아보기",
    ctaHref: "/",
  } satisfies TextCTABlockProps,
  related: { settings: TextCTASettings },
};
