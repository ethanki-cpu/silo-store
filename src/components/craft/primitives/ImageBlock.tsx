"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";

export type ImageBlockProps = {
  imageUrl: string;
  imageUrlMobile?: string;
  href: string;
  objectFit: "cover" | "contain";
  aspectRatio: string;
  // EPIC-103(Kinfolk 5th/8th/10th/13th 블록): 이미지 위에 카테고리/제목/요약을
  // 그라데이션 오버레이로 얹는다 — 전부 비어 있으면 아무것도 렌더링하지
  // 않아 기존(EPIC-102) 사용처는 그대로 동작한다(하위 호환).
  overlayCategory?: string;
  overlayTitle?: string;
  overlaySummary?: string;
  motion?: MotionConfig;
};

export function ImageBlock({
  imageUrl,
  imageUrlMobile,
  href,
  objectFit,
  aspectRatio,
  overlayCategory,
  overlayTitle,
  overlaySummary,
  motion = DEFAULT_MOTION,
}: ImageBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  const hasOverlay = overlayCategory || overlayTitle || overlaySummary;

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

  const body = (
    <div style={{ aspectRatio }} className="relative overflow-hidden">
      {image}
      {hasOverlay && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
          {overlayCategory && (
            <EditableText
              as="span"
              value={overlayCategory}
              onCommit={(next) => setProp((p) => { p.overlayCategory = next; })}
              className="text-[10px] font-medium uppercase tracking-wide opacity-80"
            />
          )}
          {overlayTitle && (
            <EditableText
              as="h3"
              value={overlayTitle}
              onCommit={(next) => setProp((p) => { p.overlayTitle = next; })}
              className="mt-1 text-lg font-semibold"
            />
          )}
          {overlaySummary && (
            <EditableText
              as="p"
              value={overlaySummary}
              onCommit={(next) => setProp((p) => { p.overlaySummary = next; })}
              className="mt-1 text-sm opacity-90"
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="이미지">
        <RevealWrapper motion={motion}>
          {href ? (
            <a href={href} className="block">
              {body}
            </a>
          ) : (
            body
          )}
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
      <div className="border-t border-gray-200 pt-3">
        <h4 className="mb-1.5 text-xs font-semibold text-gray-500">오버레이 캡션(선택)</h4>
        <div className="space-y-1.5">
          <input
            type="text"
            value={props.overlayCategory ?? ""}
            placeholder="카테고리"
            onChange={(e) => setProp((p) => { p.overlayCategory = e.target.value; })}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <input
            type="text"
            value={props.overlayTitle ?? ""}
            placeholder="제목"
            onChange={(e) => setProp((p) => { p.overlayTitle = e.target.value; })}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <input
            type="text"
            value={props.overlaySummary ?? ""}
            placeholder="요약"
            onChange={(e) => setProp((p) => { p.overlaySummary = e.target.value; })}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </div>
      </div>
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
    overlayCategory: "",
    overlayTitle: "",
    overlaySummary: "",
    motion: DEFAULT_MOTION,
  } satisfies ImageBlockProps,
  related: { settings: ImageSettings },
};
