"use client";

import { useEffect, useState } from "react";

type SlideItem = { imageUrl: string; title: string; description: string };

const DEFAULT_AUTO_ADVANCE_SECONDS = 5;

export function HeroSlideshow({
  slides,
  autoAdvanceSeconds = DEFAULT_AUTO_ADVANCE_SECONDS,
  objectFit = "cover",
  wallpaperUrl,
}: {
  slides: SlideItem[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
  // EPIC-036: objectFit="contain"일 때 이미지 좌우/상하 여백을 채우는 배경.
  wallpaperUrl?: string;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % slides.length);
    }, (autoAdvanceSeconds || DEFAULT_AUTO_ADVANCE_SECONDS) * 1000);
    return () => clearInterval(timer);
  }, [slides.length, autoAdvanceSeconds]);

  if (slides.length === 0) return null;

  const showWallpaper = objectFit === "contain" && !!wallpaperUrl;

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
                  backgroundImage: `url(${wallpaperUrl})`,
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
