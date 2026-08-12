"use client";

import type { PageModuleConfig } from "@/lib/pageModules";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { BoardModule } from "@/components/modules/BoardModule";
import { CommentSection } from "@/components/boards/CommentSection";
import { Pagination } from "@/components/boards/Pagination";
import { TimelineView } from "@/components/TimelineView";
import { SearchInput } from "@/components/modules/SearchInput";
import { CtaButtons } from "@/components/modules/CtaButtons";
import { NoticeBanner } from "@/components/modules/NoticeBanner";
import { FormShell } from "@/components/modules/FormShell";
import { CalendarGrid } from "@/components/modules/CalendarGrid";
import { SurveyCard } from "@/components/modules/SurveyCard";
import { RankingList } from "@/components/modules/RankingList";
import { ProfileCard } from "@/components/modules/ProfileCard";
import { EmptyState } from "@/components/modules/EmptyState";

// EPIC-054B/054C: Page = PageModuleConfig[]를 순서대로 렌더링하는 조합기.
// 각 case는 기존 컴포넌트(Board Module, Hero, Timeline, Comment,
// Pagination 등)에 props를 그대로 넘길 뿐, 데이터 조회나 board/content
// 생성은 전혀 하지 않는다 — 실제 데이터는 이 컴포넌트를 사용하는 Page가
// 채운다(단, Board 계열 4종은 BoardModule 자체가 boardId로 스스로 조회한다
// — EPIC-054C 참고). 모듈 추가/삭제/순서 변경은 modules 배열을 조작하는
// 것만으로 충분하다(이 컴포넌트는 그 배열을 그대로 순회할 뿐 순서를
// 해석하지 않음). 배열이 비어 있으면(Board/모듈이 없는 Page) Placeholder가
// 아니라 EmptyState를 보여준다.
export function PageModuleRenderer({ modules }: { modules: PageModuleConfig[] }) {
  if (modules.length === 0) {
    return <EmptyState title="이 페이지에는 아직 배치된 모듈이 없어요." />;
  }

  return (
    <>
      {modules.map((module) => {
        switch (module.kind) {
          case "hero":
            // EPIC-094(요구사항 1.2): 이 Page Builder "hero" 모듈은
            // site_settings.hero_slideshow(PC/모바일 분리된 그 설정)와는
            // 별개의 단일 슬라이드 세트다 — 기기별 분기가 없으므로
            // device="both"로 넘겨 <picture> 기기 분기 트릭을 끄고 항상
            // 실제 이미지를 그대로 내려준다(기존 동작과 동일).
            return <HeroSlideshow key={module.id} device="both" {...module.props} />;

          case "story_board":
          case "gallery_board":
          case "list_board":
          case "slide_board":
            return (
              <BoardModule
                key={module.id}
                boardId={module.props.boardId}
                includeChildBoards={module.props.includeChildBoards}
              />
            );

          case "timeline":
            return <TimelineView key={module.id} {...module.props} />;

          case "comment":
            return <CommentSection key={module.id} {...module.props} />;

          case "search":
            return <SearchInput key={module.id} {...module.props} />;

          case "pagination":
            return <Pagination key={module.id} {...module.props} />;

          case "notice":
            return <NoticeBanner key={module.id} {...module.props} />;

          case "cta":
            return <CtaButtons key={module.id} {...module.props} />;

          case "form":
            return <FormShell key={module.id} {...module.props} />;

          case "calendar":
            return <CalendarGrid key={module.id} {...module.props} />;

          case "survey":
            return <SurveyCard key={module.id} {...module.props} />;

          case "ranking":
            return <RankingList key={module.id} {...module.props} />;

          case "profile_card":
            return <ProfileCard key={module.id} {...module.props} />;

          default:
            return null;
        }
      })}
    </>
  );
}
