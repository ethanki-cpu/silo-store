"use client";

// EPIC-102: CraftHomeEditor.tsx를 다른 5개 페밀리와 동일한 공용 셸
// (CraftPageEditor)로 마이그레이션하면서, 기본 트리를 다른 페밀리(shop 등)와
// 같은 패턴으로 이 파일 하나에 모았다. homeDefaultTree는 컴포넌트가 아니라
// 미리 만든 순수 JSX 값이다(별도 래퍼 컴포넌트를 거치면 Craft가 깨지는
// 버그를 EPIC-098에서 직접 겪었다 — shop/defaultTree.tsx와 동일한 이유).
//
// EPIC-103(Kinfolk 16블록): 사용자가 스크린샷 14장으로 요청한 Kinfolk.com
// 홈페이지 구조(1~16번 블록)를 EPIC-102가 만든 원자 블록(Container/Image/
// Text/Slideshow/BoardEmbed/ShopItemsGrid) 조합으로 기본 트리를 재구성한다.
// 게시판을 참조하는 블록(3/6/9/12/14/15/16)은 boardId가 비어 있는 채로
// 시작하므로, 관리자가 우측 설정 패널에서 실제 게시판을 골라야 데이터가
// 채워진다(placeholder 상태에서는 "게시판을 선택하세요" 안내만 보임).
import { Element } from "@craftjs/core";
import { RootContainer } from "./RootContainer";
import { EditorialHeroBlock } from "./blocks/EditorialHeroBlock";
import { LatestIssueBlock } from "./blocks/LatestIssueBlock";
import { EditorialGridBlock } from "./blocks/EditorialGridBlock";
import { TextDirectoryBlock } from "./blocks/TextDirectoryBlock";
import { NewsletterBlock } from "./blocks/NewsletterBlock";
import { MinimalFooterBlock } from "./blocks/MinimalFooterBlock";
import {
  ContainerBlock,
  TextBlock,
  ImageBlock,
  SlideshowBlock,
  BoardEmbedBlock,
  ShopItemsGridBlock,
} from "@/components/craft/primitives";

const PLACEHOLDER_1600x900 = (label: string) => `https://placehold.co/1600x900/1a1a1a/ffffff?text=${encodeURIComponent(label)}`;
const PLACEHOLDER_1200x1500 = (label: string) => `https://placehold.co/1200x1500/e5e0d8/1a1a1a?text=${encodeURIComponent(label)}`;

export const homeDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    {/* 1. 좌우 클릭 네비게이션 슬라이드쇼 — sticky, 스크롤하면 2번이 위로 덮음 */}
    <SlideshowBlock
      mode="arrows"
      sticky
      heightVh={100}
      autoAdvanceSeconds={5}
      slides={[
        { imageUrl: PLACEHOLDER_1600x900("ISSUE 60"), title: "ISSUE 60", description: "HISTORY SPECIAL", href: "/shop" },
      ]}
    />

    {/* 2. 자동 전환 슬라이드쇼 + Latest Stories 링크 — 흰 배경 컨테이너가
        1번 위로 자연스럽게 덮여 올라온다(커튼 효과, sticky+정상 문서 흐름). */}
    <Element canvas is={ContainerBlock} layout="col" gap={0} paddingY={0} paddingX={0} background="#ffffff" maxWidthPx={null} align="start">
      <SlideshowBlock
        mode="auto"
        autoAdvanceSeconds={6}
        heightVh={80}
        slides={[
          { imageUrl: PLACEHOLDER_1600x900("Latest Story 1"), title: "", description: "", href: "" },
          { imageUrl: PLACEHOLDER_1600x900("Latest Story 2"), title: "", description: "", href: "" },
        ]}
      />
      <div className="py-4 text-center">
        {/* Craft의 <Frame>이 이 defaultTree를 직접 파싱해 노드 트리를 만든다
            (일반 React 렌더가 아님) — next/link의 <Link>는 커스텀 컴포넌트라
            resolver 등록 없이 저장(serialize)하면 깨진다(EPIC-098에서 겪은
            "래퍼 컴포넌트" 버그와 같은 범주). 네이티브 <a> 태그만 안전하다. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/salon-des-cent" className="text-sm font-medium uppercase tracking-wide text-gray-900 underline underline-offset-4">
          Latest Stories
        </a>
      </div>
    </Element>

    {/* 3. 드래그 스크롤 목록(Inside Issue Sixty) */}
    <Element canvas is={ContainerBlock} layout="col" gap={16} paddingY={48} paddingX={24} background="#ffffff" maxWidthPx={1200} align="start">
      <TextBlock text="Inside Issue Sixty" fontSizePx={22} fontWeight="semibold" align="left" color="#111111" />
      <BoardEmbedBlock boardId="" cardStyle="dragRow" count={8} />
    </Element>

    {/* 4. 스포트라이트(게시글 1개, 여백 넉넉) */}
    <BoardEmbedBlock boardId="" cardStyle="spotlight" count={1} />

    {/* 5. 꽉 채우는 클릭 가능 이미지 — 카테고리 하나 강조 */}
    <ImageBlock
      imageUrl={PLACEHOLDER_1200x1500("TIMELESS")}
      href="/silo-store"
      objectFit="cover"
      aspectRatio="16/9"
      overlayCategory="Fashion"
      overlayTitle="TIMELESS"
      overlaySummary="Enduring ensembles that never go out of style."
    />

    {/* 6. 드래그 스크롤 목록 — 배경색만 다르게 */}
    <Element canvas is={ContainerBlock} layout="col" gap={16} paddingY={48} paddingX={24} background="#f5f1e8" maxWidthPx={1200} align="start">
      <TextBlock text="더 읽어보기" fontSizePx={22} fontWeight="semibold" align="left" color="#111111" />
      <BoardEmbedBlock boardId="" cardStyle="dragRow" count={8} />
    </Element>

    {/* 7. 뉴스레터 구독 */}
    <NewsletterBlock {...NewsletterBlock.craft.props} />

    {/* 8. 꽉 채우는 클릭 가능 이미지(다른 이미지) */}
    <ImageBlock
      imageUrl={PLACEHOLDER_1600x900("ARKET SELECTS")}
      href="/shop"
      objectFit="cover"
      aspectRatio="21/9"
      overlayCategory="Silo Notes"
      overlayTitle="ARKET SELECTS"
      overlaySummary="From the world of Silo Store comes a new collection."
    />

    {/* 9. 드래그 스크롤 목록 — 흰 배경 */}
    <Element canvas is={ContainerBlock} layout="col" gap={16} paddingY={48} paddingX={24} background="#ffffff" maxWidthPx={1200} align="start">
      <TextBlock text="Free Preview" fontSizePx={22} fontWeight="semibold" align="center" color="#111111" />
      <BoardEmbedBlock boardId="" cardStyle="dragRow" count={6} />
    </Element>

    {/* 10. 꽉 채우는 클릭 가능 이미지 */}
    <ImageBlock
      imageUrl={PLACEHOLDER_1600x900("THE DESCENDANTS")}
      href="/silo-store"
      objectFit="cover"
      aspectRatio="21/9"
      overlayCategory="Arts & Culture"
      overlayTitle="THE DESCENDANTS"
      overlaySummary="What does it mean to live in the shadow of a family member who reshaped history?"
    />

    {/* 11. 큰 텍스트 + 오른쪽 이미지, 여백 넉넉 */}
    <Element canvas is={ContainerBlock} layout="row" gap={48} paddingY={64} paddingX={24} background="#ffffff" maxWidthPx={1200} align="center">
      <TextBlock text="The Silo Shop" fontSizePx={40} fontWeight="bold" align="left" color="#111111" />
      <Element canvas is={ContainerBlock} layout="col" gap={0} paddingY={0} paddingX={0} background="transparent" maxWidthPx={480} align="start">
        <ImageBlock imageUrl={PLACEHOLDER_1200x1500("Shop")} href="/shop" objectFit="cover" aspectRatio="4/5" />
      </Element>
    </Element>

    {/* 12. 썸네일/카테고리/제목/가격/쇼핑 안내 — 사일로 상점 items */}
    <ShopItemsGridBlock heading="The Silo Shop" count={4} />

    {/* 13. 이미지 2개 위에 제목/요약/카테고리 텍스트 */}
    <Element canvas is={ContainerBlock} layout="row" gap={0} paddingY={0} paddingX={0} background="#ffffff" maxWidthPx={null} align="start">
      <ImageBlock
        imageUrl={PLACEHOLDER_1200x1500("David Michon")}
        href="/silo-store"
        objectFit="cover"
        aspectRatio="4/5"
        overlayTitle="WHAT ARE YOU WORKING ON?"
        overlaySummary="A cult-favorite newsletter."
        overlayCategory="Arts & Culture"
      />
      <ImageBlock
        imageUrl={PLACEHOLDER_1200x1500("Ome Dezin")}
        href="/silo-store"
        objectFit="cover"
        aspectRatio="4/5"
        overlayTitle="AT WORK WITH: OME DEZIN"
        overlaySummary="Meet the design duo restoring glamorous homes."
        overlayCategory="Interiors"
      />
    </Element>

    {/* 14. 3개 글 썸네일/제목/카테고리 */}
    <Element canvas is={ContainerBlock} layout="col" gap={16} paddingY={48} paddingX={24} background="#ffffff" maxWidthPx={1200} align="start">
      <TextBlock text="Uncommon Interests" fontSizePx={22} fontWeight="semibold" align="left" color="#111111" />
      <BoardEmbedBlock boardId="" cardStyle="thumbnail" count={3} />
    </Element>

    {/* 15. Stories You May Have Missed */}
    <Element canvas is={ContainerBlock} layout="col" gap={16} paddingY={48} paddingX={24} background="#ffffff" maxWidthPx={1200} align="start">
      <TextBlock text="Stories You May Have Missed" fontSizePx={22} fontWeight="semibold" align="left" color="#111111" />
      <BoardEmbedBlock boardId="" cardStyle="gallery" count={4} />
    </Element>

    {/* 16. 썸네일 3개 + 위에 큰 텍스트(버튼처럼) */}
    <Element canvas is={ContainerBlock} layout="col" gap={24} paddingY={64} paddingX={24} background="#000000" maxWidthPx={null} align="center">
      <TextBlock text="SUBSCRIBE" fontSizePx={36} fontWeight="bold" align="center" color="#ffffff" />
      <BoardEmbedBlock boardId="" cardStyle="thumbnail" count={3} />
    </Element>

    <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
  </Element>
);

export const homeBlockOptions = [
  { label: "Hero", buildElement: () => <EditorialHeroBlock {...EditorialHeroBlock.craft.props} /> },
  { label: "Latest Issue", buildElement: () => <LatestIssueBlock {...LatestIssueBlock.craft.props} /> },
  { label: "Editorial Grid", buildElement: () => <EditorialGridBlock {...EditorialGridBlock.craft.props} /> },
  { label: "Text Directory", buildElement: () => <TextDirectoryBlock {...TextDirectoryBlock.craft.props} /> },
  { label: "Newsletter", buildElement: () => <NewsletterBlock {...NewsletterBlock.craft.props} /> },
  { label: "Footer", buildElement: () => <MinimalFooterBlock {...MinimalFooterBlock.craft.props} /> },
];
