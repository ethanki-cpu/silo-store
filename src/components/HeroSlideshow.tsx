"use client";

import { useEffect, useState } from "react";

type SlideItem = { imageUrl: string; title: string; description: string };

const DEFAULT_AUTO_ADVANCE_SECONDS = 5;

// EPIC-094(요구사항 1.2): page.tsx가 PC/모바일용으로 이 컴포넌트를 각각
// 한 번씩(hidden md:block / md:hidden 래퍼로) 렌더링한다. 래퍼가 display:none
// 이어도 loading="eager"+fetchPriority="high"인 슬라이드 0번 이미지는 그
// 기기에서 보이지도 않을 원본 파일까지 그대로 내려받는 문제가 있었다(=CSS로
// "숨기기"만 할 뿐 실제로는 두 기기 이미지를 전부 받는 셈이라 "완전히 다른
// 파일을 렌더링"하라는 요구사항과 어긋남). <picture>의 <source media>가
// 매칭되면 그 media에서는 img 자신의 src 대신 source의 srcSet(여기서는
// 투명 1x1 픽셀)을 내려받으므로, "이 인스턴스가 담당하지 않는 기기"의
// media에서 실제 이미지 대신 투명 픽셀만 받도록 소스를 뒤집어 끼워 넣는다.
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7";

export function HeroSlideshow({
  device,
  slides,
  autoAdvanceSeconds = DEFAULT_AUTO_ADVANCE_SECONDS,
  objectFit = "cover",
  wallpaperUrls,
  marginTopPx = 0,
  marginBottomPx = 0,
  marginLeftPx = 0,
  marginRightPx = 0,
  heightVh = null,
}: {
  // EPIC-094(요구사항 1.2): 이 인스턴스가 어느 기기용 래퍼 안에 있는지 —
  // "반대쪽" 기기의 media query에서는 실제 이미지를 내려받지 않도록 픽처
  // 소스를 뒤집는 데만 쓰인다(레이아웃 자체는 여전히 부모의 hidden 클래스가 담당).
  // "both"는 기기 분기 자체가 없는 호출부(Page Builder의 단일 "hero" 모듈)용 —
  // 픽처 트릭을 아예 적용하지 않고 항상 실제 이미지를 그대로 내려준다(기존 동작 유지).
  device: "pc" | "mobile" | "both";
  slides: SlideItem[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
  // EPIC-036/039: objectFit="contain"일 때 이미지 좌우/상하 여백을 채우는
  // 배경 후보 목록(최대 10개) — 슬라이드가 바뀔 때마다 이 중 하나를
  // 무작위로 골라 적용한다.
  wallpaperUrls?: string[];
  // EPIC-092(요구사항 6): 위젯 바깥 여백(px) — "홈페이지 설정 관리"에서
  // 지정, 기본 0이면 기존과 동일하게 화면 끝까지 꽉 찬다.
  marginTopPx?: number;
  marginBottomPx?: number;
  marginLeftPx?: number;
  marginRightPx?: number;
  // EPIC-110: 슬라이드쇼 섹션 자체의 높이(vh) — null/미지정이면 기존
  // 기본값(모바일 60vh/데스크톱 70vh)을 그대로 쓴다.
  heightVh?: number | null;
}) {
  // md: Tailwind 기본 브레이크포인트(768px) — page.tsx의 hidden md:block/
  // md:hidden과 정확히 같은 경계여야 두 소스가 서로 어긋나지 않는다.
  const oppositeDeviceMediaQuery =
    device === "pc" ? "(max-width: 767px)" : device === "mobile" ? "(min-width: 768px)" : null;
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

  // EPIC-092 후속(사용자 피드백): 여백(margin)을 그냥 빈 공간으로 두면
  // "여백에도 여백 배경 이미지가 보여야 한다"는 요청과 어긋난다 — margin
  // 대신 바깥 박스에 padding을 주고, 그 바깥 박스 자체에 여백 배경
  // 이미지를 깔아 padding 영역(=예전의 margin 자리)까지 이어지는 배경으로
  // 보이게 한다. 안쪽(h-[60vh] 박스)은 기존과 동일하게 슬라이드/점 인디케이터를
  // 담당 — objectFit이 "contain"이 아니거나 여백 배경이 없으면(showWallpaper
  // false) 바깥 박스는 배경 없이 padding만 적용돼 기존처럼 빈 여백으로 보인다.
  return (
    <div
      className="relative w-full overflow-hidden bg-transparent"
      style={{
        paddingTop: marginTopPx,
        paddingBottom: marginBottomPx,
        paddingLeft: marginLeftPx,
        paddingRight: marginRightPx,
        ...(showWallpaper
          ? {
              backgroundImage: `url(${activeWallpaper})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined),
      }}
    >
      <div
        className={`relative w-full overflow-hidden ${heightVh == null ? "h-[60vh] sm:h-[70vh]" : ""}`}
        style={heightVh != null ? { height: `${heightVh}vh` } : undefined}
      >
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
            <picture>
              {oppositeDeviceMediaQuery && (
                <source media={oppositeDeviceMediaQuery} srcSet={TRANSPARENT_PIXEL} />
              )}
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
            </picture>
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
    </div>
  );
}
