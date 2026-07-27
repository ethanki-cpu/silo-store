"use client";

import { useEffect, useState } from "react";

type SlideItem = { imageUrl: string; title: string; description: string };

const DEFAULT_AUTO_ADVANCE_SECONDS = 5;

export function HeroSlideshow({
  slides,
  autoAdvanceSeconds = DEFAULT_AUTO_ADVANCE_SECONDS,
  objectFit = "cover",
  wallpaperUrls,
}: {
  slides: SlideItem[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
  // EPIC-036/039: objectFit="contain"일 때 이미지 좌우/상하 여백을 채우는
  // 배경 후보 목록(최대 10개) — 슬라이드가 바뀔 때마다 이 중 하나를
  // 무작위로 골라 적용한다.
  wallpaperUrls?: string[];
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % slides.length);
    }, (autoAdvanceSeconds || DEFAULT_AUTO_ADVANCE_SECONDS) * 1000);
    return () => clearInterval(timer);
  }, [slides.length, autoAdvanceSeconds]);

  // EPIC-039: `current`가 바뀔 때(= 슬라이드 전환 시)마다 한 번만 다시 뽑는다.
  // Math.random()은 순수하지 않아 렌더 중(useMemo 포함)에는 호출할 수 없으므로
  // (react-hooks/purity) 이펙트 안에서 뽑아 state에 담는다. 모든 슬라이드가
  // 같은 배경을 공유해야 크로스페이드 전환 중에 배경이 서로 어긋나 보이지 않는다.
  const [activeWallpaper, setActiveWallpaper] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!wallpaperUrls || wallpaperUrls.length === 0) {
      setActiveWallpaper(undefined);
      return;
    }
    setActiveWallpaper(
      wallpaperUrls[Math.floor(Math.random() * wallpaperUrls.length)],
    );
  }, [current, wallpaperUrls]);

  if (slides.length === 0) return null;

  const showWallpaper = objectFit === "contain" && !!activeWallpaper;

  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh] overflow-hidden bg-gray-900">
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-700 ${
            idx === current ? "opacity-100" : "opacity-0"
          }`}
          style={
            showWallpaper
              ? {
                  backgroundImage: `url(${activeWallpaper})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {slide.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.imageUrl}
              alt={slide.title || "사일로 스토어"}
              className={`w-full h-full ${
                objectFit === "contain" ? "object-contain" : "object-cover"
              }`}
            />
          )}
          {(slide.title || slide.description) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 bg-black/30">
              {slide.title && (
                <p className="text-white text-3xl font-bold mb-3">
                  {slide.title}
                </p>
              )}
              {slide.description && (
                <p className="text-white/90 max-w-xl">{slide.description}</p>
              )}
            </div>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`슬라이드 ${idx + 1}로 이동`}
              onClick={() => setCurrent(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === current ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
