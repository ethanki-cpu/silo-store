"use client";

import { useEffect, useState } from "react";

// EPIC-053.1: Gallery/이미지 공용 Lightbox — 에디터 미리보기와 실제
// 게시글 상세(PostBody) 양쪽에서 재사용한다(새 컴포넌트를 화면마다 따로
// 만들지 않음). 슬라이드(이전/다음), 확대(클릭 시 배율 토글), ESC/배경
// 클릭으로 닫기를 지원한다.
export type LightboxImage = { src: string; alt?: string; caption?: string };

export function Lightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [images.length, onClose]);

  if (images.length === 0) return null;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 text-white text-2xl leading-none hover:opacity-70"
      >
        &times;
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(false);
            setIndex((i) => (i - 1 + images.length) % images.length);
          }}
          aria-label="이전"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl px-3 py-2 hover:opacity-70"
        >
          &#8249;
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.src}
        alt={current.alt ?? ""}
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
        className={`max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-200 cursor-zoom-in ${
          zoomed ? "scale-150 cursor-zoom-out" : ""
        }`}
      />

      {current.caption && (
        <p className="text-white/80 text-sm mt-3 max-w-[80vw] text-center" onClick={(e) => e.stopPropagation()}>
          {current.caption}
        </p>
      )}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
              setIndex((i) => (i + 1) % images.length);
            }}
            aria-label="다음"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl px-3 py-2 hover:opacity-70"
          >
            &#8250;
          </button>
          <p className="text-white/60 text-xs mt-2">
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </div>
  );
}
