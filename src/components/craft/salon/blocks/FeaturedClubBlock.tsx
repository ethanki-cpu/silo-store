"use client";

// EPIC-099(항목 3, Phase 2): "이달의 클럽" 스포트라이트 — SpotlightItemBlock/
// FeaturedEraBlock/FeaturedServiceBlock과 같은 어두운 카드형 레이아웃, 가격
// 대신 모임 요일/시간 안내를 담았다(사용자 지시: "페이지별 전용 블록 새로
// 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "@/components/craft/home/editable";

export type FeaturedClubProps = {
  eyebrow: string;
  title: string;
  story: string;
  scheduleLabel: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageUrlMobile?: string;
};

export function FeaturedClubBlock({
  eyebrow,
  title,
  story,
  scheduleLabel,
  ctaText,
  ctaHref,
  imageUrl,
  imageUrlMobile,
}: FeaturedClubProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Featured Club">
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
                value={scheduleLabel}
                className="text-sm font-medium text-white/90"
                onCommit={(next) => setProp((p) => (p.scheduleLabel = next))}
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

FeaturedClubBlock.craft = {
  displayName: "FeaturedClubBlock",
  props: {
    eyebrow: "이달의 클럽",
    title: "Tue 낭송 북클럽",
    story: "매주 화요일, 좋아하는 문장을 소리 내어 함께 읽는 모임입니다.",
    scheduleLabel: "매주 화요일 저녁",
    ctaText: "클럽 게시판 보기",
    ctaHref: "/salon-des-cent/community/daily-club/read-book-aloud",
    imageUrl: "https://images.unsplash.com/photo-1526243741027-444d633d7365?w=1200&q=80&auto=format",
  } satisfies FeaturedClubProps,
};
