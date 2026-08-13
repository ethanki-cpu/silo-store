"use client";

// EPIC-099(항목 3, Phase 2): "이달의 시대" 스포트라이트 — 사일로 상점의
// SpotlightItemBlock과 같은 어두운 카드형 레이아웃을 재사용하되, "가격"
// 대신 시대 구간 라벨을, "입양 신청" 대신 "시대 읽기 시작" CTA를 담았다
// (사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";

export type FeaturedEraProps = {
  eyebrow: string;
  title: string;
  story: string;
  periodLabel: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageUrlMobile?: string;
};

export function FeaturedEraBlock({
  eyebrow,
  title,
  story,
  periodLabel,
  ctaText,
  ctaHref,
  imageUrl,
  imageUrlMobile,
}: FeaturedEraProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Featured Era">
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
                value={periodLabel}
                className="text-sm font-medium text-white/90"
                onCommit={(next) => setProp((p) => (p.periodLabel = next))}
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

FeaturedEraBlock.craft = {
  displayName: "FeaturedEraBlock",
  props: {
    eyebrow: "이달의 시대",
    title: "1940~1960 비트 세대 Beat Generation",
    story: "전후의 상실감 속에서 자유와 즉흥을 노래한 세대의 이야기를 사일로가 골라 안내합니다.",
    periodLabel: "1940 ~ 1960",
    ctaText: "시대 읽기 시작",
    ctaHref: "/online-docent/freud-ai/beat-generation",
    imageUrl: "https://images.unsplash.com/photo-1499892477393-f675706cbe6e?w=1200&q=80&auto=format",
  } satisfies FeaturedEraProps,
};
