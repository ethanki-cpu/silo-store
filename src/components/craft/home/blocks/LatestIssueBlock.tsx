"use client";

// EPIC-098: 비대칭 스플릿 — 좌측은 광활한 여백 속에 짧은 카피 + CTA, 우측은
// 큰 이미지 하나. 매거진 "최신호 소개" 섹션의 구조(텍스트:이미지 = 1:1
// 컬럼이지만 좌측은 내용이 짧고 여백이 지배적)만 재현한다.
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "../editable";

export type LatestIssueProps = {
  label: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageUrlMobile?: string;
};

export function LatestIssueBlock({ label, heading, body, ctaText, ctaHref, imageUrl, imageUrlMobile }: LatestIssueProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Latest Issue">
        <section className="grid grid-cols-1 @[768px]:grid-cols-2">
          <div className="flex flex-col justify-center gap-6 px-10 py-24 @[768px]:px-16">
            <EditableText
              as="span"
              value={label}
              className="text-xs font-medium uppercase tracking-[0.25em] text-gray-400"
              onCommit={(next) => setProp((p) => (p.label = next))}
            />
            <EditableText
              as="h2"
              value={heading}
              className="font-serif text-3xl font-normal leading-snug text-gray-900 @[768px]:text-4xl"
              onCommit={(next) => setProp((p) => (p.heading = next))}
            />
            <EditableText
              as="p"
              value={body}
              className="max-w-sm text-sm leading-relaxed text-gray-500"
              onCommit={(next) => setProp((p) => (p.body = next))}
            />
            <a
              href={ctaHref}
              className="w-fit border-b border-gray-900 pb-1 text-xs font-medium uppercase tracking-wide text-gray-900"
            >
              <EditableText
                as="span"
                value={ctaText}
                onCommit={(next) => setProp((p) => (p.ctaText = next))}
              />
            </a>
          </div>
          <EditableResponsiveImage
            srcDesktop={imageUrl}
            srcMobile={imageUrlMobile}
            alt={heading}
            className="aspect-[4/5] w-full object-cover @[768px]:aspect-auto @[768px]:h-full"
            onCommitDesktop={(next) => setProp((p) => (p.imageUrl = next))}
            onCommitMobile={(next) => setProp((p) => (p.imageUrlMobile = next))}
          />
        </section>
      </EditableBlockFrame>
    </div>
  );
}

LatestIssueBlock.craft = {
  displayName: "LatestIssueBlock",
  props: {
    label: "이번 계절의 컬렉션",
    heading: "시간이 쌓인 물건들, 다시 이야기를 시작하다",
    body: "사일로가 새로 큐레이션한 빈티지 컬렉션을 만나보세요. 각 물건에는 이전 주인의 이야기가 함께 담겨 있습니다.",
    ctaText: "컬렉션 보러가기",
    ctaHref: "/shop",
    imageUrl: "https://images.unsplash.com/photo-1493552152660-f915ab47ae9d?w=1200&q=80&auto=format",
  } satisfies LatestIssueProps,
};
