// EPIC-099(항목 3, Phase 2): 스튜디오 페이지의 Craft resolver. 이 페이지
// 전용 블록(StudioHero/ServiceGrid/FeaturedService)은 새로 만들고, 페이지
// 성격과 무관한 범용 블록(Text Directory/Newsletter/Footer)은 홈페이지 것을
// 그대로 재사용한다(중복 생성 금지 원칙).
import type { Resolver } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { StudioHeroBlock } from "./blocks/StudioHeroBlock";
import { ServiceGridBlock } from "./blocks/ServiceGridBlock";
import { FeaturedServiceBlock } from "./blocks/FeaturedServiceBlock";

export const craftStudioResolver: Resolver = {
  RootContainer,
  StudioHeroBlock,
  ServiceGridBlock,
  FeaturedServiceBlock,
  TextDirectoryBlock,
  NewsletterBlock,
  MinimalFooterBlock,
};
