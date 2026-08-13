"use client";

// EPIC-099(항목 3, Phase 2): 온라인 도슨트 Craft 페이지의 Default State — 공개
// 렌더러/관리자 에디터가 이 하나를 공유한다(EPIC-098 홈페이지와 동일한
// "동일 트리를 두 곳에서 공유" 원칙). docentDefaultTree는 컴포넌트가 아니라
// 미리 만들어둔 순수 JSX 값(React element)이다 — Frame의 children으로
// 넘길 때 별도 래퍼 컴포넌트를 거치면 Craft가 그 래퍼 자체를 resolver에 없는
// 노드로 보고 깨지는 버그를 홈페이지 작업 때 직접 겪었다(EPIC-098 CHANGELOG
// 참고) — 그래서 여기서도 함수/컴포넌트가 아니라 값으로 내보낸다.
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { DocentHeroBlock } from "./blocks/DocentHeroBlock";
import { EraGridBlock } from "./blocks/EraGridBlock";
import { FeaturedEraBlock } from "./blocks/FeaturedEraBlock";

// Text Directory는 범용 블록이라 컴포넌트는 홈페이지 것을 그대로 쓰지만,
// 기본값(도슨트 하위 카테고리)은 이 페이지 맥락에 맞게 채운다.
export const docentDirectoryProps = {
  heading: "더 알아보기",
  items: [
    { label: "고대 ~ 왕정", href: "/online-docent/ancient-monarchy" },
    { label: "혁명 ~ 제국", href: "/online-docent/revolution-empire" },
    { label: "프로이트 ~ 인공지능", href: "/online-docent/freud-ai" },
    { label: "디지털 문화", href: "/online-docent/freud-ai/digital-culture" },
  ],
};

export const docentDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    <DocentHeroBlock {...DocentHeroBlock.craft.props} />
    <EraGridBlock {...EraGridBlock.craft.props} />
    <FeaturedEraBlock {...FeaturedEraBlock.craft.props} />
    <TextDirectoryBlock {...docentDirectoryProps} />
    <NewsletterBlock {...NewsletterBlock.craft.props} />
    <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
  </Element>
);

export const docentBlockOptions = [
  { label: "Docent Hero", buildElement: () => <DocentHeroBlock {...DocentHeroBlock.craft.props} /> },
  { label: "Era Grid", buildElement: () => <EraGridBlock {...EraGridBlock.craft.props} /> },
  { label: "Featured Era", buildElement: () => <FeaturedEraBlock {...FeaturedEraBlock.craft.props} /> },
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...docentDirectoryProps} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
