"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BoardModule } from "@/components/modules/BoardModule";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { getBoardPageSlug } from "@/lib/siteTree";
import { supabase } from "@/lib/supabaseClient";

// EPIC-054C: 이 페이지의 조회/Search/Sort/Pagination 로직은 전부
// BoardModule(src/components/modules/BoardModule.tsx)로 옮겨졌다 — 이제
// 어떤 게시판이든 이 자기완결형 모듈 하나에 boardId만 넘기면 되고, 같은
// 모듈을 여러 개 배치하는 Page(예: /boards 디렉토리)와 로직을 공유한다.
//
// EPIC-067: page_builder 위젯을 게시판 본문 아래에 이어서 렌더링(EPIC-066이
// 발견한 PageEditButton-only 결함 수정, Phase 1) — BoardModule이 담당하는
// 실제 게시판 기능(글 목록/검색/정렬/페이지네이션)은 그대로 두고, 관리자가
// 추가로 배치한 위젯만 그 아래에 덧붙인다.
//
// EPIC-079-PHASE-2: URL이 board id(UUID) 대신 board slug를 쓰도록
// 바뀌었다 — BoardModule은 이 slug를 그대로 받아 API(/api/boards/[board_slug]/
// posts)를 호출한다(내부적으로 board_id로 다시 바꿀 필요 없음, API가 이미
// slug로 board를 조회함).
//
// HOTFIX-094: 이 파일은 "그리스"/"로마" 등 모든 게시판이 공유하는 하나의
// 동적 라우트다 — 그런데 위 위젯 조회와 PageEditButton이 게시판마다 다른
// slug를 넘기지 않고 항상 고정 문자열 "boards-id"(page_builder에 실제로
// 존재하는 단 하나의 placeholder row)를 썼다. 그 결과 "그리스" 게시판에서
// "페이지 수정"을 눌러도 "그리스"와 무관한, 모든 게시판이 공유하는 위젯
// 영역(제목도 그 placeholder의 slug 그대로 "/boards-id")으로 이동해버리는
// 문제가 있었다. getBoardPageSlug(boardId)로 "이 게시판을 board 위젯으로
// 담고 있는 전용 page_builder 페이지"(CategoryBranchPicker로 사이트 메뉴에
// 배정하면 자동 생성됨, src/lib/siteTree.ts 참고)를 찾아 그 slug를 쓴다 —
// 아직 배정되지 않은 게시판은 전용 페이지가 없으므로 버튼/위젯 영역을
// 아예 렌더링하지 않는다(공유 placeholder로 폴백하면 다시 같은 문제로
// 돌아간다).
export default function BoardPostsPage() {
  const { board_slug: boardSlug } = useParams<{ board_slug: string }>();

  const [pageModules, setPageModules] = useState<PageModuleRow[]>([]);
  const [pageSlug, setPageSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("boards")
      .select("id")
      .eq("slug", boardSlug)
      .maybeSingle()
      .then(async ({ data }) => {
        const boardId = (data as { id: string } | null)?.id;
        if (!boardId) return;
        const slug = await getBoardPageSlug(boardId);
        if (!cancelled) setPageSlug(slug);
      });
    return () => {
      cancelled = true;
    };
  }, [boardSlug]);

  useEffect(() => {
    if (!pageSlug) return;
    let cancelled = false;
    fetchPublishedPageBySlug(pageSlug).then((result) => {
      if (!cancelled) setPageModules(result?.modules ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [pageSlug]);

  return (
    <>
      {pageSlug && <PageEditButton slug={pageSlug} />}
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          <BoardModule boardId={String(boardSlug)} />

          {pageSlug && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <PageBuilderRenderer modules={pageModules} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
