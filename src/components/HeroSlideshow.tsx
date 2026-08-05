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
  // 버그 수정(EPIC-079-FINAL-FIX): 첫 로드 시 이미지가 아직 안 뜬 짧은
  // 순간(~0.5초) wrapper의 배경색(bg-gray-900, 사실상 검정)이 그대로
  // 보였다 — 이미지별로 실제 로드가 끝났는지 추적해, 로드 전엔 투명하게
  // 숨겨뒀다가 로드되는 순간 부드럽게 페이드인시킨다(검정 대신 흰 여백이
  // 아주 잠깐 보이는 쪽이 훨씬 자연스럽다 — wrapper 배경도 함께 투명화).
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set());
  function markLoaded(idx: number) {
    setLoadedIndices((prev) => (prev.has(idx) ? prev : new Set(prev).add(idx)));
  }

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
    <div className="relative w-full h-[60vh] sm:h-[70vh] overflow-hidden bg-transparent">
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
              // 첫 슬라이드(idx 0)는 화면에 즉시 노출되는 LCP 후보라 최우선
              // 로딩시키고, 나머지는 필요할 때까지 미룬다.
              loading={idx === 0 ? "eager" : "lazy"}
              fetchPriority={idx === 0 ? "high" : undefined}
              // 버그 수정: 브라우저 캐시에 이미 있는 이미지는 React가 onLoad
              // 리스너를 붙이기 전에 이미 로드가 끝나있어 onLoad가 아예 안
              // 뜨는 경우가 있다(그러면 opacity-0에 영원히 갇힘) — DOM에
              // 붙는 시점(callback ref)에 이미 .complete면 즉시 처리한다.
              ref={(node) => {
                if (node?.complete) markLoaded(idx);
              }}
              onLoad={() => markLoaded(idx)}
              className={`w-full h-full transition-opacity duration-500 ${
                loadedIndices.has(idx) ? "opacity-100" : "opacity-0"
              } ${objectFit === "contain" ? "object-contain" : "object-cover"}`}
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
