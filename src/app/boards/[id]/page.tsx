"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BoardModule } from "@/components/modules/BoardModule";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-054C: 이 페이지의 조회/Search/Sort/Pagination 로직은 전부
// BoardModule(src/components/modules/BoardModule.tsx)로 옮겨졌다 — 이제
// 어떤 게시판이든 이 자기완결형 모듈 하나에 boardId만 넘기면 되고, 같은
// 모듈을 여러 개 배치하는 Page(예: /boards 디렉토리)와 로직을 공유한다.
//
// EPIC-067: page_builder(slug="boards-id") 위젯을 게시판 본문 아래에 이어서
// 렌더링(EPIC-066이 발견한 PageEditButton-only 결함 수정, Phase 1) —
// BoardModule이 담당하는 실제 게시판 기능(글 목록/검색/정렬/페이지네이션)은
// 그대로 두고, 관리자가 추가로 배치한 위젯만 그 아래에 덧붙인다.
export default function BoardPostsPage() {
  const { id } = useParams<{ id: string }>();

  const [pageModules, setPageModules] = useState<PageModuleRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("boards-id").then((result) => {
      if (!cancelled) setPageModules(result?.modules ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageEditButton slug="boards-id" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          <BoardModule boardId={String(id)} />

          <div className="mt-12 pt-8 border-t border-gray-200">
            <PageBuilderRenderer modules={pageModules} />
          </div>
        </div>
      </main>
    </>
  );
}
