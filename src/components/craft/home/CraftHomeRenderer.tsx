"use client";

// EPIC-098: 공개 홈페이지가 쓰는 읽기 전용 Craft.js 렌더러. craft_state가
// 있으면 그 직렬화된 트리를, 없으면(관리자가 한 번도 저장한 적 없음)
// DefaultHomeSkeleton을 그대로 보여준다 — 배포 직후에도 "빈 화면"이 아니라
// 완성된 에디토리얼 레이아웃이 즉시 보인다(요구사항 4).
import { Editor, Frame, Element } from "@craftjs/core";
import { craftHomeResolver } from "./resolver";
import { RootContainer } from "./RootContainer";
import { EditorialHeroBlock } from "./blocks/EditorialHeroBlock";
import { LatestIssueBlock } from "./blocks/LatestIssueBlock";
import { EditorialGridBlock } from "./blocks/EditorialGridBlock";
import { TextDirectoryBlock } from "./blocks/TextDirectoryBlock";
import { NewsletterBlock } from "./blocks/NewsletterBlock";
import { MinimalFooterBlock } from "./blocks/MinimalFooterBlock";
import { editorialSerif } from "./font";

export function CraftHomeRenderer({ craftState }: { craftState?: string | null }) {
  return (
    <div className={`craft-home ${editorialSerif.variable}`}>
      <Editor resolver={craftHomeResolver} enabled={false}>
        <Frame data={craftState ?? undefined}>
          {!craftState && (
            <Element is={RootContainer} canvas id="ROOT">
              <EditorialHeroBlock {...EditorialHeroBlock.craft.props} />
              <LatestIssueBlock {...LatestIssueBlock.craft.props} />
              <EditorialGridBlock {...EditorialGridBlock.craft.props} />
              <TextDirectoryBlock {...TextDirectoryBlock.craft.props} />
              <NewsletterBlock {...NewsletterBlock.craft.props} />
              <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
            </Element>
          )}
        </Frame>
      </Editor>
    </div>
  );
}
