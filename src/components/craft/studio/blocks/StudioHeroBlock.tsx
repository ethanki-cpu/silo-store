"use client";

// EPIC-099(항목 3, Phase 2): 스튜디오 전용 히어로 — ShopHeroBlock/DocentHeroBlock과
// 같은 좌측 정렬 태그+타이틀+CTA 레이아웃, 톤만 공간/촬영 대관에 맞춤(사용자
// 지시: "페이지별 전용 블록 새로 제작").
//
// 사용자 지시(2026-08-30 — "모든 craft의 hero 요소에 똑같은 슬라이드
// 기능 넣어줘"): 배경(정지 이미지 한 장 → 이미지/영상 슬라이드쇼)은
// shared/HeroSlides.tsx로 뽑아 모든 페이지 히어로 블록이 공유한다 —
// 자세한 배경은 그 파일 주석 참고.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { HeroSlidesBackground, HeroSlidesSettings, type HeroSlide } from "@/components/craft/shared/HeroSlides";

export type StudioHeroProps = {
  slides: HeroSlide[];
  autoAdvanceSeconds: number;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
};

export function StudioHeroBlock({
  slides,
  autoAdvanceSeconds,
  tag,
  title,
  subtitle,
  ctaText,
  ctaHref,
}: StudioHeroProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Studio Hero">
        <section className="relative h-[80vh] min-h-[480px] w-full overflow-hidden bg-gray-900">
          <HeroSlidesBackground slides={slides} autoAdvanceSeconds={autoAdvanceSeconds} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-center gap-4 px-8 text-white @[768px]:px-16">
            <EditableText
              as="span"
              value={tag}
              className="w-fit rounded-full border border-white/40 px-3 py-1 text-xs font-medium uppercase tracking-wide"
              onCommit={(next) => setProp((p) => (p.tag = next))}
            />
            <EditableText
              as="h1"
              value={title}
              className="font-serif text-4xl font-normal leading-tight @[768px]:text-5xl"
              onCommit={(next) => setProp((p) => (p.title = next))}
            />
            <EditableText
              as="span"
              value={subtitle}
              className="text-sm font-light text-white/80"
              onCommit={(next) => setProp((p) => (p.subtitle = next))}
            />
            <a
              href={ctaHref}
              className="mt-2 w-fit rounded-full bg-white px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-900 hover:bg-white/90"
            >
              <EditableText
                as="span"
                value={ctaText}
                onCommit={(next) => setProp((p) => (p.ctaText = next))}
              />
            </a>
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

StudioHeroBlock.craft = {
  displayName: "StudioHeroBlock",
  props: {
    slides: [
      { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80&auto=format" },
    ],
    autoAdvanceSeconds: 5,
    tag: "Space & Rental",
    title: "사일로의 공간을 빌려드립니다",
    subtitle: "촬영 대관부터 물품 대여, 공간 스타일링까지 — 필요한 만큼만 빌려 쓰세요.",
    ctaText: "공간 문의하기",
    ctaHref: "/studio/rental_1f_silostore",
  } satisfies StudioHeroProps,
  related: { settings: HeroSlidesSettings },
};
