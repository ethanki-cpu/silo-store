"use client";

// EPIC-102: Kinfolk 1st/2nd 블록(좌우 클릭 네비게이션 슬라이드쇼 / 자동전환
// 슬라이드쇼)과 드래그-스크롤 목록을 하나의 컴포넌트로 표현한다 — `mode`
// 값만 다르고 나머지 구조(slides 배열, 이미지/제목/설명/링크)는 동일하기
// 때문이다. 드래그-스크롤(mode="drag")은 이 레포에 전례가 없어 mousedown/
// mousemove/mouseup 기반 scrollLeft 조작을 여기서 새로 구현한다.
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { usePointerDragScroll } from "@/lib/usePointerDragScroll";
import { uploadFile } from "@/lib/storage";

export type SlideshowSlide = {
  imageUrl: string;
  title?: string;
  description?: string;
  href?: string;
};

export type SlideshowBlockProps = {
  mode: "auto" | "arrows" | "drag";
  slides: SlideshowSlide[];
  autoAdvanceSeconds: number;
  heightVh: number;
  // EPIC-103(Kinfolk 2nd 블록): true면 이 슬라이드쇼가 `position: sticky`로
  // 뷰포트에 고정된다 — 바로 다음 형제 블록(문서 순서상 더 나중, 불투명
  // 배경)이 스크롤을 따라 그 위로 자연스럽게 덮어 올라오는 "장막이 걷히는"
  // 효과를 별도 JS 스크롤 리스너 없이 순수 CSS로 얻는다.
  sticky?: boolean;
  motion?: MotionConfig;
};

function AutoOrArrowsSlideshow({
  slides,
  mode,
  autoAdvanceSeconds,
  heightVh,
}: {
  slides: SlideshowSlide[];
  mode: "auto" | "arrows";
  autoAdvanceSeconds: number;
  heightVh: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (mode !== "auto" || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, Math.max(1, autoAdvanceSeconds) * 1000);
    return () => clearInterval(timer);
  }, [mode, autoAdvanceSeconds, slides.length]);

  if (slides.length === 0) {
    return <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">슬라이드를 추가하세요</div>;
  }

  function go(delta: number) {
    setCurrent((c) => (c + delta + slides.length) % slides.length);
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-900" style={{ height: `${heightVh}vh` }}>
      {slides.map((slide, i) => (
        <a
          key={i}
          href={slide.href || undefined}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.imageUrl} alt={slide.title ?? ""} className="h-full w-full object-cover" />
          {(slide.title || slide.description) && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
              {slide.title && <h3 className="text-lg font-semibold">{slide.title}</h3>}
              {slide.description && <p className="text-sm opacity-90">{slide.description}</p>}
            </div>
          )}
        </a>
      ))}
      {mode === "arrows" && slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 슬라이드"
            onClick={() => go(-1)}
            className="absolute inset-y-0 left-0 w-1/2 cursor-w-resize"
          />
          <button
            type="button"
            aria-label="다음 슬라이드"
            onClick={() => go(1)}
            className="absolute inset-y-0 right-0 w-1/2 cursor-e-resize"
          />
        </>
      )}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번 슬라이드로 이동`}
              onClick={() => setCurrent(i)}
              className={`h-1.5 w-1.5 rounded-full ${i === current ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DragSlideshow({ slides, heightVh }: { slides: SlideshowSlide[]; heightVh: number }) {
  const { ref: scrollerRef, onPointerDown, onPointerMove, onPointerUp } = usePointerDragScroll<HTMLDivElement>();

  if (slides.length === 0) {
    return <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">슬라이드를 추가하세요</div>;
  }

  return (
    <div
      ref={scrollerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="flex cursor-grab select-none gap-3 overflow-x-auto active:cursor-grabbing"
      style={{ height: `${heightVh}vh`, scrollSnapType: "x proximity" }}
    >
      {slides.map((slide, i) => (
        <a
          key={i}
          href={slide.href || undefined}
          className="relative block h-full flex-shrink-0"
          style={{ scrollSnapAlign: "start", width: "min(80vw, 480px)" }}
          draggable={false}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.imageUrl} alt={slide.title ?? ""} className="pointer-events-none h-full w-full object-cover" draggable={false} />
          {(slide.title || slide.description) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
              {slide.title && <h3 className="text-base font-semibold">{slide.title}</h3>}
              {slide.description && <p className="text-xs opacity-90">{slide.description}</p>}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

export function SlideshowBlock({ mode, slides, autoAdvanceSeconds, heightVh, sticky = false, motion = DEFAULT_MOTION }: SlideshowBlockProps) {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }} className={sticky ? "sticky top-0 z-0" : undefined}>
      <EditableBlockFrame label={`슬라이드쇼(${mode})`}>
        <RevealWrapper motion={motion}>
          {mode === "drag" ? (
            <DragSlideshow slides={slides} heightVh={heightVh} />
          ) : (
            <AutoOrArrowsSlideshow slides={slides} mode={mode} autoAdvanceSeconds={autoAdvanceSeconds} heightVh={heightVh} />
          )}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function SlideshowSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as SlideshowBlockProps }));
  const editable = useCraftEditable();

  function updateSlide(index: number, patch: Partial<SlideshowSlide>) {
    const nextSlides = props.slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setProp((p) => { p.slides = nextSlides; });
  }
  function addSlide() {
    const nextSlides = [...props.slides, { imageUrl: "https://placehold.co/1200x800?text=New+Slide", title: "", description: "", href: "" }];
    setProp((p) => { p.slides = nextSlides; });
  }
  function removeSlide(index: number) {
    const nextSlides = props.slides.filter((_, i) => i !== index);
    setProp((p) => { p.slides = nextSlides; });
  }
  async function uploadSlideImage(index: number, file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFile(file, "post-images", "craft-slideshow");
    if (!error && url) updateSlide(index, { imageUrl: url });
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        모드
        <select
          value={props.mode}
          onChange={(e) => setProp((p) => { p.mode = e.target.value as SlideshowBlockProps["mode"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="auto">자동 전환</option>
          <option value="arrows">좌우 클릭 네비게이션</option>
          <option value="drag">드래그 스크롤</option>
        </select>
      </label>
      {props.mode === "auto" && (
        <label className="block text-xs text-gray-600">
          자동 전환 간격(초)
          <input
            type="number"
            min={1}
            value={props.autoAdvanceSeconds}
            onChange={(e) => setProp((p) => { p.autoAdvanceSeconds = Number(e.target.value) || 5; })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
      )}
      <label className="block text-xs text-gray-600">
        높이(vh)
        <input
          type="number"
          min={20}
          max={100}
          value={props.heightVh}
          onChange={(e) => setProp((p) => { p.heightVh = Number(e.target.value) || 60; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={props.sticky ?? false}
          onChange={(e) => setProp((p) => { p.sticky = e.target.checked; })}
        />
        스크롤 시 뒤 블록이 위로 덮이도록 고정(커튼 효과)
      </label>

      <div className="border-t border-gray-200 pt-3">
        <h4 className="mb-2 text-xs font-semibold text-gray-500">슬라이드 ({props.slides.length})</h4>
        <div className="space-y-3">
          {props.slides.map((slide, i) => (
            <div key={i} className="space-y-1.5 rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-400">#{i + 1}</span>
                <button type="button" onClick={() => removeSlide(i)} className="text-[10px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
              <label className="block text-[10px] text-gray-500">
                이미지 업로드
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadSlideImage(i, e.target.files?.[0] ?? null)}
                  className="mt-0.5 block w-full text-[10px]"
                  disabled={!editable}
                />
              </label>
              <input
                type="text"
                value={slide.title ?? ""}
                placeholder="제목"
                onChange={(e) => updateSlide(i, { title: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
              <input
                type="text"
                value={slide.description ?? ""}
                placeholder="설명"
                onChange={(e) => updateSlide(i, { description: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
              <input
                type="text"
                value={slide.href ?? ""}
                placeholder="링크(href)"
                onChange={(e) => updateSlide(i, { href: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSlide}
          className="mt-2 w-full rounded border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-gray-400"
        >
          + 슬라이드 추가
        </button>
      </div>
      <MotionSettingsSection />
    </div>
  );
}

SlideshowBlock.craft = {
  displayName: "SlideshowBlock",
  props: {
    mode: "arrows",
    slides: [
      { imageUrl: "https://placehold.co/1600x900?text=Slide+1", title: "", description: "", href: "" },
      { imageUrl: "https://placehold.co/1600x900?text=Slide+2", title: "", description: "", href: "" },
    ],
    autoAdvanceSeconds: 5,
    heightVh: 70,
    sticky: false,
    motion: DEFAULT_MOTION,
  } satisfies SlideshowBlockProps,
  related: { settings: SlideshowSettings },
};
