"use client";

// EPIC-102: CraftHomeEditor.tsx를 다른 5개 페밀리와 동일한 공용 셸
// (CraftPageEditor)로 마이그레이션하면서, 그 전까지 CraftHomeRenderer.tsx/
// CraftHomeEditor.tsx 각자 안에 인라인으로 중복돼 있던 기본 트리를 다른
// 페밀리(shop 등)와 같은 패턴으로 이 파일 하나에 모은다. homeDefaultTree는
// 컴포넌트가 아니라 미리 만든 순수 JSX 값이다(별도 래퍼 컴포넌트를 거치면
// Craft가 깨지는 버그를 EPIC-098에서 직접 겪었다 — shop/defaultTree.tsx와
// 동일한 이유).
import { Element } from "@craftjs/core";
import { RootContainer } from "./RootContainer";
import { EditorialHeroBlock } from "./blocks/EditorialHeroBlock";
import { LatestIssueBlock } from "./blocks/LatestIssueBlock";
import { EditorialGridBlock } from "./blocks/EditorialGridBlock";
import { TextDirectoryBlock } from "./blocks/TextDirectoryBlock";
import { NewsletterBlock } from "./blocks/NewsletterBlock";
import { MinimalFooterBlock } from "./blocks/MinimalFooterBlock";

export const homeDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    <EditorialHeroBlock {...EditorialHeroBlock.craft.props} />
    <LatestIssueBlock {...LatestIssueBlock.craft.props} />
    <EditorialGridBlock {...EditorialGridBlock.craft.props} />
    <TextDirectoryBlock {...TextDirectoryBlock.craft.props} />
    <NewsletterBlock {...NewsletterBlock.craft.props} />
    <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
  </Element>
);

export const homeBlockOptions = [
  { label: "Hero", buildElement: () => <EditorialHeroBlock {...EditorialHeroBlock.craft.props} /> },
  { label: "Latest Issue", buildElement: () => <LatestIssueBlock {...LatestIssueBlock.craft.props} /> },
  { label: "Editorial Grid", buildElement: () => <EditorialGridBlock {...EditorialGridBlock.craft.props} /> },
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...TextDirectoryBlock.craft.props} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
