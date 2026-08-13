"use client";

// EPIC-099(항목 3, Phase 2): 살롱데상 Craft 페이지의 Default State — 공개
// 렌더러/관리자 에디터가 이 하나를 공유한다. salonDefaultTree는 컴포넌트가
// 아니라 미리 만들어둔 순수 JSX 값(React element)이다 — 별도 래퍼 컴포넌트를
// 거치면 Craft가 그 래퍼 자체를 resolver에 없는 노드로 보고 깨지는 버그를
// 홈페이지 작업 때 겪었다(EPIC-098 CHANGELOG 참고) — 그래서 값으로 내보낸다.
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { SalonHeroBlock } from "./blocks/SalonHeroBlock";
import { GroupGridBlock } from "./blocks/GroupGridBlock";
import { FeaturedClubBlock } from "./blocks/FeaturedClubBlock";

// Text Directory는 범용 블록이라 컴포넌트는 홈페이지 것을 그대로 쓰지만,
// 기본값(살롱데상 하위 그룹)은 이 페이지 맥락에 맞게 채운다.
export const salonDirectoryProps = {
  heading: "더 알아보기",
  items: [
    { label: "요일별 클럽 모임", href: "/salon-des-cent/community/daily-club" },
    { label: "갤러리", href: "/salon-des-cent/community/gallery" },
    { label: "아카이브", href: "/salon-des-cent/community/archives" },
    { label: "멤버십", href: "/salon-des-cent/community/membership" },
  ],
};

export const salonDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    <SalonHeroBlock {...SalonHeroBlock.craft.props} />
    <GroupGridBlock {...GroupGridBlock.craft.props} />
    <FeaturedClubBlock {...FeaturedClubBlock.craft.props} />
    <TextDirectoryBlock {...salonDirectoryProps} />
    <NewsletterBlock {...NewsletterBlock.craft.props} />
    <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
  </Element>
);

export const salonBlockOptions = [
  { label: "Salon Hero", buildElement: () => <SalonHeroBlock {...SalonHeroBlock.craft.props} /> },
  { label: "Group Grid", buildElement: () => <GroupGridBlock {...GroupGridBlock.craft.props} /> },
  { label: "Featured Club", buildElement: () => <FeaturedClubBlock {...FeaturedClubBlock.craft.props} /> },
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...salonDirectoryProps} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
