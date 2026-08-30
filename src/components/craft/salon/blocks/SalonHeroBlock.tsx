"use client";

// EPIC-099(항목 3, Phase 2): 살롱데상 전용 히어로 — ShopHeroBlock/DocentHeroBlock/
// StudioHeroBlock과 같은 좌측 정렬 태그+타이틀+CTA 레이아웃, 톤만 커뮤니티/
// 모임에 맞춤(사용자 지시: "페이지별 전용 블록 새로 제작").
//
// 사용자 지시(2026-08-30 — "Salon hero 부분은 배경 이미지를 설정할수
// 없어. 슬라이드를 넣을수 있도록 해줘. 이미지와 영상도 가능해야해" →
// 후속 지시: "모든 craft의 hero 요소에 똑같은 슬라이드 기능 넣어줘"):
// 배경(정지 이미지 한 장 → 이미지/영상 슬라이드쇼)은 shared/HeroSlides.tsx로
// 뽑아 모든 페이지 히어로 블록이 공유한다 — 자세한 배경은 그 파일 주석 참고.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { HeroSlidesBackground, HeroSlidesSettings, type HeroSlide } from "@/components/craft/shared/HeroSlides";

export type SalonHeroProps = {
  slides: HeroSlide[];
  autoAdvanceSeconds: number;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
};

export function SalonHeroBlock({
  slides,
  autoAdvanceSeconds,
  tag,
  title,
  subtitle,
  ctaText,
  ctaHref,
}: SalonHeroProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Salon Hero">
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

SalonHeroBlock.craft = {
  displayName: "SalonHeroBlock",
  props: {
    slides: [
      { url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&q=80&auto=format" },
    ],
    autoAdvanceSeconds: 5,
    tag: "Salon des Cent",
    title: "이야기가 모이는 곳, 살롱데상",
    subtitle: "취향으로 만난 사람들이 매일 어딘가에서 모입니다.",
    ctaText: "커뮤니티 둘러보기",
    ctaHref: "/salon-des-cent/community",
  } satisfies SalonHeroProps,
  related: { settings: HeroSlidesSettings },
};
