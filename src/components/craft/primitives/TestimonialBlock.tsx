"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { uploadFileToR2 } from "@/lib/r2Upload";

export type TestimonialBlockProps = {
  quote: string;
  authorName: string;
  authorRole: string;
  avatarUrl: string;
};

export function TestimonialBlock({ quote, authorName, authorRole, avatarUrl }: TestimonialBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="후기">
        <div className="mx-auto max-w-lg px-6 py-8 text-center">
          <EditableText
            as="p"
            value={quote}
            onCommit={(next) => setProp((p) => { p.quote = next; })}
            className="font-serif text-lg italic leading-relaxed text-gray-800"
            placeholder="“인용문을 입력하세요”"
          />
          <div className="mt-4 flex items-center justify-center gap-3">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={authorName} className="h-10 w-10 rounded-full object-cover" />
            )}
            <div className="text-left">
              <EditableText
                as="p"
                value={authorName}
                onCommit={(next) => setProp((p) => { p.authorName = next; })}
                className="text-sm font-medium text-gray-900"
                placeholder="이름"
              />
              <EditableText
                as="p"
                value={authorRole}
                onCommit={(next) => setProp((p) => { p.authorRole = next; })}
                className="text-xs text-gray-500"
                placeholder="소개(선택)"
              />
            </div>
          </div>
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function TestimonialSettings() {
  const { setProp } = useNode();
  const editable = useCraftEditable();

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFileToR2(file);
    if (!error && url) setProp((p) => { p.avatarUrl = url; });
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        아바타 업로드
        <input
          type="file"
          accept="image/*"
          disabled={!editable}
          onChange={(e) => uploadAvatar(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-xs"
        />
      </label>
    </div>
  );
}

TestimonialBlock.craft = {
  displayName: "TestimonialBlock",
  props: {
    quote: "이 곳에서 좋은 시간을 보냈어요.",
    authorName: "이름",
    authorRole: "",
    avatarUrl: "",
  } satisfies TestimonialBlockProps,
  related: { settings: TestimonialSettings },
};
