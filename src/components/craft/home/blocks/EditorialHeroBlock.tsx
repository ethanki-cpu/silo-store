"use client";

// EPIC-098: 풀블리드 히어로 — 화면을 가득 채우는 이미지 위에 아주 작고
// 트래킹이 넓은 세리프 캡션+타이틀이 얹히는 매거진 커버 레이아웃. 킨포크
// 실제 사진/문구는 쓰지 않고 구조(전면 이미지, 좌하단 소형 텍스트 오버레이,
// 그라디언트로 가독성 확보)만 재현한다.
import { useNode } from "@craftjs/core";
import { EditableText, EditableResponsiveImage, EditableBlockFrame } from "../editable";

export type EditorialHeroProps = {
  imageUrl: string;
  imageUrlMobile?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function EditorialHeroBlock({ imageUrl, imageUrlMobile, eyebrow, title, subtitle }: EditorialHeroProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Hero">
        <section className="relative h-[92vh] min-h-[560px] w-full overflow-hidden bg-gray-900">
          <EditableResponsiveImage
            srcDesktop={imageUrl}
            srcMobile={imageUrlMobile}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            onCommitDesktop={(next) => setProp((p) => (p.imageUrl = next))}
            onCommitMobile={(next) => setProp((p) => (p.imageUrlMobile = next))}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-16 text-center text-white">
            <EditableText
              as="span"
              value={eyebrow}
              className="text-xs font-medium uppercase tracking-[0.3em] text-white/80"
              onCommit={(next) => setProp((p) => (p.eyebrow = next))}
            />
            <EditableText
              as="h1"
              value={title}
              className="font-serif text-4xl font-normal tracking-wide md:text-6xl"
              onCommit={(next) => setProp((p) => (p.title = next))}
            />
            <EditableText
              as="span"
              value={subtitle}
              className="max-w-md text-sm font-light text-white/80"
              onCommit={(next) => setProp((p) => (p.subtitle = next))}
            />
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

EditorialHeroBlock.craft = {
  displayName: "EditorialHeroBlock",
  props: {
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80&auto=format",
    eyebrow: "Silo Store — Issue No. 01",
    title: "물건이 아니라 이야기를 팝니다",
    subtitle: "취향과 사람이 오가는 멤버십 커뮤니티, 사일로 스토어",
  } satisfies EditorialHeroProps,
};
