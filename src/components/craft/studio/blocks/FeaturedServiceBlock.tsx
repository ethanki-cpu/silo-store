"use client";

// EPIC-099(항목 3, Phase 2): "이달의 서비스" 스포트라이트 — SpotlightItemBlock/
// FeaturedEraBlock과 같은 어두운 카드형 레이아웃, 가격 대신 대관/대여 안내
// 문구를 담았다(사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";

export type FeaturedServiceProps = {
  eyebrow: string;
  title: string;
  story: string;
  priceLabel: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageUrlMobile?: string;
};

export function FeaturedServiceBlock({
  eyebrow,
  title,
  story,
  priceLabel,
  ctaText,
  ctaHref,
  imageUrl,
  imageUrlMobile,
}: FeaturedServiceProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Featured Service">
        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-gray-900 text-white md:grid-cols-2">
            <EditableResponsiveImage
              srcDesktop={imageUrl}
              srcMobile={imageUrlMobile}
              alt={title}
              className="aspect-[4/3] w-full object-cover md:aspect-auto md:h-full"
              onCommitDesktop={(next) => setProp((p) => (p.imageUrl = next))}
              onCommitMobile={(next) => setProp((p) => (p.imageUrlMobile = next))}
            />
            <div className="flex flex-col justify-center gap-4 p-10">
              <EditableText
                as="span"
                value={eyebrow}
                className="text-xs font-medium uppercase tracking-[0.25em] text-white/60"
                onCommit={(next) => setProp((p) => (p.eyebrow = next))}
              />
              <EditableText
                as="h2"
                value={title}
                className="font-serif text-3xl font-normal"
                onCommit={(next) => setProp((p) => (p.title = next))}
              />
              <EditableText
                as="p"
                value={story}
                className="text-sm leading-relaxed text-white/70"
                onCommit={(next) => setProp((p) => (p.story = next))}
              />
              <EditableText
                as="span"
                value={priceLabel}
                className="text-sm font-medium text-white/90"
                onCommit={(next) => setProp((p) => (p.priceLabel = next))}
              />
              <a
                href={ctaHref}
                className="mt-2 w-fit rounded-full border border-white/40 px-5 py-2 text-xs font-medium uppercase tracking-wide hover:bg-white hover:text-gray-900"
              >
                <EditableText
                  as="span"
                  value={ctaText}
                  onCommit={(next) => setProp((p) => (p.ctaText = next))}
                />
              </a>
            </div>
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

FeaturedServiceBlock.craft = {
  displayName: "FeaturedServiceBlock",
  props: {
    eyebrow: "이달의 서비스",
    title: "공간 스타일링 Space Styling",
    story: "촬영이나 모임 목적에 맞춰 사일로 공간을 원하는 분위기로 꾸며드립니다.",
    priceLabel: "견적 문의 환영",
    ctaText: "스타일링 문의하기",
    ctaHref: "/studio/space-styling",
    imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&auto=format",
  } satisfies FeaturedServiceProps,
};
