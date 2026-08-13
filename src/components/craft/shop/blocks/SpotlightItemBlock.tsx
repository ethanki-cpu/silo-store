"use client";

// EPIC-099(항목 3, Phase 2): "이 주의 물건" 스포트라이트 — 홈페이지의
// LatestIssueBlock(밝은 배경 비대칭 스플릿)과 달리 어두운 카드형 배경 위에
// 이미지+이야기+CTA를 얹어 "한 물건에 집중"하는 느낌을 낸다(사용자 지시:
// "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";

export type SpotlightItemProps = {
  eyebrow: string;
  title: string;
  story: string;
  priceLabel: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageUrlMobile?: string;
};

export function SpotlightItemBlock({
  eyebrow,
  title,
  story,
  priceLabel,
  ctaText,
  ctaHref,
  imageUrl,
  imageUrlMobile,
}: SpotlightItemProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Spotlight Item">
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

SpotlightItemBlock.craft = {
  displayName: "SpotlightItemBlock",
  props: {
    eyebrow: "이 주의 물건",
    title: "할머니의 자개 반짇고리",
    story: "1970년대, 첫 살림을 꾸리며 장만한 반짇고리입니다. 이제는 새로운 손길을 기다리고 있어요.",
    priceLabel: "입양 문의 환영",
    ctaText: "입양 신청하기",
    ctaHref: "/silo-store/treasures",
    imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80&auto=format",
  } satisfies SpotlightItemProps,
};
