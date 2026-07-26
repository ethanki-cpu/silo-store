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

type MainLogoValue = { type: "text" | "image"; text: string; imageUrl: string };
type SlideItem = { imageUrl: string; title: string; description: string };
type HeroSlideshowValue = { slides: SlideItem[] };
type HomeCurationValue = {
  domain: CategoryDomain;
  slugs: string[];
  sortBy: "latest" | "popular";
};

const DEFAULT_MAIN_LOGO: MainLogoValue = { type: "text", text: "", imageUrl: "" };
const DEFAULT_HERO_SLIDESHOW: HeroSlideshowValue = { slides: [] };
const DEFAULT_HOME_CURATION: HomeCurationValue = {
  domain: "shop",
  slugs: [],
  sortBy: "latest",
};

async function upsertSetting(key: string, value: unknown) {
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
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
      slides: [...prev.slides, { imageUrl: "", title: "", description: "" }],
    }));
  }

  function updateSlide(index: number, patch: Partial<SlideItem>) {
    setHeroSlideshow((prev) => ({
      slides: prev.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function removeSlide(index: number) {
    setHeroSlideshow((prev) => ({
      slides: prev.slides.filter((_, i) => i !== index),
    }));
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
                placeholder="https://..."
              />
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
                    placeholder="이미지 URL"
                    value={slide.imageUrl}
                    onChange={(e) =>
                      updateSlide(idx, { imageUrl: e.target.value })
                    }
                  />
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
