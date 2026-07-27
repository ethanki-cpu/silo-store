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
//
// EPIC-039: main_logo의 단일 extraText+textPosition을 leftText/rightText로
// 분리 — 로고 이미지를 중앙에 두고 양옆에 대칭으로 텍스트를 배치하기 위함.
// align(로고 정렬 위치)은 이 대칭 레이아웃과 함께 쓰기엔 의미가 겹쳐 UI에서
// 제거했고(중앙 고정), 기존 데이터 호환을 위해 타입/기본값에는 남겨둔다.
// 기존에 extraText+textPosition으로 저장돼 있던 값은 로드 시 1회 자동으로
// leftText 또는 rightText로 옮겨준다(아래 load() 참고).
// hero_slideshow.wallpaperUrl(단일 문자열)은 wallpaperUrls(문자열 배열,
// 최대 10개)로 교체 — HeroSlideshow.tsx가 매 슬라이드 전환마다 이 배열
// 중 하나를 무작위로 골라 배경으로 쓴다. 기존 단일 값은 로드 시 배열의
// 첫 항목으로 자동 이전된다.
// 새 site_settings 키 "sidebar_icons"(leftIconUrl/rightIconUrl) 추가 —
// Navbar의 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘 이미지.
//
// EPIC-041: main_logo에 커스텀 폰트 파일 업로드(fontFileUrl, .woff/.ttf 등)
// 추가 — Navbar.tsx가 이 URL이 있으면 @font-face를 동적으로 주입해 좌/우
// 텍스트에 최우선으로 적용한다(textCustomFont/fontFamily보다 우선).
// sidebar_icons에 아이콘 크기(iconSizePx) 추가 — 기본값은 기존 하드코딩
// 크기였던 32px(w-8 h-8)와 맞춘다.
// home_curation을 단일 설정에서 "블록" 배열(HomeCurationBlock[])로
// 고도화 — 섹션 제목(title)을 추가하고, 여러 큐레이션 섹션을 추가/삭제/
// 순서 변경(위/아래)할 수 있게 했다. 구버전 단일 객체 데이터는 로드 시
// 블록 1개짜리 배열로 자동 이전한다.
//
// EPIC-041-042-HOTFIX: fontFileUrl/sidebar_icons(leftIconUrl/rightIconUrl)는
// 파일 업로드(input type="file" + Storage 업로드) 대신 URL을 직접 붙여넣는
// 텍스트 입력으로 되돌렸다 — 가장 단순하고 확실한 방식을 우선한다. 로고
// 이미지/슬라이드/Wallpaper 이미지는 계속 파일 업로드를 쓴다(대상 아님).
//
// EPIC-043: 실제로 동작하지 않던(폰트 파일이 없는) "텍스트 폰트"
// select(textCustomFont: Graphire/Primor)를 완전히 삭제. 단일 fontFileUrl도
// customFonts(배열, 각 항목에 url+isActive)로 교체 — 여러 폰트를 등록해두고
// 필요한 것만 켜고 끌 수 있다. Navbar.tsx는 isActive인 항목들을 순서대로
// @font-face 주입 + font-family fallback 체인으로 연결한다(먼저 켜진
// 폰트가 우선). 구버전 단일 fontFileUrl은 로드 시 1개짜리 배열로 이전.

type LogoAlign = "left" | "center" | "right";
type TextPosition = "left" | "right";

type CustomFontEntry = {
  id: string;
  url: string;
  isActive: boolean;
};

type MainLogoValue = {
  type: "text" | "image";
  text: string;
  imageUrl: string;
  heightPx: number;
  align: LogoAlign;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용으로만 읽는다. */
  extraText: string;
  fontFamily: string;
  bold: boolean;
  fontSizePx: number;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용으로만 읽는다. */
  textPosition: TextPosition;
  textColor: string;
  leftText: string;
  rightText: string;
  /** @deprecated EPIC-043: customFonts(배열)로 대체. 구버전 데이터 호환용으로만 읽는다. */
  fontFileUrl: string;
  customFonts: CustomFontEntry[];
};
type SlideItem = { imageUrl: string; title: string; description: string };
type HeroSlideshowValue = {
  slides: SlideItem[];
  autoAdvanceSeconds: number;
  objectFit: "cover" | "contain";
  /** @deprecated EPIC-039: wallpaperUrls(배열)로 대체. 구버전 데이터 호환용으로만 읽는다. */
  wallpaperUrl: string;
  wallpaperUrls: string[];
};
type HomeCurationBlock = {
  id: string;
  title: string;
  domain: CategoryDomain;
  slugs: string[];
  sortBy: "latest" | "popular";
};
type HomeCurationSettingValue = {
  blocks: HomeCurationBlock[];
};
type SidebarIconsValue = {
  leftIconUrl: string;
  rightIconUrl: string;
  iconSizePx: number;
};

const MAX_WALLPAPERS = 10;
const DEFAULT_ICON_SIZE_PX = 32;

function makeDefaultCustomFont(): CustomFontEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: "",
    isActive: true,
  };
}

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
  textColor: "#166534",
  leftText: "",
  rightText: "",
  fontFileUrl: "",
  customFonts: [],
};
const DEFAULT_HERO_SLIDESHOW: HeroSlideshowValue = {
  slides: [],
  autoAdvanceSeconds: 5,
  objectFit: "cover",
  wallpaperUrl: "",
  wallpaperUrls: [],
};
function makeDefaultCurationBlock(): HomeCurationBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    domain: "shop",
    slugs: [],
    sortBy: "latest",
  };
}
const DEFAULT_HOME_CURATION: HomeCurationSettingValue = {
  blocks: [],
};
const DEFAULT_SIDEBAR_ICONS: SidebarIconsValue = {
  leftIconUrl: "",
  rightIconUrl: "",
  iconSizePx: DEFAULT_ICON_SIZE_PX,
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
  const [homeCuration, setHomeCuration] = useState<HomeCurationSettingValue>(
    DEFAULT_HOME_CURATION,
  );
  const [sidebarIcons, setSidebarIcons] = useState<SidebarIconsValue>(
    DEFAULT_SIDEBAR_ICONS,
  );

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(
    null,
  );
  const [uploadingWallpaperIdx, setUploadingWallpaperIdx] = useState<
    number | null
  >(null);

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "main_logo",
          "hero_slideshow",
          "home_curation",
          "sidebar_icons",
        ]);

      if (fetchError) {
        setError(fetchError.message);
        setFetching(false);
        return;
      }

      for (const row of data ?? []) {
        if (row.setting_key === "main_logo") {
          const value = {
            ...DEFAULT_MAIN_LOGO,
            ...(row.setting_value as Partial<MainLogoValue>),
          };
          // EPIC-039: 구버전 extraText+textPosition을 leftText/rightText로 1회 이전.
          if (!value.leftText && !value.rightText && value.extraText) {
            if (value.textPosition === "left") {
              value.leftText = value.extraText;
            } else {
              value.rightText = value.extraText;
            }
          }
          // EPIC-043: 구버전 단일 fontFileUrl을 customFonts 배열로 1회 이전.
          if (value.customFonts.length === 0 && value.fontFileUrl) {
            value.customFonts = [
              { id: "legacy", url: value.fontFileUrl, isActive: true },
            ];
          }
          setMainLogo(value);
        } else if (row.setting_key === "hero_slideshow") {
          const value = {
            ...DEFAULT_HERO_SLIDESHOW,
            ...(row.setting_value as Partial<HeroSlideshowValue>),
          };
          // EPIC-039: 구버전 단일 wallpaperUrl을 wallpaperUrls 배열로 1회 이전.
          if (value.wallpaperUrls.length === 0 && value.wallpaperUrl) {
            value.wallpaperUrls = [value.wallpaperUrl];
          }
          setHeroSlideshow(value);
        } else if (row.setting_key === "home_curation") {
          const raw = row.setting_value as
            | Partial<HomeCurationSettingValue>
            | (Partial<HomeCurationBlock> & { blocks?: undefined })
            | null;
          // EPIC-041: 구버전은 { domain, slugs, sortBy } 단일 객체였다 —
          // blocks 배열이 없고 domain 필드가 있으면 그 값을 블록 1개로 이전.
          if (raw && !raw.blocks && "domain" in raw) {
            const legacy = raw as Partial<HomeCurationBlock>;
            setHomeCuration({
              blocks: [
                {
                  ...makeDefaultCurationBlock(),
                  title: "홈 큐레이션",
                  domain: legacy.domain ?? "shop",
                  slugs: legacy.slugs ?? [],
                  sortBy: legacy.sortBy ?? "latest",
                },
              ],
            });
          } else {
            setHomeCuration({
              blocks: raw?.blocks ?? [],
            });
          }
        } else if (row.setting_key === "sidebar_icons") {
          setSidebarIcons({
            ...DEFAULT_SIDEBAR_ICONS,
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

  function addWallpaper() {
    setHeroSlideshow((prev) => {
      if (prev.wallpaperUrls.length >= MAX_WALLPAPERS) return prev;
      return { ...prev, wallpaperUrls: [...prev.wallpaperUrls, ""] };
    });
  }

  function updateWallpaper(index: number, url: string) {
    setHeroSlideshow((prev) => ({
      ...prev,
      wallpaperUrls: prev.wallpaperUrls.map((u, i) => (i === index ? url : u)),
    }));
  }

  function removeWallpaper(index: number) {
    setHeroSlideshow((prev) => ({
      ...prev,
      wallpaperUrls: prev.wallpaperUrls.filter((_, i) => i !== index),
    }));
  }

  async function handleWallpaperFileChange(index: number, file: File | null) {
    if (!file) return;
    setUploadingWallpaperIdx(index);
    setError(null);
    const { url, error: uploadError } = await uploadImage(file, "wallpaper");
    setUploadingWallpaperIdx(null);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    updateWallpaper(index, url);
  }

  function addCustomFont() {
    setMainLogo((prev) => ({
      ...prev,
      customFonts: [...prev.customFonts, makeDefaultCustomFont()],
    }));
  }

  function updateCustomFont(id: string, patch: Partial<CustomFontEntry>) {
    setMainLogo((prev) => ({
      ...prev,
      customFonts: prev.customFonts.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    }));
  }

  function removeCustomFont(id: string) {
    setMainLogo((prev) => ({
      ...prev,
      customFonts: prev.customFonts.filter((f) => f.id !== id),
    }));
  }

  function addCurationBlock() {
    setHomeCuration((prev) => ({
      blocks: [...prev.blocks, makeDefaultCurationBlock()],
    }));
  }

  function updateCurationBlock(id: string, patch: Partial<HomeCurationBlock>) {
    setHomeCuration((prev) => ({
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }

  function removeCurationBlock(id: string) {
    setHomeCuration((prev) => ({
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  }

  function moveCurationBlock(id: string, direction: "up" | "down") {
    setHomeCuration((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || targetIdx < 0 || targetIdx >= prev.blocks.length) {
        return prev;
      }
      const blocks = [...prev.blocks];
      [blocks[idx], blocks[targetIdx]] = [blocks[targetIdx], blocks[idx]];
      return { blocks };
    });
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
            {/* EPIC-039: 로고 이미지를 중앙에 두고 양옆에 대칭으로 텍스트를
                배치하는 레이아웃으로 바뀌어, 기존 "정렬 위치"(좌/중앙/우)는
                이 레이아웃과 함께 쓰기 어려워 UI에서 제거했다(항상 중앙). */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">로고 좌측 텍스트 (선택)</label>
                <input
                  className={inputClass}
                  value={mainLogo.leftText}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, leftText: e.target.value })
                  }
                  placeholder="예: since 2024"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">로고 우측 텍스트 (선택)</label>
                <input
                  className={inputClass}
                  value={mainLogo.rightText}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, rightText: e.target.value })
                  }
                  placeholder="예: Retrouvailles"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">좌/우 텍스트 색상</label>
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">
                  커스텀 폰트 파일 (.woff, .woff2, .ttf 등, 여러 개 등록 가능)
                </label>
                <button
                  type="button"
                  onClick={addCustomFont}
                  className={smallButtonClass}
                >
                  + 폰트 추가
                </button>
              </div>
              {mainLogo.customFonts.length === 0 ? (
                <p className="text-sm text-gray-400">
                  아직 추가된 폰트가 없어요.
                </p>
              ) : (
                <div className="space-y-2">
                  {mainLogo.customFonts.map((font) => (
                    <div key={font.id} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={font.url}
                        onChange={(e) =>
                          updateCustomFont(font.id, { url: e.target.value })
                        }
                        placeholder="https://... (Supabase Storage에 올린 폰트 파일의 공개 URL)"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
                        <input
                          type="checkbox"
                          checked={font.isActive}
                          onChange={(e) =>
                            updateCustomFont(font.id, {
                              isActive: e.target.checked,
                            })
                          }
                        />
                        적용
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCustomFont(font.id)}
                        className="text-xs text-red-600 hover:underline shrink-0"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                &quot;적용&quot;이 켜진 폰트만 실제로 주입되고, 아래 텍스트
                서체 입력값보다 우선 적용돼요. 여러 개를 켜두면 목록 순서대로
                폴백 체인으로 연결돼요.
              </p>
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm">
                여백 배경 이미지 (Wallpaper, 최대 {MAX_WALLPAPERS}개) — 이미지
                채움 방식이 &quot;contain&quot;일 때 생기는 여백을, 슬라이드가
                바뀔 때마다 이 중 하나를 무작위로 골라 채워요
              </label>
              <button
                type="button"
                onClick={addWallpaper}
                disabled={heroSlideshow.wallpaperUrls.length >= MAX_WALLPAPERS}
                className={smallButtonClass}
              >
                + 추가
              </button>
            </div>
            {heroSlideshow.wallpaperUrls.length === 0 ? (
              <p className="text-sm text-gray-400">
                아직 추가된 배경 이미지가 없어요.
              </p>
            ) : (
              <div className="space-y-2">
                {heroSlideshow.wallpaperUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      placeholder="이미지 URL (또는 파일 직접 업로드)"
                      value={url}
                      onChange={(e) => updateWallpaper(idx, e.target.value)}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingWallpaperIdx === idx}
                      onChange={(e) =>
                        handleWallpaperFileChange(
                          idx,
                          e.target.files?.[0] ?? null,
                        )
                      }
                      className="text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeWallpaper(idx)}
                      className="text-xs text-red-600 hover:underline shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                ))}
                {uploadingWallpaperIdx !== null && (
                  <p className="text-xs text-gray-400">업로드 중...</p>
                )}
              </div>
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

        {/* EPIC-039: 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘.
            비어 있으면 Navbar.tsx가 기존 🔑/🚪 이모지로 대체한다. */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">사이드바 아이콘</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">
                좌측 사이드바 아이콘 URL (사일로상점)
              </label>
              {sidebarIcons.leftIconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sidebarIcons.leftIconUrl}
                  alt="좌측 사이드바 아이콘"
                  className="w-8 h-8 mb-2 object-contain"
                />
              )}
              <input
                className={inputClass}
                value={sidebarIcons.leftIconUrl}
                onChange={(e) =>
                  setSidebarIcons({ ...sidebarIcons, leftIconUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                우측 사이드바 아이콘 URL (살롱데상)
              </label>
              {sidebarIcons.rightIconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sidebarIcons.rightIconUrl}
                  alt="우측 사이드바 아이콘"
                  className="w-8 h-8 mb-2 object-contain"
                />
              )}
              <input
                className={inputClass}
                value={sidebarIcons.rightIconUrl}
                onChange={(e) =>
                  setSidebarIcons({ ...sidebarIcons, rightIconUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">아이콘 크기 (px)</label>
            <input
              type="number"
              min={16}
              max={96}
              className={`${inputClass} w-28`}
              value={sidebarIcons.iconSizePx}
              onChange={(e) =>
                setSidebarIcons({
                  ...sidebarIcons,
                  iconSizePx: Number(e.target.value) || DEFAULT_ICON_SIZE_PX,
                })
              }
            />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSave("sidebar_icons", sidebarIcons)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "sidebar_icons" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>

        {/* EPIC-041: 노출 필터(홈 큐레이션) — 단일 필터에서 여러 개의
            "큐레이션 블록"(섹션 제목 + 필터 기준 + 타겟 값)을 추가/삭제/
            순서 변경할 수 있는 동적 배열 폼으로 확장. 저장된 순서 그대로
            page.tsx가 <HomeCurationSlider>를 렌더링한다. */}
        <section className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">노출 필터 (홈 큐레이션)</h2>
            <button
              type="button"
              onClick={addCurationBlock}
              className={smallButtonClass}
            >
              + 큐레이션 블록 추가
            </button>
          </div>

          {homeCuration.blocks.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">
              아직 추가된 큐레이션 블록이 없어요.
            </p>
          ) : (
            <div className="space-y-3 mb-3">
              {homeCuration.blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="rounded-md border border-gray-200 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      블록 #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveCurationBlock(block.id, "up")}
                        disabled={idx === 0}
                        className="text-xs text-gray-500 hover:underline disabled:opacity-30"
                      >
                        위로
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCurationBlock(block.id, "down")}
                        disabled={idx === homeCuration.blocks.length - 1}
                        className="text-xs text-gray-500 hover:underline disabled:opacity-30"
                      >
                        아래로
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCurationBlock(block.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <input
                    className={inputClass}
                    placeholder="섹션 제목 (예: 이번 주 신상 보물)"
                    value={block.title}
                    onChange={(e) =>
                      updateCurationBlock(block.id, { title: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm mb-1">
                        필터 기준 (대상 도메인)
                      </label>
                      <select
                        className={inputClass}
                        value={block.domain}
                        onChange={(e) =>
                          updateCurationBlock(block.id, {
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
                      <label className="block text-sm mb-1">정렬 기준</label>
                      <select
                        className={inputClass}
                        value={block.sortBy}
                        onChange={(e) =>
                          updateCurationBlock(block.id, {
                            sortBy: e.target.value as "latest" | "popular",
                          })
                        }
                      >
                        <option value="latest">최신순</option>
                        <option value="popular">인기순</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">
                      타겟 값 — 카테고리/태그 slug (쉼표로 구분, 비우면 전체)
                    </label>
                    <input
                      className={inputClass}
                      value={block.slugs.join(", ")}
                      onChange={(e) =>
                        updateCurationBlock(block.id, {
                          slugs: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="예: renaissance, baroque"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
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
