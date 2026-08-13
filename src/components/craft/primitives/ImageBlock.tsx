"use client";

import { useNode } from "@craftjs/core";
import { EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";

export type ImageBlockProps = {
  imageUrl: string;
  imageUrlMobile?: string;
  href: string;
  objectFit: "cover" | "contain";
  aspectRatio: string;
  motion?: MotionConfig;
};

export function ImageBlock({ imageUrl, imageUrlMobile, href, objectFit, aspectRatio, motion = DEFAULT_MOTION }: ImageBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  const image = (
    <EditableResponsiveImage
      srcDesktop={imageUrl}
      srcMobile={imageUrlMobile}
      onCommitDesktop={(next) => setProp((p) => { p.imageUrl = next; })}
      onCommitMobile={(next) => setProp((p) => { p.imageUrlMobile = next; })}
      className={`w-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
      uploadFolder="craft-primitives"
    />
  );

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="이미지">
        <RevealWrapper motion={motion}>
          <div style={{ aspectRatio }} className="overflow-hidden">
            {href ? (
              <a href={href} className="block h-full w-full">
                {image}
              </a>
            ) : (
              image
            )}
          </div>
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function ImageSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ImageBlockProps }));

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        링크(href)
        <input
          type="text"
          value={props.href}
          placeholder="/shop"
          onChange={(e) => setProp((p) => { p.href = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        채움 방식
        <select
          value={props.objectFit}
          onChange={(e) => setProp((p) => { p.objectFit = e.target.value as ImageBlockProps["objectFit"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="cover">채우기(cover)</option>
          <option value="contain">맞추기(contain)</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        가로세로 비율(CSS aspect-ratio, 예: 4/3)
        <input
          type="text"
          value={props.aspectRatio}
          onChange={(e) => setProp((p) => { p.aspectRatio = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
    </div>
  );
}

ImageBlock.craft = {
  displayName: "ImageBlock",
  props: {
    imageUrl: "https://placehold.co/800x600?text=Image",
    imageUrlMobile: "",
    href: "",
    objectFit: "cover",
    aspectRatio: "4/3",
    motion: DEFAULT_MOTION,
  } satisfies ImageBlockProps,
  related: { settings: ImageSettings },
};
