"use client";

// EPIC-099(항목 3, Phase 2): 온라인 도슨트 전용 히어로 — 사일로 상점의
// ShopHeroBlock(좌측 정렬 + CTA 버튼)과 구조는 비슷하지만, 도슨트는 상품이
// 아니라 "시대를 안내한다"는 톤이라 태그를 시대 구간 라벨로, CTA를 시대
// 둘러보기로 바꿨다(사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";

export type DocentHeroProps = {
  imageUrl: string;
  imageUrlMobile?: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
};

export function DocentHeroBlock({ imageUrl, imageUrlMobile, tag, title, subtitle, ctaText, ctaHref }: DocentHeroProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Docent Hero">
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

DocentHeroBlock.craft = {
  displayName: "DocentHeroBlock",
  props: {
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1600&q=80&auto=format",
    tag: "BC 1100 ~ 현재",
    title: "시대를 거니는 안내, 온라인 도슨트",
    subtitle: "고대부터 오늘까지, 사일로가 골라 들려주는 시대별 이야기입니다.",
    ctaText: "시대 둘러보기",
    ctaHref: "/online-docent/ancient-monarchy",
  } satisfies DocentHeroProps,
};
