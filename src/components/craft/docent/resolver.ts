// EPIC-099(항목 3, Phase 2): 온라인 도슨트 페이지의 Craft resolver. 이 페이지
// 전용 블록(DocentHero/EraGrid/FeaturedEra)은 새로 만들고, 페이지 성격과
// 무관한 범용 블록(Text Directory/Newsletter/Footer)은 홈페이지 것을 그대로
// 재사용한다(중복 생성 금지 원칙 — 레이아웃이 페이지마다 다를 이유가 없는
// 블록까지 복제하지 않는다).
import type { Resolver } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { DocentHeroBlock } from "./blocks/DocentHeroBlock";
import { EraGridBlock } from "./blocks/EraGridBlock";
import { FeaturedEraBlock } from "./blocks/FeaturedEraBlock";

export const craftDocentResolver: Resolver = {
  RootContainer,
  DocentHeroBlock,
  EraGridBlock,
  FeaturedEraBlock,
  TextDirectoryBlock,
  NewsletterBlock,
  MinimalFooterBlock,
};
