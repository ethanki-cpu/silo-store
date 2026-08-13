// EPIC-105: 하단 Footer 전용 Craft resolver. 원자 블록(Container/Text/
// Button 등)은 CraftPageEditor/CraftPageRenderer가 PRIMITIVE_RESOLVER를
// 자동 병합해주므로 여기 다시 등록할 필요 없다(EPIC-102 설계 그대로).
import type { Resolver } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { FooterCompanyInfoBlock } from "./blocks/FooterCompanyInfoBlock";
import { FooterLinksRowBlock } from "./blocks/FooterLinksRowBlock";

export const craftFooterResolver: Resolver = {
  RootContainer,
  FooterCompanyInfoBlock,
  FooterLinksRowBlock,
};
