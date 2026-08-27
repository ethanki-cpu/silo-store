"use client";

import { useNode } from "@craftjs/core";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { uploadFile } from "@/lib/storage";

export type ImageCollageBlockProps = {
  imageUrls: string[];
};

export function ImageCollageBlock({ imageUrls }: ImageCollageBlockProps) {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="이미지 콜라주">
        {imageUrls.length === 0 ? (
          <div className="flex h-24 items-center justify-center bg-gray-50 text-xs text-gray-400">
            우측 설정 패널에서 이미지를 추가하세요
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 px-6 py-4 @[600px]:grid-cols-3">
            {imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url + i} src={url} alt="" className="aspect-square w-full rounded object-cover" />
            ))}
          </div>
        )}
      </EditableBlockFrame>
    </div>
  );
}

function ImageCollageSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ImageCollageBlockProps }));
  const editable = useCraftEditable();

  async function addImage(file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFile(file, "post-images", "craft-collage");
    if (!error && url) setProp((p) => { p.imageUrls = [...p.imageUrls, url]; });
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-gray-500">이미지 ({props.imageUrls.length})</h4>
        <div className="space-y-1.5">
          {props.imageUrls.map((url, i) => (
            <div key={url + i} className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-8 w-8 flex-shrink-0 rounded object-cover" />
              <span className="flex-1 truncate text-[10px] text-gray-400">{url}</span>
              <button
                type="button"
                onClick={() => setProp((p) => { p.imageUrls = props.imageUrls.filter((_, idx) => idx !== i); })}
                className="text-[10px] text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <label className="mt-1.5 block w-full rounded border border-dashed border-gray-300 py-1.5 text-center text-xs text-gray-500 hover:border-gray-400">
          + 이미지 추가
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!editable}
            onChange={(e) => addImage(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </div>
  );
}

ImageCollageBlock.craft = {
  displayName: "ImageCollageBlock",
  props: {
    imageUrls: [],
  } satisfies ImageCollageBlockProps,
  related: { settings: ImageCollageSettings },
};
