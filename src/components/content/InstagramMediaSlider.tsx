"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import type { InstagramMediaItem } from "@/lib/instagramScraper";

// EPIC-133: 인스타그램 게시물 permalink 하나로 실제 미디어(이미지/영상/
// 캐러셀)만 뽑아 보여주는 미니멀 슬라이더 — 좋아요/댓글/로고 등 나머지
// Instagram UI는 애초에 서버가 넘겨주지 않으므로(instagramScraper.ts) 이
// 컴포넌트에는 렌더링할 것 자체가 없다. src/lib/instagramEmbed.ts의 공식
// blockquote+embed.js 위젯(X-Frame-Options로 자주 실패)을 대체하는 목적.
//
// 시각적으로는 기존 갤러리 캐러셀(globals.css .gallery-*, EPIC-079-PHASE-5)
// 클래스를 그대로 재사용해 플랫폼 톤을 맞춘다 — 저건 정적 HTML을
// galleryCarousel.ts가 후처리하는 방식이지만, 여긴 실제 React 컴포넌트라
// 같은 인터랙션(화살표/점/스와이프)을 React state로 직접 구현한다.
export function InstagramMediaSlider({ permalink }: { permalink: string }) {
  const { session, loading: authLoading } = useAuth();
  const [items, setItems] = useState<InstagramMediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    // HOTFIX: session 초기값은 항상 null이라(EPIC-079와 동일한 패턴),
    // AuthProvider의 세션 확인(authLoading)이 끝나기 전에 요청을 보내면
    // 로그인 상태여도 Authorization 헤더 없이 나가 /api/instagram-post가
    // 401(로그인 필요)을 돌려준다 — 실사용 테스트로 재현됨. authLoading이
    // 끝날 때까지 기다렸다가 한 번만 정확한 토큰으로 요청한다. (이 가드가
    // 실효를 가지려면 이 컴포넌트를 렌더링하는 트리에 실제
    // AuthContext.Provider 조상이 있어야 한다 — nativeInstagramEmbed.ts의
    // createRoot() 참고.)
    if (authLoading) return;

    let cancelled = false;
    setItems(null);
    setError(null);
    setActiveIndex(0);

    async function load() {
      try {
        const res = await fetch(`/api/instagram-post?url=${encodeURIComponent(permalink)}`, {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "미디어를 불러오지 못했어요.");
          return;
        }
        setItems(data.items ?? []);
      } catch {
        if (!cancelled) setError("미디어를 불러오지 못했어요.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [permalink, session, authLoading]);

  function scrollToIndex(i: number) {
    if (!items) return;
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function handleTrackScroll() {
    const track = trackRef.current;
    if (!track || !items) return;
    const trackRect = track.getBoundingClientRect();
    const center = trackRect.left + trackRect.width / 2;
    let closest = 0;
    let closestDist = Infinity;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const rect = slide.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }

  if (error) {
    return (
      <a
        href={permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-[#385185] no-underline"
      >
        Instagram에서 게시물 보기 ↗
      </a>
    );
  }

  if (!items) {
    return <div className="gallery-carousel"><div className="gallery-slide animate-pulse" /></div>;
  }

  return (
    <div className="gallery-carousel">
      <div className="gallery-track" ref={trackRef} onScroll={handleTrackScroll}>
        {items.map((item, i) => (
          <div className="gallery-slide" key={`${item.url}-${i}`} ref={(el) => { slideRefs.current[i] = el; }}>
            {item.type === "video" ? (
              <video
                className="gallery-media"
                src={`/api/proxy-ig?url=${encodeURIComponent(item.url)}`}
                controls
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="gallery-media"
                src={`/api/proxy-ig?url=${encodeURIComponent(item.url)}`}
                alt="Instagram 게시물 미디어"
              />
            )}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button
            type="button"
            className="gallery-prev"
            onClick={() => scrollToIndex(activeIndex - 1)}
            aria-label="이전 미디어"
          >
            ‹
          </button>
          <button
            type="button"
            className="gallery-next"
            onClick={() => scrollToIndex(activeIndex + 1)}
            aria-label="다음 미디어"
          >
            ›
          </button>
          <div className="gallery-dots">
            {items.map((item, i) => (
              <button
                key={`${item.url}-dot-${i}`}
                type="button"
                className={`gallery-dot${i === activeIndex ? " active" : ""}`}
                onClick={() => scrollToIndex(i)}
                aria-label={`${i + 1}번째 미디어로 이동`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
