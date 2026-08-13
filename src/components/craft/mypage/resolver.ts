// EPIC-099(항목 3, Phase 2): 마이 페이지의 Craft resolver. 이 페이지 전용
// 블록(MypageHero/MypageGrid/FeaturedHighlight)은 새로 만들고, 페이지 성격과
// 무관한 범용 블록(Text Directory/Newsletter/Footer)은 홈페이지 것을 그대로
// 재사용한다(중복 생성 금지 원칙).
import type { Resolver } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { MypageHeroBlock } from "./blocks/MypageHeroBlock";
import { MypageGridBlock } from "./blocks/MypageGridBlock";
import { FeaturedHighlightBlock } from "./blocks/FeaturedHighlightBlock";

export const craftMypageResolver: Resolver = {
  RootContainer,
  MypageHeroBlock,
  MypageGridBlock,
  FeaturedHighlightBlock,
  TextDirectoryBlock,
  NewsletterBlock,
  MinimalFooterBlock,
};
