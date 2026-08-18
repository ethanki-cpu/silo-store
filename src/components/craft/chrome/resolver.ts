// B2: 홈페이지 설정 관리(전역 크롬) 전용 Craft 리졸버 — 기존
// PRIMITIVE_RESOLVER(에디토리얼 블록 10종)와는 무관한 별개의 작은
// 리졸버다. Toolbox로 요소를 추가/삭제하는 흐름 자체가 없으므로(계획
// 결정 5 — 로고/사이드바 아이콘/계정 메뉴는 항상 정해진 자리만 있고,
// 상단 탭은 site_navigations에서 매번 자동 생성) PRIMITIVE_RESOLVER를
// 섞어 쓸 필요가 없다.
import type { Resolver } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { ChromeLogoBlock } from "./blocks/ChromeLogoBlock";
import { ChromeSidebarIconBlock } from "./blocks/ChromeSidebarIconBlock";
import { ChromeTopTabBlock } from "./blocks/ChromeTopTabBlock";
import { ChromeAccountMenuBlock } from "./blocks/ChromeAccountMenuBlock";

export const chromeResolver: Resolver = {
  RootContainer,
  ChromeLogoBlock,
  ChromeSidebarIconBlock,
  ChromeTopTabBlock,
  ChromeAccountMenuBlock,
};

export { ChromeLogoBlock, ChromeSidebarIconBlock, ChromeTopTabBlock, ChromeAccountMenuBlock };
