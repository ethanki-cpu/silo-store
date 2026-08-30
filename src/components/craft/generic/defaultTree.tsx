"use client";

// HOTFIX-152.18: 범용 Craft 페이지의 Default State — docent/defaultTree.tsx와
// 동일한 원칙(공개 렌더러/관리자 에디터가 이 값 하나를 공유, 컴포넌트가
// 아니라 미리 만들어둔 순수 JSX 값)이지만, 이 페이지가 무슨 내용을 담을지
// 미리 알 수 없으므로 페이지 전용 Hero 블록을 강제로 얹지 않고 빈
// RootContainer로 시작한다 — 관리자가 "+ 요소 추가"로 원하는 블록(게시판
// 연동/사일로 타임라인 연동/이미지 등)을 직접 골라 채운다.
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";

export const genericDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT" />
);

export const genericBlockOptions = [
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...TextDirectoryBlock.craft.props} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
