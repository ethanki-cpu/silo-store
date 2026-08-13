"use client";

// EPIC-099(항목 3, Phase 2): 사일로 상점 전용 히어로 — 홈페이지의
// EditorialHeroBlock(순수 이미지+텍스트 오버레이)과 달리 소매 성격에 맞게
// 작은 태그 칩 + 좌측 정렬 타이틀 + CTA 버튼을 얹은 레이아웃으로 구조 자체를
// 다르게 만들었다(사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";

export type ShopHeroProps = {
  imageUrl: string;
  imageUrlMobile?: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
};

export function ShopHeroBlock({ imageUrl, imageUrlMobile, tag, title, subtitle, ctaText, ctaHref }: ShopHeroProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Shop Hero">
        <section className="relative h-[80vh] min-h-[480px] w-full overflow-hidden bg-gray-900">
          <EditableResponsiveImage
            srcDesktop={imageUrl}
            srcMobile={imageUrlMobile}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            onCommitDesktop={(next) => setProp((p) => (p.imageUrl = next))}
            onCommitMobile={(next) => setProp((p) => (p.imageUrlMobile = next))}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-center gap-4 px-8 text-white md:px-16">
            <EditableText
              as="span"
              value={tag}
              className="w-fit rounded-full border border-white/40 px-3 py-1 text-xs font-medium uppercase tracking-wide"
              onCommit={(next) => setProp((p) => (p.tag = next))}
            />
            <EditableText
              as="h1"
              value={title}
              className="font-serif text-4xl font-normal leading-tight md:text-5xl"
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

ShopHeroBlock.craft = {
  displayName: "ShopHeroBlock",
  props: {
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=1600&q=80&auto=format",
    tag: "Silo Store",
    title: "시간이 담긴 물건들의 집",
    subtitle: "한 사람의 이야기가 다음 사람에게로 건너가는 곳, 사일로 상점입니다.",
    ctaText: "보물 둘러보기",
    ctaHref: "/silo-store/treasures",
  } satisfies ShopHeroProps,
};
