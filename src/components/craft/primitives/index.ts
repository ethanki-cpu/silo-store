// EPIC-102: 6개 Craft 페이지 패밀리(home/shop/docent/salon/studio/mypage)가
// 전부 재사용하는 원자 블록 묶음 — resolver 맵과 툴박스용 blockOptions를
// 한 곳에서 export해 페이지마다 중복 등록 코드를 최소화한다.
//
// HOTFIX(사용자 지시 — "BuilderJS(이메일 빌더) 레퍼런스처럼 요소 팔레트를
// 확장해달라"): 아래 21개 블록이 그 팔레트 확장분 — BuilderJS의 Elements
// 탭에 있던 항목들과 1:1 대응하되, 이 사이트 성격과 맞지 않거나(Menu Bar —
// 이 사이트는 전역 Navbar가 이미 있어 페이지마다 또 다른 메뉴를 꽂으면
// 충돌/중복만 남는다) 기존 블록과 기능이 겹치는 것(Slider — SlideshowBlock과
// 동일, Product List — ShopItemsGridBlock과 동일, Welcome — TextBlock에
// 다른 기본 문구를 넣은 것과 다를 게 없음, Grid — ContainerBlock을
// layout="row"로 쓰면 이미 N단 그리드로 감싸 쓸 수 있음)는 새로 만들지
// 않고 기존 블록 재사용을 안내한다. "Image & Text"/"Text" 두 섹션은
// BuilderJS가 배치만 다른 레이아웃을 5종/3종 따로 뒀지만, 여기서는 블록
//하나에 배치 선택지를 둬 코드 중복 없이 캔버스에서 바로 전환 가능하게
// 만들었다(ImageTextBlock/TextCTABlock).
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
import { ShopItemsGridBlock } from "./ShopItemsGridBlock";
import { HeroSlideshowWidgetBlock } from "./HeroSlideshowWidgetBlock";
import { SiloTimelineEmbedBlock } from "./SiloTimelineEmbedBlock";
import { ImageTextBlock } from "./ImageTextBlock";
import { TextCTABlock } from "./TextCTABlock";
import { DividerBlock } from "./DividerBlock";
import { SpacerBlock } from "./SpacerBlock";
import { SocialIconsBlock } from "./SocialIconsBlock";
import { AlertBlock } from "./AlertBlock";
import { YoutubeBlock } from "./YoutubeBlock";
import { RatingBlock } from "./RatingBlock";
import { StatBlock } from "./StatBlock";
import { ProgressBarBlock } from "./ProgressBarBlock";
import { BulletListBlock } from "./BulletListBlock";
import { TestimonialBlock } from "./TestimonialBlock";
import { FeaturesBlock } from "./FeaturesBlock";
import { PricingCardsBlock } from "./PricingCardsBlock";
import { ImageCollageBlock } from "./ImageCollageBlock";
import { SocialProofBlock } from "./SocialProofBlock";
import { DataTableBlock } from "./DataTableBlock";
import { ChartBlock } from "./ChartBlock";
import { QRCodeBlock } from "./QRCodeBlock";
import { BarcodeBlock } from "./BarcodeBlock";
import { ProductSpotlightBlock } from "./ProductSpotlightBlock";

export {
  ContainerBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  VideoBlock,
  SlideshowBlock,
  BoardEmbedBlock,
  TimelineEmbedBlock,
  ShopItemsGridBlock,
  HeroSlideshowWidgetBlock,
  SiloTimelineEmbedBlock,
  ImageTextBlock,
  TextCTABlock,
  DividerBlock,
  SpacerBlock,
  SocialIconsBlock,
  AlertBlock,
  YoutubeBlock,
  RatingBlock,
  StatBlock,
  ProgressBarBlock,
  BulletListBlock,
  TestimonialBlock,
  FeaturesBlock,
  PricingCardsBlock,
  ImageCollageBlock,
  SocialProofBlock,
  DataTableBlock,
  ChartBlock,
  QRCodeBlock,
  BarcodeBlock,
  ProductSpotlightBlock,
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
  ShopItemsGridBlock,
  HeroSlideshowWidgetBlock,
  SiloTimelineEmbedBlock,
  ImageTextBlock,
  TextCTABlock,
  DividerBlock,
  SpacerBlock,
  SocialIconsBlock,
  AlertBlock,
  YoutubeBlock,
  RatingBlock,
  StatBlock,
  ProgressBarBlock,
  BulletListBlock,
  TestimonialBlock,
  FeaturesBlock,
  PricingCardsBlock,
  ImageCollageBlock,
  SocialProofBlock,
  DataTableBlock,
  ChartBlock,
  QRCodeBlock,
  BarcodeBlock,
  ProductSpotlightBlock,
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
  { label: "사일로 상점 목록", buildElement: () => createElement(ShopItemsGridBlock, ShopItemsGridBlock.craft.props) },
  { label: "홈페이지 슬라이드쇼 위젯", buildElement: () => createElement(HeroSlideshowWidgetBlock, HeroSlideshowWidgetBlock.craft.props) },
  { label: "사일로 타임라인 연동", buildElement: () => createElement(SiloTimelineEmbedBlock, SiloTimelineEmbedBlock.craft.props) },
  { label: "이미지 & 텍스트", buildElement: () => createElement(ImageTextBlock, ImageTextBlock.craft.props) },
  { label: "텍스트 + 버튼", buildElement: () => createElement(TextCTABlock, TextCTABlock.craft.props) },
  { label: "구분선", buildElement: () => createElement(DividerBlock, DividerBlock.craft.props) },
  { label: "여백", buildElement: () => createElement(SpacerBlock, SpacerBlock.craft.props) },
  { label: "소셜 아이콘", buildElement: () => createElement(SocialIconsBlock, SocialIconsBlock.craft.props) },
  { label: "알림", buildElement: () => createElement(AlertBlock, AlertBlock.craft.props) },
  { label: "유튜브", buildElement: () => createElement(YoutubeBlock, YoutubeBlock.craft.props) },
  { label: "별점", buildElement: () => createElement(RatingBlock, RatingBlock.craft.props) },
  { label: "통계/KPI", buildElement: () => createElement(StatBlock, StatBlock.craft.props) },
  { label: "진행률 바", buildElement: () => createElement(ProgressBarBlock, ProgressBarBlock.craft.props) },
  { label: "불릿 리스트", buildElement: () => createElement(BulletListBlock, BulletListBlock.craft.props) },
  { label: "후기", buildElement: () => createElement(TestimonialBlock, TestimonialBlock.craft.props) },
  { label: "기능 카드", buildElement: () => createElement(FeaturesBlock, FeaturesBlock.craft.props) },
  { label: "요금제 카드", buildElement: () => createElement(PricingCardsBlock, PricingCardsBlock.craft.props) },
  { label: "이미지 콜라주", buildElement: () => createElement(ImageCollageBlock, ImageCollageBlock.craft.props) },
  { label: "소셜 프루프", buildElement: () => createElement(SocialProofBlock, SocialProofBlock.craft.props) },
  { label: "데이터 테이블", buildElement: () => createElement(DataTableBlock, DataTableBlock.craft.props) },
  { label: "차트", buildElement: () => createElement(ChartBlock, ChartBlock.craft.props) },
  { label: "QR 코드", buildElement: () => createElement(QRCodeBlock, QRCodeBlock.craft.props) },
  { label: "바코드", buildElement: () => createElement(BarcodeBlock, BarcodeBlock.craft.props) },
  { label: "상품 스포트라이트", buildElement: () => createElement(ProductSpotlightBlock, ProductSpotlightBlock.craft.props) },
];
