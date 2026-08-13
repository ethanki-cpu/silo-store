// EPIC-098: Craft.js가 직렬화된 노드(craft_state)를 다시 실제 컴포넌트로
// 되찾을 때 쓰는 이름→컴포넌트 매핑. <Editor resolver={craftHomeResolver}>
// 하나를 공개 렌더러/관리자 에디터 둘 다 공유한다 — 새 블록을 추가할 땐
// 여기 한 줄만 더하면 된다.
import type { Resolver } from "@craftjs/core";
import { RootContainer } from "./RootContainer";
import { EditorialHeroBlock } from "./blocks/EditorialHeroBlock";
import { LatestIssueBlock } from "./blocks/LatestIssueBlock";
import { EditorialGridBlock } from "./blocks/EditorialGridBlock";
import { TextDirectoryBlock } from "./blocks/TextDirectoryBlock";
import { NewsletterBlock } from "./blocks/NewsletterBlock";
import { MinimalFooterBlock } from "./blocks/MinimalFooterBlock";

export const craftHomeResolver: Resolver = {
  RootContainer,
  EditorialHeroBlock,
  LatestIssueBlock,
  EditorialGridBlock,
  TextDirectoryBlock,
  NewsletterBlock,
  MinimalFooterBlock,
};
