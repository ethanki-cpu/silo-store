"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { uploadFileToR2 } from "@/lib/r2Upload";

export type SocialProofBlockProps = {
  avatarUrls: string[];
  caption: string;
};

export function SocialProofBlock({ avatarUrls, caption }: SocialProofBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="소셜 프루프">
        <div className="flex flex-col items-center gap-2 px-6 py-6">
          {avatarUrls.length > 0 && (
            <div className="flex -space-x-2">
              {avatarUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url + i} src={url} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
          )}
          <EditableText
            as="p"
            value={caption}
            onCommit={(next) => setProp((p) => { p.caption = next; })}
            className="text-center text-xs text-gray-500"
            placeholder="500명이 넘는 분들이 함께하고 있어요"
          />
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function SocialProofSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as SocialProofBlockProps }));
  const editable = useCraftEditable();

  async function addAvatar(file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFileToR2(file);
    if (!error && url) setProp((p) => { p.avatarUrls = [...p.avatarUrls, url]; });
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-gray-500">아바타 ({props.avatarUrls.length})</h4>
        <div className="space-y-1.5">
          {props.avatarUrls.map((url, i) => (
            <div key={url + i} className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
              <span className="flex-1 truncate text-[10px] text-gray-400">{url}</span>
              <button
                type="button"
                onClick={() => setProp((p) => { p.avatarUrls = props.avatarUrls.filter((_, idx) => idx !== i); })}
                className="text-[10px] text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <label className="mt-1.5 block w-full rounded border border-dashed border-gray-300 py-1.5 text-center text-xs text-gray-500 hover:border-gray-400">
          + 아바타 추가
          <input type="file" accept="image/*" className="hidden" disabled={!editable} onChange={(e) => addAvatar(e.target.files?.[0] ?? null)} />
        </label>
      </div>
    </div>
  );
}

SocialProofBlock.craft = {
  displayName: "SocialProofBlock",
  props: {
    avatarUrls: [],
    caption: "500명이 넘는 분들이 함께하고 있어요",
  } satisfies SocialProofBlockProps,
  related: { settings: SocialProofSettings },
};
