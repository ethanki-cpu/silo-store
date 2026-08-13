"use client";

// EPIC-099(항목 3, Phase 2): 마이 페이지 Craft 페이지의 Default State — 공개
// 렌더러/관리자 에디터가 이 하나를 공유한다. mypageDefaultTree는 컴포넌트가
// 아니라 미리 만들어둔 순수 JSX 값(React element)이다 — 별도 래퍼 컴포넌트를
// 거치면 Craft가 그 래퍼 자체를 resolver에 없는 노드로 보고 깨지는 버그를
// 홈페이지 작업 때 겪었다(EPIC-098 CHANGELOG 참고) — 그래서 값으로 내보낸다.
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { MypageHeroBlock } from "./blocks/MypageHeroBlock";
import { MypageGridBlock } from "./blocks/MypageGridBlock";
import { FeaturedHighlightBlock } from "./blocks/FeaturedHighlightBlock";

// Text Directory는 범용 블록이라 컴포넌트는 홈페이지 것을 그대로 쓰지만,
// 기본값(마이 페이지 하위 그룹)은 이 페이지 맥락에 맞게 채운다.
export const mypageDirectoryProps = {
  heading: "더 알아보기",
  items: [
    { label: "My Treasures", href: "/mypage/my-collections/mytreasures" },
    { label: "My Writings", href: "/mypage/my-silo-timeline/my-writings" },
    { label: "My Exhibition", href: "/mypage/my-story/my-exhibition" },
    { label: "My Wishlist", href: "/mypage/my-story/wishlist" },
  ],
};

export const mypageDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    <MypageHeroBlock {...MypageHeroBlock.craft.props} />
    <MypageGridBlock {...MypageGridBlock.craft.props} />
    <FeaturedHighlightBlock {...FeaturedHighlightBlock.craft.props} />
    <TextDirectoryBlock {...mypageDirectoryProps} />
    <NewsletterBlock {...NewsletterBlock.craft.props} />
    <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
  </Element>
);

export const mypageBlockOptions = [
  { label: "Mypage Hero", buildElement: () => <MypageHeroBlock {...MypageHeroBlock.craft.props} /> },
  { label: "Mypage Grid", buildElement: () => <MypageGridBlock {...MypageGridBlock.craft.props} /> },
  { label: "Featured Highlight", buildElement: () => <FeaturedHighlightBlock {...FeaturedHighlightBlock.craft.props} /> },
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...mypageDirectoryProps} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
