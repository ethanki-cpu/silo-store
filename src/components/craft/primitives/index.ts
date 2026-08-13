// EPIC-102: 6개 Craft 페이지 패밀리(home/shop/docent/salon/studio/mypage)가
// 전부 재사용하는 원자 블록 묶음 — resolver 맵과 툴박스용 blockOptions를
// 한 곳에서 export해 페이지마다 중복 등록 코드를 최소화한다.
import { createElement } from "react";
import { Element, type Resolver } from "@craftjs/core";
import type { CraftBlockOption } from "@/components/craft/shared/types";
import { ContainerBlock } from "./ContainerBlock";
import { TextBlock } from "./TextBlock";
import { ImageBlock } from "./ImageBlock";
import { ButtonBlock } from "./ButtonBlock";
import { VideoBlock } from "./VideoBlock";
import { SlideshowBlock } from "./SlideshowBlock";
import { BoardEmbedBlock } from "./BoardEmbedBlock";
import { TimelineEmbedBlock } from "./TimelineEmbedBlock";

export {
  ContainerBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  VideoBlock,
  SlideshowBlock,
  BoardEmbedBlock,
  TimelineEmbedBlock,
};

export const PRIMITIVE_RESOLVER: Resolver = {
  ContainerBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  VideoBlock,
  SlideshowBlock,
  BoardEmbedBlock,
  TimelineEmbedBlock,
};

// ContainerBlock은 canvas(다른 블록을 담는 그릇)라서 `<Element canvas>`로
// 감싸야 한다 — RootContainer와 동일한 이유(정적 craft.isCanvas가 아니라
// JSX Element 래핑으로 isCanvas를 지정하는 게 이 코드베이스의 기존 관례).
export const PRIMITIVE_BLOCK_OPTIONS: CraftBlockOption[] = [
  {
    label: "컨테이너",
    buildElement: () => createElement(Element, { canvas: true, is: ContainerBlock, ...ContainerBlock.craft.props }),
  },
  { label: "텍스트", buildElement: () => createElement(TextBlock, TextBlock.craft.props) },
  { label: "이미지", buildElement: () => createElement(ImageBlock, ImageBlock.craft.props) },
  { label: "버튼", buildElement: () => createElement(ButtonBlock, ButtonBlock.craft.props) },
  { label: "영상", buildElement: () => createElement(VideoBlock, VideoBlock.craft.props) },
  { label: "슬라이드쇼", buildElement: () => createElement(SlideshowBlock, SlideshowBlock.craft.props) },
  { label: "게시판 연동", buildElement: () => createElement(BoardEmbedBlock, BoardEmbedBlock.craft.props) },
  { label: "타임라인 연동", buildElement: () => createElement(TimelineEmbedBlock, TimelineEmbedBlock.craft.props) },
];
