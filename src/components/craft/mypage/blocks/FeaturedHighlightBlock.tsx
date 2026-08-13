"use client";

// EPIC-099(항목 3, Phase 2): "나의 하이라이트" 스포트라이트 —
// SpotlightItemBlock 계열과 같은 어두운 카드형 레이아웃, 가격 대신 최근
// 활동/기록 안내 문구를 담았다(사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";

export type FeaturedHighlightProps = {
  eyebrow: string;
  title: string;
  story: string;
  metaLabel: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageUrlMobile?: string;
};

export function FeaturedHighlightBlock({
  eyebrow,
  title,
  story,
  metaLabel,
  ctaText,
  ctaHref,
  imageUrl,
  imageUrlMobile,
}: FeaturedHighlightProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Featured Highlight">
        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-gray-900 text-white @[768px]:grid-cols-2">
            <EditableResponsiveImage
              srcDesktop={imageUrl}
              srcMobile={imageUrlMobile}
              alt={title}
              className="aspect-[4/3] w-full object-cover @[768px]:aspect-auto @[768px]:h-full"
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
                value={metaLabel}
                className="text-sm font-medium text-white/90"
                onCommit={(next) => setProp((p) => (p.metaLabel = next))}
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

FeaturedHighlightBlock.craft = {
  displayName: "FeaturedHighlightBlock",
  props: {
    eyebrow: "나의 하이라이트",
    title: "나의 마음일기",
    story: "매일의 감정과 생각을 짧게 남겨두는 공간입니다. 지나간 나를 다시 만나보세요.",
    metaLabel: "My Story",
    ctaText: "마음일기 보러가기",
    ctaHref: "/mypage/my-story/my-mind-diary",
    imageUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&q=80&auto=format",
  } satisfies FeaturedHighlightProps,
};
