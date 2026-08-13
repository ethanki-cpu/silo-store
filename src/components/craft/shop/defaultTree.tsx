"use client";

// EPIC-099(항목 3, Phase 2): 사일로 상점 Craft 페이지의 Default State — 공개
// 렌더러/관리자 에디터가 이 하나를 공유한다(EPIC-098 홈페이지와 동일한
// "동일 트리를 두 곳에서 공유" 원칙). shopDefaultTree는 컴포넌트가 아니라
// 미리 만들어둔 순수 JSX 값(React element)이다 — Frame의 children으로
// 넘길 때 별도 래퍼 컴포넌트(예: `<ShopDefaultTree/>`)를 거치면 Craft가
// 그 래퍼 자체를 resolver에 없는 노드로 보고 깨지는 버그를 홈페이지 작업
// 때 직접 겪었다(EPIC-098 CHANGELOG 참고) — 그래서 여기서도 함수/컴포넌트가
// 아니라 값으로 내보낸다.
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { ShopHeroBlock } from "./blocks/ShopHeroBlock";
import { TreasureGridBlock } from "./blocks/TreasureGridBlock";
import { SpotlightItemBlock } from "./blocks/SpotlightItemBlock";

// Text Directory는 범용 블록이라 컴포넌트는 홈페이지 것을 그대로 쓰지만,
// 기본값(카테고리 목록)은 사일로 상점 맥락에 맞게 이 페이지 전용으로 채운다.
export const shopDirectoryProps = {
  heading: "더 알아보기",
  items: [
    { label: "사일로 유산 Heritage", href: "/silo-store/heritage" },
    { label: "할머니 Grandmas", href: "/silo-store/heritage/grandmas" },
    { label: "할아버지 Grandpas", href: "/silo-store/heritage/grandpas" },
    { label: "보물 목록", href: "/silo-store/treasures/collections" },
  ],
};

export const shopDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    <ShopHeroBlock {...ShopHeroBlock.craft.props} />
    <TreasureGridBlock {...TreasureGridBlock.craft.props} />
    <SpotlightItemBlock {...SpotlightItemBlock.craft.props} />
    <TextDirectoryBlock {...shopDirectoryProps} />
    <NewsletterBlock {...NewsletterBlock.craft.props} />
    <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
  </Element>
);

export const shopBlockOptions = [
  { label: "Shop Hero", buildElement: () => <ShopHeroBlock {...ShopHeroBlock.craft.props} /> },
  { label: "Treasure Grid", buildElement: () => <TreasureGridBlock {...TreasureGridBlock.craft.props} /> },
  { label: "Spotlight Item", buildElement: () => <SpotlightItemBlock {...SpotlightItemBlock.craft.props} /> },
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...shopDirectoryProps} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
