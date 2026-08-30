// HOTFIX-152.18(사용자 지시 — "페이지가 만들어질때 craft 에디터를
// default로 깔아"): "사이트 메뉴"에서 새 카테고리를 만들면 지금까지는
// builder_type='native'(page_modules 위젯 목록)로 시작했다 — 그런데 이
// 코드베이스는 온라인 도슨트처럼 특정 섹션 전용 defaultTree/resolver를
// 만드는 방식(docent/shop/salon/studio/mypage/home 6개 페이지 패밀리)뿐,
// "어떤 새 카테고리든 쓸 수 있는 범용 Craft 페이지"가 없었다 — 그래서 여기
// 새로 만든다. 페이지 성격과 무관한 범용 블록(Text Directory/Newsletter/
// Footer, docent/resolver.ts와 동일한 재사용 원칙)만 등록하고, 나머지
// 요소는 CraftPageEditor/CraftPageRenderer가 항상 자동으로 합쳐주는
// PRIMITIVE_RESOLVER(컨테이너/텍스트/이미지/게시판 연동/사일로 타임라인
// 연동 등 30여 종)로 충분히 커버된다.
import type { Resolver } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";

export const craftGenericResolver: Resolver = {
  RootContainer,
  TextDirectoryBlock,
  NewsletterBlock,
  MinimalFooterBlock,
};
