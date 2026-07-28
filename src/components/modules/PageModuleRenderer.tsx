"use client";

import type { PageModuleConfig } from "@/lib/pageModules";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
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

// EPIC-054B: Page = PageModuleConfig[]를 순서대로 렌더링하는 조합기.
// 각 case는 기존 컴포넌트(Board Definition System, Hero, Timeline, Comment,
// Pagination 등)에 props를 그대로 넘길 뿐, 데이터 조회나 board/content
// 생성은 전혀 하지 않는다 — 실제 데이터는 이 컴포넌트를 사용하는 Page가
// 채운다. 모듈 추가/삭제/순서 변경은 modules 배열을 조작하는 것만으로
// 충분하다(이 컴포넌트는 그 배열을 그대로 순회할 뿐 순서를 해석하지 않음).
export function PageModuleRenderer({ modules }: { modules: PageModuleConfig[] }) {
  return (
    <>
      {modules.map((module) => {
        switch (module.kind) {
          case "hero":
            return <HeroSlideshow key={module.id} {...module.props} />;

          case "story_board":
          case "gallery_board":
          case "list_board":
            return (
              <BoardRenderer
                key={module.id}
                definition={module.props.definition}
                boardId={module.props.boardId}
                posts={module.props.posts}
                isQna={module.props.isQna ?? false}
              />
            );

          case "slide_board":
            return (
              <BoardRenderer
                key={module.id}
                definition={module.props.definition}
                boardId={module.id}
                posts={[]}
                isQna={false}
                hubFeed={module.props.hubFeed}
                hubChildBoards={module.props.hubChildBoards}
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
