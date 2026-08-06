"use client";

// EPIC-079-PHASE-5: 갤러리(GalleryBlock)의 좌우 스와이프 자체는 순수 CSS
// scroll-snap(globals.css)만으로 이미 동작한다 — 이 모듈은 화살표 버튼
// 클릭으로 한 슬라이드씩 이동하는 것과, 현재 보이는 슬라이드에 맞춰 하단
// 점(dot) 인디케이터를 활성화하는 것만 보강한다(dangerouslySetInnerHTML로
// 넣은 정적 마크업은 그 자체로는 아무 동작도 하지 않으므로 —
// rawHtmlEmbed.ts/instagramEmbed.ts와 동일한 이유).
export function processGalleryCarousels(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".gallery-carousel").forEach((carousel) => {
    if (carousel.dataset.carouselInit === "true") return;
    carousel.dataset.carouselInit = "true";

    const track = carousel.querySelector<HTMLElement>(".gallery-track");
    if (!track) return;
    const slides = Array.from(track.querySelectorAll<HTMLElement>(".gallery-slide"));
    const dots = Array.from(carousel.querySelectorAll<HTMLElement>(".gallery-dot"));
    const prevBtn = carousel.querySelector<HTMLButtonElement>(".gallery-prev");
    const nextBtn = carousel.querySelector<HTMLButtonElement>(".gallery-next");
    if (slides.length === 0) return;

    function scrollToIndex(i: number) {
      const clamped = Math.max(0, Math.min(i, slides.length - 1));
      slides[clamped].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }

    function currentIndex(): number {
      const trackRect = track!.getBoundingClientRect();
      const center = trackRect.left + trackRect.width / 2;
      let closest = 0;
      let closestDist = Infinity;
      slides.forEach((slide, i) => {
        const rect = slide.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      return closest;
    }

    prevBtn?.addEventListener("click", () => scrollToIndex(currentIndex() - 1));
    nextBtn?.addEventListener("click", () => scrollToIndex(currentIndex() + 1));
    dots.forEach((dot, i) => dot.addEventListener("click", () => scrollToIndex(i)));

    let raf = 0;
    track.addEventListener("scroll", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const active = currentIndex();
        dots.forEach((dot, i) => dot.classList.toggle("active", i === active));
      });
    });
  });
}
