"use client";

// EPIC-107: "홈페이지 설정 관리"(site_settings.hero_slideshow)에 공들여
// 만든 히어로 슬라이드쇼(HeroSlideshow.tsx — 크로스페이드, objectFit=
// contain일 때 랜덤 여백 배경, 여백(px) 4방향, 자동 전환)를 새로 만들지
// 않고 그대로 재사용해 Craft 캔버스 어디든 넣을 수 있는 블록으로
// 감싼다(사용자 요청: "그거 만드느라 시간 오래 쏟았는데" — 기존 컴포넌트
// 재사용이 핵심, 새 슬라이드쇼 구현이 아님). PC/모바일 분리 렌더링은
// Native Page Builder의 "hero" 위젯과 동일하게 device="both"로 단순화
// (분리가 필요하면 이 블록 자체가 아니라 관리자가 사이트 설정에서 쓰는
// 기존 기능을 계속 쓰면 된다 — 여기서는 Craft 캔버스 삽입 자체가 목적).
//
// EPIC-107 후속(사용자 지시 — "이미 존재하는 '홈페이지 슬라이드쇼'랑
// 연동되는 옵션이 없다"): syncWithSiteSettings를 켜면 이 블록 자신의
// slides/margin/objectFit을 전부 무시하고, 관리자가 "/admin/navigation/
// settings"(홈페이지 설정 관리)에서 관리하는 site_settings.hero_slideshow를
// 그대로 읽어와 실시간으로 반영한다 — 즉 그 화면에서 슬라이드를 바꾸면
// 이 블록이 박힌 모든 Craft 페이지가 같이 바뀐다(진짜 "연동").
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import Link from "next/link";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { uploadFile } from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";
import { normalizeHeroSlideshow, type HeroSlideshowConfig } from "@/lib/heroSlideshow";

export type HeroSlideshowWidgetSlide = { imageUrl: string; title: string; description: string };

export type HeroSlideshowWidgetProps = {
  // EPIC-107 후속: 켜져 있으면 아래 slides~marginRightPx는 전부 무시되고
  // site_settings.hero_slideshow의 값이 대신 쓰인다.
  syncWithSiteSettings: boolean;
  syncDevice: "pc" | "mobile";
  slides: HeroSlideshowWidgetSlide[];
  autoAdvanceSeconds: number;
  objectFit: "cover" | "contain";
  wallpaperUrls: string[];
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  // EPIC-110: syncWithSiteSettings가 꺼져 있을 때(수동 모드)만 쓰이는
  // 섹션 높이(vh) — null이면 HeroSlideshow.tsx의 기존 기본값(모바일
  // 60vh/PC 70vh)을 그대로 쓴다.
  heightVh: number | null;
  motion?: MotionConfig;
};

function useSyncedHeroConfig(enabled: boolean, device: "pc" | "mobile") {
  const [config, setConfig] = useState<HeroSlideshowConfig | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "hero_slideshow")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const value = normalizeHeroSlideshow(data?.setting_value ?? null);
        setConfig(device === "mobile" ? value.mobile : value.pc);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, device]);

  return { config, loading };
}

export function HeroSlideshowWidgetBlock({
  syncWithSiteSettings,
  syncDevice,
  slides,
  autoAdvanceSeconds,
  objectFit,
  wallpaperUrls,
  marginTopPx,
  marginBottomPx,
  marginLeftPx,
  marginRightPx,
  heightVh,
  motion = DEFAULT_MOTION,
}: HeroSlideshowWidgetProps) {
  const {
    connectors: { connect },
  } = useNode();
  const { config: synced, loading: syncLoading } = useSyncedHeroConfig(syncWithSiteSettings, syncDevice);

  const resolved = syncWithSiteSettings
    ? synced
    : { slides, autoAdvanceSeconds, objectFit, wallpaperUrls, marginTopPx, marginBottomPx, marginLeftPx, marginRightPx, heightVh };

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label={syncWithSiteSettings ? "홈페이지 슬라이드쇼 위젯 (관리자 설정과 연동됨)" : "홈페이지 슬라이드쇼 위젯"}>
        <RevealWrapper motion={motion}>
          {syncWithSiteSettings && syncLoading ? (
            <div className="flex h-40 items-center justify-center bg-gray-100 text-xs text-gray-400">불러오는 중...</div>
          ) : resolved ? (
            <HeroSlideshow
              device="both"
              slides={resolved.slides}
              autoAdvanceSeconds={resolved.autoAdvanceSeconds}
              objectFit={resolved.objectFit}
              wallpaperUrls={resolved.wallpaperUrls}
              marginTopPx={resolved.marginTopPx}
              marginBottomPx={resolved.marginBottomPx}
              marginLeftPx={resolved.marginLeftPx}
              marginRightPx={resolved.marginRightPx}
              heightVh={resolved.heightVh}
            />
          ) : null}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function HeroSlideshowWidgetSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as HeroSlideshowWidgetProps }));
  const editable = useCraftEditable();

  function updateSlide(index: number, patch: Partial<HeroSlideshowWidgetSlide>) {
    const next = props.slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setProp((p) => { p.slides = next; });
  }
  function addSlide() {
    const next = [...props.slides, { imageUrl: "https://placehold.co/1600x900?text=New+Slide", title: "", description: "" }];
    setProp((p) => { p.slides = next; });
  }
  function removeSlide(index: number) {
    const next = props.slides.filter((_, i) => i !== index);
    setProp((p) => { p.slides = next; });
  }
  async function uploadSlideImage(index: number, file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFile(file, "post-images", "craft-hero-slideshow");
    if (!error && url) updateSlide(index, { imageUrl: url });
  }

  function addWallpaper(file: File | null) {
    if (!file) return;
    uploadFile(file, "post-images", "craft-hero-slideshow-wallpaper").then(({ url, error }) => {
      if (error || !url) return;
      const next = [...props.wallpaperUrls, url].slice(0, 10);
      setProp((p) => { p.wallpaperUrls = next; });
    });
  }
  function removeWallpaper(index: number) {
    const next = props.wallpaperUrls.filter((_, i) => i !== index);
    setProp((p) => { p.wallpaperUrls = next; });
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-blue-200 bg-blue-50 p-2">
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={props.syncWithSiteSettings}
            onChange={(e) => setProp((p) => { p.syncWithSiteSettings = e.target.checked; })}
          />
          관리자 &quot;홈페이지 설정 관리&quot;의 슬라이드쇼와 연동
        </label>
        {props.syncWithSiteSettings && (
          <>
            <label className="mt-2 block text-xs text-gray-600">
              기준 기기
              <select
                value={props.syncDevice}
                onChange={(e) => setProp((p) => { p.syncDevice = e.target.value as HeroSlideshowWidgetProps["syncDevice"]; })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              >
                <option value="pc">PC 설정</option>
                <option value="mobile">모바일 설정</option>
              </select>
            </label>
            <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
              슬라이드/여백/이미지는 이 화면이 아니라{" "}
              <Link href="/admin/navigation/settings" target="_blank" className="underline">
                홈페이지 설정 관리
              </Link>
              에서 수정하세요 — 거기서 바꾸면 이 위젯이 박힌 모든 페이지에 자동으로 반영됩니다.
            </p>
          </>
        )}
      </div>

      {!props.syncWithSiteSettings && (
        <>
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
          <label className="block text-xs text-gray-600">
            섹션 높이(vh, 비우면 자동)
            <input
              type="number"
              min={10}
              max={100}
              value={props.heightVh ?? ""}
              placeholder="자동(모바일 60 / PC 70)"
              onChange={(e) => setProp((p) => { p.heightVh = e.target.value === "" ? null : Math.max(10, Math.min(100, Number(e.target.value) || 60)); })}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </label>
          <label className="block text-xs text-gray-600">
            이미지 채움 방식
            <select
              value={props.objectFit}
              onChange={(e) => setProp((p) => { p.objectFit = e.target.value as HeroSlideshowWidgetProps["objectFit"]; })}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="cover">채우기(cover)</option>
              <option value="contain">맞추기(contain, 여백 배경 사용 가능)</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-gray-600">
              위 여백(px)
              <input
                type="number"
                min={0}
                value={props.marginTopPx}
                onChange={(e) => setProp((p) => { p.marginTopPx = Number(e.target.value) || 0; })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs text-gray-600">
              아래 여백(px)
              <input
                type="number"
                min={0}
                value={props.marginBottomPx}
                onChange={(e) => setProp((p) => { p.marginBottomPx = Number(e.target.value) || 0; })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs text-gray-600">
              왼쪽 여백(px)
              <input
                type="number"
                min={0}
                value={props.marginLeftPx}
                onChange={(e) => setProp((p) => { p.marginLeftPx = Number(e.target.value) || 0; })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs text-gray-600">
              오른쪽 여백(px)
              <input
                type="number"
                min={0}
                value={props.marginRightPx}
                onChange={(e) => setProp((p) => { p.marginRightPx = Number(e.target.value) || 0; })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
          </div>

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
                    value={slide.title}
                    placeholder="제목"
                    onChange={(e) => updateSlide(i, { title: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={slide.description}
                    placeholder="설명"
                    onChange={(e) => updateSlide(i, { description: e.target.value })}
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

          {props.objectFit === "contain" && (
            <div className="border-t border-gray-200 pt-3">
              <h4 className="mb-2 text-xs font-semibold text-gray-500">여백 배경 이미지 ({props.wallpaperUrls.length}/10)</h4>
              <div className="space-y-1.5">
                {props.wallpaperUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-8 w-8 flex-shrink-0 rounded object-cover" />
                    <span className="flex-1 truncate text-[10px] text-gray-400">{url}</span>
                    <button type="button" onClick={() => removeWallpaper(i)} className="text-[10px] text-red-500 hover:underline">
                      삭제
                    </button>
                  </div>
                ))}
              </div>
              {props.wallpaperUrls.length < 10 && (
                <label className="mt-2 block w-full rounded border border-dashed border-gray-300 py-1.5 text-center text-xs text-gray-500 hover:border-gray-400">
                  + 여백 배경 추가
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => addWallpaper(e.target.files?.[0] ?? null)}
                    className="hidden"
                    disabled={!editable}
                  />
                </label>
              )}
            </div>
          )}
        </>
      )}

      <MotionSettingsSection />
    </div>
  );
}

HeroSlideshowWidgetBlock.craft = {
  displayName: "HeroSlideshowWidgetBlock",
  props: {
    syncWithSiteSettings: false,
    syncDevice: "pc",
    slides: [
      { imageUrl: "https://placehold.co/1600x900?text=Hero+Slide", title: "", description: "" },
    ],
    autoAdvanceSeconds: 5,
    objectFit: "cover",
    wallpaperUrls: [],
    marginTopPx: 0,
    marginBottomPx: 0,
    marginLeftPx: 0,
    marginRightPx: 0,
    heightVh: null,
    motion: DEFAULT_MOTION,
  } satisfies HeroSlideshowWidgetProps,
  related: { settings: HeroSlideshowWidgetSettings },
};
