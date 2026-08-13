"use client";

import { useNode } from "@craftjs/core";
import { useRef } from "react";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { FreePositionHandles } from "@/components/craft/shared/FreePositionHandles";
import { FreePositionSettingsSection } from "@/components/craft/shared/FreePositionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import {
  DEFAULT_FREE_POSITION,
  freePositionStyle,
  parseAspectRatio,
  splitAspectRatio,
  ASPECT_RATIO_PRESETS,
  type FreePosition,
} from "@/lib/useFreePosition";

export type ImageBlockProps = {
  imageUrl: string;
  imageUrlMobile?: string;
  href: string;
  objectFit: "cover" | "contain";
  aspectRatio: string;
  // EPIC-109: 자유 배치(position.enabled) 상태에서 리사이즈 핸들을 끌 때
  // 이 이미지의 가로세로 비율(aspectRatio 값 재사용)을 유지할지 여부.
  // 꺼져 있으면(기본) 가로/세로를 완전히 독립적으로 자유롭게 조절한다.
  lockAspectRatio?: boolean;
  // EPIC-103(Kinfolk 5th/8th/10th/13th 블록): 이미지 위에 카테고리/제목/요약을
  // 그라데이션 오버레이로 얹는다 — 전부 비어 있으면 아무것도 렌더링하지
  // 않아 기존(EPIC-102) 사용처는 그대로 동작한다(하위 호환).
  overlayCategory?: string;
  overlayTitle?: string;
  overlaySummary?: string;
  motion?: MotionConfig;
  position?: FreePosition;
};

export function ImageBlock({
  imageUrl,
  imageUrlMobile,
  href,
  objectFit,
  aspectRatio,
  lockAspectRatio = false,
  overlayCategory,
  overlayTitle,
  overlaySummary,
  motion = DEFAULT_MOTION,
  position = DEFAULT_FREE_POSITION,
}: ImageBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const boxRef = useRef<HTMLDivElement>(null);
  const lockedAspectRatio = lockAspectRatio ? parseAspectRatio(aspectRatio) : null;

  const hasOverlay = overlayCategory || overlayTitle || overlaySummary;

  // 버그 수정(EPIC-111): objectFit(cover/contain)을 예전엔 이 wrapper div에
  // className으로 얹었는데, object-fit CSS는 <img>/<video> 같은 replaced
  // element에만 적용되고 div에는 아무 효과가 없다 — 실제 <img>는
  // EditableResponsiveImage 내부에서 항상 object-cover로 하드코딩돼 있어
  // "채움 방식"을 contain으로 바꿔도 아무 변화가 없었다. `fit` prop으로
  // 실제 <img>까지 전달한다(아래 EditableResponsiveImage 정의 참고).
  const image = (
    <EditableResponsiveImage
      srcDesktop={imageUrl}
      srcMobile={imageUrlMobile}
      onCommitDesktop={(next) => setProp((p) => { p.imageUrl = next; })}
      onCommitMobile={(next) => setProp((p) => { p.imageUrlMobile = next; })}
      className="h-full w-full"
      fit={objectFit}
      uploadFolder="craft-primitives"
    />
  );

  // 자유 배치 중에는 바깥 박스(freePositionStyle)가 이미 %로 크기를
  // 정해주므로 aspectRatio를 또 적용하면 서로 충돌한다 — 자유 배치가
  // 꺼져 있을 때만(기존 flow 배치) aspectRatio로 높이를 정한다.
  // 버그 수정(EPIC-111): 이 div가 예전엔 position.enabled 여부와 상관없이
  // 항상 h-full이었는데, height:100%가 명시돼 있으면 CSS aspect-ratio는
  // (조상이 실제 높이를 안 줘서 100%가 사실상 auto로 계산되더라도) 무시된다
  // — "비율 선택 드롭다운을 바꿔도 프리뷰가 그대로"였던 원인. 자유 배치가
  // 꺼져 있을 때는 h-full을 아예 빼서 aspect-ratio가 높이를 정하게 한다.
  const body = (
    <div
      style={position.enabled ? undefined : { aspectRatio }}
      className={`relative w-full overflow-hidden ${position.enabled ? "h-full" : ""}`}
    >
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
    <div
      ref={(dom) => { if (dom) { connect(dom); boxRef.current = dom; } }}
      style={freePositionStyle(position)}
      className={position.enabled ? "h-full" : undefined}
    >
      <FreePositionHandles
        position={position}
        onChange={(next) => setProp((p) => { p.position = next; })}
        anchorRef={boxRef}
        lockedAspectRatio={lockedAspectRatio}
      />
      <EditableBlockFrame label="이미지">
        <RevealWrapper motion={motion} className={position.enabled ? "block h-full" : undefined}>
          {href ? (
            <a href={href} className={position.enabled ? "block h-full" : "block"}>
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

// EPIC-111(사용자 지시): "가로세로 비율 직접 입력"(텍스트로 "4/3" 타이핑)을
// 없애고 너비(px)/높이(px) 두 숫자 입력으로 대체 — 내부적으로는 여전히
// 같은 aspectRatio 문자열("너비/높이")로 저장해 기존 프리셋 드롭다운과 완전히
// 호환된다.
function PixelAspectRatioInputs({
  aspectRatio,
  onChange,
}: {
  aspectRatio: string;
  onChange: (next: string) => void;
}) {
  const [width, height] = splitAspectRatio(aspectRatio);
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs text-gray-600">
        픽셀 직접 입력 — 너비(px)
        <input
          type="number"
          min={1}
          value={Math.round(width)}
          onChange={(e) => {
            const w = e.target.valueAsNumber;
            if (Number.isFinite(w) && w > 0) onChange(`${w}/${height}`);
          }}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="text-xs text-gray-600">
        높이(px)
        <input
          type="number"
          min={1}
          value={Math.round(height)}
          onChange={(e) => {
            const h = e.target.valueAsNumber;
            if (Number.isFinite(h) && h > 0) onChange(`${width}/${h}`);
          }}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
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
        비율 선택(샘플)
        <select
          value={ASPECT_RATIO_PRESETS.some((p) => p.value === props.aspectRatio) ? props.aspectRatio : ""}
          onChange={(e) => {
            if (!e.target.value) return;
            setProp((p) => { p.aspectRatio = e.target.value; });
          }}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          {ASPECT_RATIO_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.value}>
              {preset.label}
            </option>
          ))}
          {!ASPECT_RATIO_PRESETS.some((p) => p.value === props.aspectRatio) && (
            <option value={props.aspectRatio}>직접 입력값({props.aspectRatio})</option>
          )}
        </select>
      </label>
      <PixelAspectRatioInputs
        aspectRatio={props.aspectRatio}
        onChange={(next) => setProp((p) => { p.aspectRatio = next; })}
      />
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={props.lockAspectRatio ?? false}
          onChange={(e) => setProp((p) => { p.lockAspectRatio = e.target.checked; })}
        />
        자유 배치로 크기 조절할 때 위 비율 유지(끄면 가로/세로 완전 자유)
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
      <FreePositionSettingsSection />
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
    lockAspectRatio: false,
    overlayCategory: "",
    overlayTitle: "",
    overlaySummary: "",
    motion: DEFAULT_MOTION,
    position: DEFAULT_FREE_POSITION,
  } satisfies ImageBlockProps,
  related: { settings: ImageSettings },
};
