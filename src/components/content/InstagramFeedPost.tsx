"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { InstagramFeedItem } from "@/lib/instagramFeed";

// EPIC-143(사용자 지시 — "인스타그램 본연의 UI(좋아요/댓글/로고)는 완전히
// 배제하라, CAROUSEL_ALBUM은 embla-carousel-react로 미니멀하고 부드러운
// 하이엔드 슬라이더로"): R2에 재호스팅된 미디어만 그린다 — Instagram
// iframe/embed.js는 전혀 쓰지 않는다. media_urls가 이미 R2 공개 URL이라
// 브라우저가 Instagram CDN에 직접 요청하지 않는다(원본 URL은 서버가 다운로드
// 시점에만 접근, 클라이언트에 노출되지 않음).
export function InstagramFeedPost({
  item,
  variant = "grid",
}: {
  item: InstagramFeedItem;
  /** "grid"(기본) — 피드 그리드 카드용, 정사각형으로 크롭. "embed" — 게시글
   * 본문에 삽입된 임베드용(NativeInstagramEmbed.tsx), 원본 비율을 살려
   * 크롭 없이 자연스러운 높이로 보여준다. */
  variant?: "grid" | "embed";
}) {
  const isCarousel = item.media_type === "CAROUSEL_ALBUM" && item.media_urls.length > 1;
  const isEmbed = variant === "embed";
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const mediaFit = isEmbed ? "object-contain" : "object-cover";

  // HOTFIX-147.10(사용자 신고 — "첫번째가 영상이어야 하는데 사진이다"):
  // "VIDEO_THUMBNAIL"은 Graph API가 실제 영상 파일(media_url)을 영구히
  // 안 줘서(instagramGraph.ts HOTFIX-147.10 주석 참고, 우리 쪽에서 복구
  // 불가능한 외부 API 한계) 정지 이미지(썸네일)로만 대체된 항목 — <video
  // src="...jpg">는 재생이 안 되니 대신 <img>를 그리되, 이게 원래 영상
  // 이었다는 걸 알 수 있도록 재생 버튼 아이콘을 얹는다(평범한 사진과
  // 구분 없이 보이던 문제를 최소한 시각적으로는 해결).
  function renderMedia(url: string, type: string, idx: number) {
    if (type === "VIDEO") {
      return (
        <video
          key={`${url}-${idx}`}
          className={`h-full w-full ${mediaFit}`}
          src={url}
          poster={item.thumbnail_url ?? undefined}
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }
    if (type === "VIDEO_THUMBNAIL") {
      return (
        <div key={`${url}-${idx}`} className="relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`h-full w-full ${mediaFit}`} src={url} alt="" loading="lazy" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white">
              <span className="ml-0.5 text-xl">▶</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={`${url}-${idx}`} className={`h-full w-full ${mediaFit}`} src={url} alt="" loading="lazy" />
    );
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg bg-gray-100 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md ${
        isEmbed ? "h-[420px]" : "aspect-square"
      }`}
    >
      {isCarousel ? (
        <>
          <div className="h-full w-full overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {item.media_urls.map((url, idx) => (
                <div className="relative h-full w-full shrink-0 grow-0 basis-full" key={`${url}-${idx}`}>
                  {renderMedia(url, item.media_item_types[idx] ?? "IMAGE", idx)}
                </div>
              ))}
            </div>
          </div>
          {/* 이 카드가 permalink <a>로 감싸일 수 있어(InstagramNativeFeed.tsx)
              화살표/점 클릭이 그대로 새 탭 이동으로 번지지 않게 항상 막는다. */}
          {canScrollPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                emblaApi?.scrollPrev();
              }}
              aria-label="이전 사진"
              className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 opacity-0 shadow transition-opacity group-hover:opacity-100"
            >
              ‹
            </button>
          )}
          {canScrollNext && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                emblaApi?.scrollNext();
              }}
              aria-label="다음 사진"
              className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 opacity-0 shadow transition-opacity group-hover:opacity-100"
            >
              ›
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {item.media_urls.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  idx === selectedIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 z-10 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
            {item.media_urls.length}장
          </span>
        </>
      ) : item.media_urls[0] ? (
        renderMedia(item.media_urls[0], item.media_item_types[0] ?? item.media_type, 0)
      ) : item.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-full w-full object-cover" src={item.thumbnail_url} alt="" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">이미지 없음</div>
      )}
    </div>
  );
}
