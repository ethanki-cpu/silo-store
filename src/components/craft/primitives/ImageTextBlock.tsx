"use client";

// BuilderJS "Image & Text" 섹션(이미지+제목+본문+버튼 조합, 배치만 다른
// 5가지 레이아웃 프리셋)에 대응. 5개의 거의 동일한 블록 타입을 따로 만드는
// 대신, 하나의 블록에 `layout` 선택지를 둬 배치만 바꾸는 쪽을 택했다 —
// 코드 중복 없이 캔버스에서 곧바로 레이아웃을 전환해볼 수도 있어 더 유연하다.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { uploadFile } from "@/lib/storage";

export type ImageTextLayout = "image-left" | "image-right" | "image-top" | "image-bottom" | "image-right-narrow";

export type ImageTextBlockProps = {
  layout: ImageTextLayout;
  imageUrl: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

const FLEX_DIRECTION: Record<ImageTextLayout, string> = {
  "image-left": "@[600px]:flex-row",
  "image-right": "@[600px]:flex-row-reverse",
  "image-top": "flex-col",
  "image-bottom": "flex-col-reverse",
  "image-right-narrow": "@[600px]:flex-row-reverse",
};

export function ImageTextBlock({ layout, imageUrl, heading, body, ctaLabel, ctaHref }: ImageTextBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const editable = useCraftEditable();
  const imageBasis = layout === "image-right-narrow" ? "@[600px]:basis-2/5" : "@[600px]:basis-1/2";

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="이미지 & 텍스트">
        <div className={`mx-auto flex max-w-4xl items-center gap-8 px-6 py-10 ${FLEX_DIRECTION[layout]}`}>
          <div className={`w-full shrink-0 ${imageBasis}`}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={heading} className="aspect-video w-full rounded-md object-cover" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                우측 설정 패널에서 이미지를 업로드하세요
              </div>
            )}
          </div>
          <div className="w-full flex-1">
            <EditableText
              as="h3"
              value={heading}
              onCommit={(next) => setProp((p) => { p.heading = next; })}
              className="text-xl font-semibold text-gray-900"
              placeholder="제목"
            />
            <EditableText
              as="p"
              value={body}
              onCommit={(next) => setProp((p) => { p.body = next; })}
              className="mt-2 text-sm leading-relaxed text-gray-600"
              placeholder="본문 내용을 입력하세요"
            />
            {editable ? (
              <span className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
                <EditableText as="span" value={ctaLabel} onCommit={(next) => setProp((p) => { p.ctaLabel = next; })} placeholder="버튼" />
              </span>
            ) : (
              <a href={ctaHref} className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
                {ctaLabel}
              </a>
            )}
          </div>
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function ImageTextSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ImageTextBlockProps }));
  const editable = useCraftEditable();

  async function uploadImage(file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFile(file, "post-images", "craft-image-text");
    if (!error && url) setProp((p) => { p.imageUrl = url; });
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        배치
        <select
          value={props.layout}
          onChange={(e) => setProp((p) => { p.layout = e.target.value as ImageTextLayout; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="image-left">이미지 왼쪽 + 텍스트 오른쪽</option>
          <option value="image-right">텍스트 왼쪽 + 이미지 오른쪽</option>
          <option value="image-top">이미지 위 + 텍스트 아래</option>
          <option value="image-bottom">텍스트 위 + 이미지 아래</option>
          <option value="image-right-narrow">텍스트 왼쪽(넓게) + 이미지 오른쪽(좁게)</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        이미지 업로드
        <input type="file" accept="image/*" disabled={!editable} onChange={(e) => uploadImage(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" />
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

ImageTextBlock.craft = {
  displayName: "ImageTextBlock",
  props: {
    layout: "image-left",
    imageUrl: "",
    heading: "제목을 입력하세요",
    body: "본문 내용을 입력하세요",
    ctaLabel: "더 알아보기",
    ctaHref: "/",
  } satisfies ImageTextBlockProps,
  related: { settings: ImageTextSettings },
};
