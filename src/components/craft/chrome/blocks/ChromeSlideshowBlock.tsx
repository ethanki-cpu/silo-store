"use client";

// HOTFIX(사용자 지시 — "메인로고/사용자메뉴/상단탭/슬라이드쇼/좌우
// 아이콘/하단메뉴 순서대로 블록이 나열되고, 한 화면에서 모든 설정을
// 할 수 있는 걸 원해"): 슬라이드쇼를 이 통합 캔버스의 한 블록으로
// 편입한다. 기존 `HeroSlideshowWidgetBlock`(craft/primitives)은 자체
// Supabase 조회 + "site_settings 동기화 모드일 땐 읽기 전용" 패턴이라
// 이 캔버스의 shim-setter 방식(부모가 config/onConfigChange를 prop으로
// 넘기고, 저장은 부모의 기존 "저장하기" 버튼이 site_settings에 직접
// 씀)과 안 맞아 새로 만들었다 — 실제 공개 홈페이지가 쓰는
// `HeroSlideshow.tsx`(src/components/, device="both")를 캔버스
// 미리보기에 그대로 재사용해 진짜 그대로의 모습으로 보이게 한다.
import { useState } from "react";
import { useNode } from "@craftjs/core";
import { uploadImage, compressImage } from "@/lib/adminImageUpload";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import type { HeroSlideshowConfig, SlideItem } from "@/lib/heroSlideshow";
import { ChromeSelectionOverlay } from "../ChromeSelectionOverlay";

const MAX_WALLPAPERS = 10;

export type ChromeSlideshowBlockProps = {
  config: HeroSlideshowConfig;
  onConfigChange: (patch: Partial<HeroSlideshowConfig>) => void;
};

export function ChromeSlideshowBlock({ config }: ChromeSlideshowBlockProps) {
  const {
    connectors: { connect },
    selected,
    hovered,
  } = useNode((node) => ({ selected: node.events.selected, hovered: node.events.hovered }));
  return (
    <div ref={(dom) => { if (dom) connect(dom); }} className="relative">
      {config.slides.length === 0 ? (
        <div className="flex h-40 items-center justify-center border-b border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
          등록된 슬라이드가 없어요 — 왼쪽에서 슬라이드를 추가하세요.
        </div>
      ) : (
        <HeroSlideshow
          device="both"
          slides={config.slides}
          autoAdvanceSeconds={config.autoAdvanceSeconds}
          objectFit={config.objectFit}
          wallpaperUrls={config.wallpaperUrls}
          marginTopPx={config.marginTopPx}
          marginBottomPx={config.marginBottomPx}
          marginLeftPx={config.marginLeftPx}
          marginRightPx={config.marginRightPx}
          heightVh={config.heightVh ?? 30}
        />
      )}
      <ChromeSelectionOverlay selected={selected} hovered={hovered} label="슬라이드쇼" />
    </div>
  );
}

function ChromeSlideshowSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ChromeSlideshowBlockProps }));
  const { config, onConfigChange } = props;
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);
  const [uploadingWallpaperIdx, setUploadingWallpaperIdx] = useState<number | null>(null);

  function patch(next: Partial<HeroSlideshowConfig>) {
    setProp((draft) => {
      draft.config = { ...config, ...next };
    });
    onConfigChange(next);
  }

  function addSlide() {
    patch({ slides: [...config.slides, { imageUrl: "", title: "", description: "" }] });
  }
  function updateSlide(index: number, slidePatch: Partial<SlideItem>) {
    patch({ slides: config.slides.map((s, i) => (i === index ? { ...s, ...slidePatch } : s)) });
  }
  function removeSlide(index: number) {
    patch({ slides: config.slides.filter((_, i) => i !== index) });
  }
  async function handleSlideFile(index: number, file: File | null) {
    if (!file) return;
    setUploadingSlideIdx(index);
    const { url } = await uploadImage(file, "slides");
    setUploadingSlideIdx(null);
    if (url) updateSlide(index, { imageUrl: url });
  }

  function addWallpaper() {
    if (config.wallpaperUrls.length >= MAX_WALLPAPERS) return;
    patch({ wallpaperUrls: [...config.wallpaperUrls, ""] });
  }
  function removeWallpaper(index: number) {
    patch({ wallpaperUrls: config.wallpaperUrls.filter((_, i) => i !== index) });
  }
  async function handleWallpaperFile(index: number, file: File | null) {
    if (!file) return;
    setUploadingWallpaperIdx(index);
    const compressed = await compressImage(file, config.wallpaperQuality);
    const { url } = await uploadImage(compressed, "wallpaper");
    setUploadingWallpaperIdx(null);
    if (url) patch({ wallpaperUrls: config.wallpaperUrls.map((u, i) => (i === index ? url : u)) });
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-2">
        <p className="font-medium text-gray-600">슬라이드 ({config.slides.length}개)</p>
        {config.slides.map((slide, idx) => (
          <div key={idx} className="space-y-1 rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">#{idx + 1}</span>
              <button type="button" onClick={() => removeSlide(idx)} className="text-[11px] text-red-500 hover:underline">
                삭제
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              disabled={uploadingSlideIdx === idx}
              onChange={(e) => handleSlideFile(idx, e.target.files?.[0] ?? null)}
              className="w-full text-[11px]"
            />
            <input
              value={slide.title}
              placeholder="제목(선택)"
              onChange={(e) => updateSlide(idx, { title: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
            <input
              value={slide.description}
              placeholder="설명(선택)"
              onChange={(e) => updateSlide(idx, { description: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          </div>
        ))}
        <button type="button" onClick={addSlide} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">
          + 슬라이드 추가
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-gray-600">섹션 높이(vh, 비우면 자동)</span>
        <input
          type="number"
          value={config.heightVh ?? ""}
          placeholder="자동(모바일 60/PC 70)"
          onChange={(e) => patch({ heightVh: e.target.value ? Number(e.target.value) : null })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">자동 전환(초)</span>
        <input
          type="number"
          value={config.autoAdvanceSeconds}
          onChange={(e) => patch({ autoAdvanceSeconds: Number(e.target.value) || 5 })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">이미지 맞춤</span>
        <select
          value={config.objectFit}
          onChange={(e) => patch({ objectFit: e.target.value as "cover" | "contain" })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="cover">꽉 채우기(cover)</option>
          <option value="contain">전체 보이기(contain)</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-gray-600">위 여백(px)</span>
          <input type="number" value={config.marginTopPx} onChange={(e) => patch({ marginTopPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">아래 여백(px)</span>
          <input type="number" value={config.marginBottomPx} onChange={(e) => patch({ marginBottomPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">좌 여백(px)</span>
          <input type="number" value={config.marginLeftPx} onChange={(e) => patch({ marginLeftPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">우 여백(px)</span>
          <input type="number" value={config.marginRightPx} onChange={(e) => patch({ marginRightPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
      </div>

      {config.objectFit === "contain" && (
        <div className="space-y-2">
          <p className="font-medium text-gray-600">여백 배경 이미지({config.wallpaperUrls.length}/{MAX_WALLPAPERS})</p>
          {config.wallpaperUrls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <input
                type="file"
                accept="image/*"
                disabled={uploadingWallpaperIdx === idx}
                onChange={(e) => handleWallpaperFile(idx, e.target.files?.[0] ?? null)}
                className="min-w-0 flex-1 text-[11px]"
              />
              <button type="button" onClick={() => removeWallpaper(idx)} className="shrink-0 text-[11px] text-red-500 hover:underline">
                삭제
              </button>
            </div>
          ))}
          {config.wallpaperUrls.length < MAX_WALLPAPERS && (
            <button type="button" onClick={addWallpaper} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">
              + 배경 이미지 추가
            </button>
          )}
          <label className="block">
            <span className="mb-1 block text-gray-600">압축 품질(%)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={config.wallpaperQuality}
              onChange={(e) => patch({ wallpaperQuality: Math.max(1, Math.min(100, Number(e.target.value) || 100)) })}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          </label>
        </div>
      )}
    </div>
  );
}

ChromeSlideshowBlock.craft = {
  displayName: "슬라이드쇼",
  related: { settings: ChromeSlideshowSettings },
};
