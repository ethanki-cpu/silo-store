"use client";

// EPIC-099(항목 3, Phase 2): 스튜디오 Craft 페이지의 Default State — 공개
// 렌더러/관리자 에디터가 이 하나를 공유한다. studioDefaultTree는 컴포넌트가
// 아니라 미리 만들어둔 순수 JSX 값(React element)이다 — 별도 래퍼 컴포넌트를
// 거치면 Craft가 그 래퍼 자체를 resolver에 없는 노드로 보고 깨지는 버그를
// 홈페이지 작업 때 겪었다(EPIC-098 CHANGELOG 참고) — 그래서 값으로 내보낸다.
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { StudioHeroBlock } from "./blocks/StudioHeroBlock";
import { ServiceGridBlock } from "./blocks/ServiceGridBlock";
import { FeaturedServiceBlock } from "./blocks/FeaturedServiceBlock";

// Text Directory는 범용 블록이라 컴포넌트는 홈페이지 것을 그대로 쓰지만,
// 기본값(스튜디오 하위 서비스)은 이 페이지 맥락에 맞게 채운다.
export const studioDirectoryProps = {
  heading: "더 알아보기",
  items: [
    { label: "공간 촬영 대관 (1F)", href: "/studio/rental_1f_silostore" },
    { label: "공간 촬영 대관 (2F)", href: "/studio/rental_2f_salon" },
    { label: "물품 대여", href: "/studio/items-rental" },
    { label: "공간 스타일링", href: "/studio/space-styling" },
  ],
};

export const studioDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    <StudioHeroBlock {...StudioHeroBlock.craft.props} />
    <ServiceGridBlock {...ServiceGridBlock.craft.props} />
    <FeaturedServiceBlock {...FeaturedServiceBlock.craft.props} />
    <TextDirectoryBlock {...studioDirectoryProps} />
    <NewsletterBlock {...NewsletterBlock.craft.props} />
    <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
  </Element>
);

export const studioBlockOptions = [
  { label: "Studio Hero", buildElement: () => <StudioHeroBlock {...StudioHeroBlock.craft.props} /> },
  { label: "Service Grid", buildElement: () => <ServiceGridBlock {...ServiceGridBlock.craft.props} /> },
  { label: "Featured Service", buildElement: () => <FeaturedServiceBlock {...FeaturedServiceBlock.craft.props} /> },
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...studioDirectoryProps} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
