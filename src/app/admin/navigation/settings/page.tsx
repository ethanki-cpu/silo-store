"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  DOMAIN_OPTIONS,
  inputClass,
  primaryButtonClass,
  smallButtonClass,
  type CategoryDomain,
} from "../shared";

// EPIC-026: "홈페이지 설정 관리" 실 구현. site_settings(key-value, EPIC-026)의
// 3개 키(main_logo/hero_slideshow/home_curation)를 조회/저장한다. 다른 CMS
// 페이지들과 동일하게 별도 API Route 없이 브라우저에서 anon key + RLS
// (admin bypass)로 직접 CUD한다.
//
// EPIC-033: 이미지 URL 텍스트 입력 옆에 파일 업로드를 추가 — 선택 시
// Supabase Storage("public-assets" 버킷)에 즉시 업로드하고 반환된 public
// URL을 그대로 URL 입력값으로 채운다(URL 직접 입력도 계속 fallback으로
// 남겨둠). 로고 높이(px)/슬라이드 자동 전환 시간(초)/이미지 채움 방식도
// 이번 EPIC에서 추가 — Navbar.tsx/HeroSlideshow.tsx가 이 값을 읽어 적용한다.
//
// EPIC-034: main_logo에 정렬 위치(align)/로고 옆 추가 텍스트(extraText)/
// 텍스트 서체·굵기·크기(fontFamily/bold/fontSizePx)를 추가. 기존 필드와
// 마찬가지로 site_settings.setting_value(jsonb) 안에 병합해서 저장한다.
//
// EPIC-034-Ext: align(로고 자체의 헤더 내 정렬)과는 별개로, "추가 텍스트가
// 로고의 좌/우 어느 쪽에 붙는지"를 정하는 textPosition을 추가. 서체는
// EPIC-034의 자유 입력 fontFamily를 대체하지 않고, 미리 정의된 커스텀
// 폰트(Graphire/Primor) 중 선택하는 textCustomFont로 보완 — "기본"이면
// 기존 fontFamily 자유 입력값을 그대로 쓰고, Graphire/Primor를 고르면
// 그 폰트명이 우선 적용된다(globals.css의 @font-face 뼈대 참고).
//
// EPIC-036: main_logo에 추가 텍스트 색상(textColor)을 추가 — 기본값은
// Navbar.tsx 사이드바에 쓰이는 짙은 녹색(Tailwind green-800, #166534)과
// 맞춰둔다. hero_slideshow에는 슬라이드가 objectFit="contain"일 때 생기는
// 여백을 채울 배경 이미지(wallpaperUrl)를 추가 — 로고/슬라이드 이미지와
// 동일한 uploadImage()/public-assets 버킷 업로드 로직을 재사용한다.

type LogoAlign = "left" | "center" | "right";
type TextPosition = "left" | "right";
type CustomFont = "default" | "Graphire" | "Primor";

type MainLogoValue = {
  type: "text" | "image";
  text: string;
  imageUrl: string;
  heightPx: number;
  align: LogoAlign;
  extraText: string;
  fontFamily: string;
  bold: boolean;
  fontSizePx: number;
  textPosition: TextPosition;
  textCustomFont: CustomFont;
  textColor: string;
};
type SlideItem = { imageUrl: string; title: string; description: string };
type HeroSlideshowValue = {
  slides: SlideItem[];
  autoAdvanceSeconds: number;
  objectFit: "cover" | "contain";
  wallpaperUrl: string;
};
type HomeCurationValue = {
  domain: CategoryDomain;
  slugs: string[];
  sortBy: "latest" | "popular";
};

const DEFAULT_MAIN_LOGO: MainLogoValue = {
  type: "text",
  text: "",
  imageUrl: "",
  heightPx: 64,
  align: "left",
  extraText: "",
  fontFamily: "",
  bold: false,
  fontSizePx: 16,
  textPosition: "right",
  textCustomFont: "default",
  textColor: "#166534",
};
const DEFAULT_HERO_SLIDESHOW: HeroSlideshowValue = {
  slides: [],
  autoAdvanceSeconds: 5,
  objectFit: "cover",
  wallpaperUrl: "",
};
const DEFAULT_HOME_CURATION: HomeCurationValue = {
  domain: "shop",
  slugs: [],
  sortBy: "latest",
};

const STORAGE_BUCKET = "public-assets";

async function upsertSetting(key: string, value: unknown) {
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
}

async function uploadImage(
  file: File,
  folder: string,
): Promise<{ url: string | null; error: string | null }> {
  const path = `${folder}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file);

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export default function AdminNavigationSettingsPage() {
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const [mainLogo, setMainLogo] = useState<MainLogoValue>(DEFAULT_MAIN_LOGO);
  const [heroSlideshow, setHeroSlideshow] = useState<HeroSlideshowValue>(
    DEFAULT_HERO_SLIDESHOW,
  );
  const [homeCuration, setHomeCuration] = useState<HomeCurationValue>(
    DEFAULT_HOME_CURATION,
  );

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(
    null,
  );
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["main_logo", "hero_slideshow", "home_curation"]);

      if (fetchError) {
        setError(fetchError.message);
        setFetching(false);
        return;
      }

      for (const row of data ?? []) {
        if (row.setting_key === "main_logo") {
          setMainLogo({ ...DEFAULT_MAIN_LOGO, ...(row.setting_value as object) });
        } else if (row.setting_key === "hero_slideshow") {
          setHeroSlideshow({
            ...DEFAULT_HERO_SLIDESHOW,
            ...(row.setting_value as object),
          });
        } else if (row.setting_key === "home_curation") {
          setHomeCuration({
            ...DEFAULT_HOME_CURATION,
            ...(row.setting_value as object),
          });
        }
      }
      setFetching(false);
    }

    load();
  }, []);

  async function handleSave(key: string, value: unknown) {
    setError(null);
    setSavedKey(null);
    const { error: saveError } = await upsertSetting(key, value);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSavedKey(key);
  }

  function addSlide() {
    setHeroSlideshow((prev) => ({
      ...prev,
      slides: [...prev.slides, { imageUrl: "", title: "", description: "" }],
    }));
  }

  function updateSlide(index: number, patch: Partial<SlideItem>) {
    setHeroSlideshow((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function removeSlide(index: number) {
    setHeroSlideshow((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
    }));
  }

  async function handleLogoFileChange(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    const { url, error: uploadError } = await uploadImage(file, "main_logo");
    setUploadingLogo(false);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    setMainLogo((prev) => ({ ...prev, type: "image", imageUrl: url }));
  }

  async function handleSlideFileChange(index: number, file: File | null) {
    if (!file) return;
    setUploadingSlideIdx(index);
    setError(null);
    const { url, error: uploadError } = await uploadImage(file, "slides");
    setUploadingSlideIdx(null);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    updateSlide(index, { imageUrl: url });
  }

  async function handleWallpaperFileChange(file: File | null) {
    if (!file) return;
    setUploadingWallpaper(true);
    setError(null);
    const { url, error: uploadError } = await uploadImage(file, "wallpaper");
    setUploadingWallpaper(false);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    setHeroSlideshow((prev) => ({ ...prev, wallpaperUrl: url }));
  }

  if (fetching) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* 메인 로고 */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">메인 로고</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-sm mb-1">텍스트 로고</label>
              <input
                className={inputClass}
                value={mainLogo.text}
                onChange={(e) =>
                  setMainLogo({ ...mainLogo, type: "text", text: e.target.value })
                }
                placeholder="예: 사일로 스토어"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">이미지 로고 URL (선택)</label>
              <input
                className={inputClass}
                value={mainLogo.imageUrl}
                onChange={(e) =>
                  setMainLogo({ ...mainLogo, type: "image", imageUrl: e.target.value })
                }
                placeholder="https://... (또는 아래에서 파일 직접 업로드)"
              />
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo}
                onChange={(e) =>
                  handleLogoFileChange(e.target.files?.[0] ?? null)
                }
                className="mt-2 text-sm"
              />
              {uploadingLogo && (
                <p className="text-xs text-gray-400 mt-1">업로드 중...</p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">로고 높이 (px)</label>
              <input
                type="number"
                min={16}
                max={200}
                className={`${inputClass} w-28`}
                value={mainLogo.heightPx}
                onChange={(e) =>
                  setMainLogo({
                    ...mainLogo,
                    heightPx: Number(e.target.value) || DEFAULT_MAIN_LOGO.heightPx,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">로고 정렬 위치</label>
              <select
                className={inputClass}
                value={mainLogo.align}
                onChange={(e) =>
                  setMainLogo({
                    ...mainLogo,
                    align: e.target.value as LogoAlign,
                  })
                }
              >
                <option value="left">좌측</option>
                <option value="center">중앙</option>
                <option value="right">우측</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">로고 옆 추가 텍스트 (선택)</label>
              <input
                className={inputClass}
                value={mainLogo.extraText}
                onChange={(e) =>
                  setMainLogo({ ...mainLogo, extraText: e.target.value })
                }
                placeholder="예: since 2024"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">추가 텍스트 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={mainLogo.textColor || DEFAULT_MAIN_LOGO.textColor}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, textColor: e.target.value })
                  }
                  className="h-9 w-12 rounded border border-gray-300 p-1"
                />
                <input
                  className={`${inputClass} w-32`}
                  value={mainLogo.textColor}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, textColor: e.target.value })
                  }
                  placeholder={DEFAULT_MAIN_LOGO.textColor}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">텍스트 위치</label>
                <select
                  className={inputClass}
                  value={mainLogo.textPosition}
                  onChange={(e) =>
                    setMainLogo({
                      ...mainLogo,
                      textPosition: e.target.value as TextPosition,
                    })
                  }
                >
                  <option value="left">로고 좌측</option>
                  <option value="right">로고 우측</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">텍스트 폰트</label>
                <select
                  className={inputClass}
                  value={mainLogo.textCustomFont}
                  onChange={(e) =>
                    setMainLogo({
                      ...mainLogo,
                      textCustomFont: e.target.value as CustomFont,
                    })
                  }
                >
                  <option value="default">기본 (아래 서체 입력값 사용)</option>
                  <option value="Graphire">Graphire</option>
                  <option value="Primor">Primor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">텍스트 서체 (직접 입력)</label>
                <input
                  className={inputClass}
                  value={mainLogo.fontFamily}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, fontFamily: e.target.value })
                  }
                  placeholder="예: 'Pretendard', sans-serif"
                  disabled={mainLogo.textCustomFont !== "default"}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">텍스트 크기 (px)</label>
                <input
                  type="number"
                  min={8}
                  max={64}
                  className={inputClass}
                  value={mainLogo.fontSizePx}
                  onChange={(e) =>
                    setMainLogo({
                      ...mainLogo,
                      fontSizePx:
                        Number(e.target.value) || DEFAULT_MAIN_LOGO.fontSizePx,
                    })
                  }
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={mainLogo.bold}
                    onChange={(e) =>
                      setMainLogo({ ...mainLogo, bold: e.target.checked })
                    }
                  />
                  굵게 (Bold)
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSave("main_logo", mainLogo)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "main_logo" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>

        {/* 슬라이드쇼 */}
        <section className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">슬라이드쇼</h2>
            <button type="button" onClick={addSlide} className={smallButtonClass}>
              + 슬라이드 추가
            </button>
          </div>

          {heroSlideshow.slides.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">
              아직 추가된 슬라이드가 없어요.
            </p>
          ) : (
            <div className="space-y-3 mb-3">
              {heroSlideshow.slides.map((slide, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-gray-200 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      슬라이드 #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                  <input
                    className={inputClass}
                    placeholder="이미지 URL (또는 아래에서 파일 직접 업로드)"
                    value={slide.imageUrl}
                    onChange={(e) =>
                      updateSlide(idx, { imageUrl: e.target.value })
                    }
                  />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingSlideIdx === idx}
                    onChange={(e) =>
                      handleSlideFileChange(idx, e.target.files?.[0] ?? null)
                    }
                    className="text-sm"
                  />
                  {uploadingSlideIdx === idx && (
                    <p className="text-xs text-gray-400">업로드 중...</p>
                  )}
                  <input
                    className={inputClass}
                    placeholder="타이틀"
                    value={slide.title}
                    onChange={(e) => updateSlide(idx, { title: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="설명"
                    value={slide.description}
                    onChange={(e) =>
                      updateSlide(idx, { description: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm mb-1">자동 전환 시간 (초)</label>
              <input
                type="number"
                min={1}
                max={60}
                className={inputClass}
                value={heroSlideshow.autoAdvanceSeconds}
                onChange={(e) =>
                  setHeroSlideshow((prev) => ({
                    ...prev,
                    autoAdvanceSeconds:
                      Number(e.target.value) ||
                      DEFAULT_HERO_SLIDESHOW.autoAdvanceSeconds,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">이미지 채움 방식</label>
              <select
                className={inputClass}
                value={heroSlideshow.objectFit}
                onChange={(e) =>
                  setHeroSlideshow((prev) => ({
                    ...prev,
                    objectFit: e.target.value as "cover" | "contain",
                  }))
                }
              >
                <option value="cover">꽉 차게 (cover)</option>
                <option value="contain">원본 모두 보이게 (contain)</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-1">
              여백 배경 이미지 (Wallpaper) — 이미지 채움 방식이
              &quot;contain&quot;일 때 생기는 여백을 채워요
            </label>
            <input
              className={inputClass}
              placeholder="이미지 URL (또는 아래에서 파일 직접 업로드)"
              value={heroSlideshow.wallpaperUrl}
              onChange={(e) =>
                setHeroSlideshow((prev) => ({
                  ...prev,
                  wallpaperUrl: e.target.value,
                }))
              }
            />
            <input
              type="file"
              accept="image/*"
              disabled={uploadingWallpaper}
              onChange={(e) =>
                handleWallpaperFileChange(e.target.files?.[0] ?? null)
              }
              className="mt-2 text-sm"
            />
            {uploadingWallpaper && (
              <p className="text-xs text-gray-400 mt-1">업로드 중...</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave("hero_slideshow", heroSlideshow)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "hero_slideshow" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>

        {/* 노출 필터 */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">노출 필터 (홈 큐레이션)</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-sm mb-1">대상 도메인</label>
              <select
                className={inputClass}
                value={homeCuration.domain}
                onChange={(e) =>
                  setHomeCuration({
                    ...homeCuration,
                    domain: e.target.value as CategoryDomain,
                  })
                }
              >
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">
                노출할 카테고리 slug (쉼표로 구분, 비우면 전체)
              </label>
              <input
                className={inputClass}
                value={homeCuration.slugs.join(", ")}
                onChange={(e) =>
                  setHomeCuration({
                    ...homeCuration,
                    slugs: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="예: renaissance, baroque"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">정렬 기준</label>
              <select
                className={inputClass}
                value={homeCuration.sortBy}
                onChange={(e) =>
                  setHomeCuration({
                    ...homeCuration,
                    sortBy: e.target.value as "latest" | "popular",
                  })
                }
              >
                <option value="latest">최신순</option>
                <option value="popular">인기순</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSave("home_curation", homeCuration)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "home_curation" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
