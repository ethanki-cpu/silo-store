"use client";

import { useParams } from "next/navigation";
import { BoardModule } from "@/components/modules/BoardModule";

// EPIC-054C: 이 페이지의 조회/Search/Sort/Pagination 로직은 전부
// BoardModule(src/components/modules/BoardModule.tsx)로 옮겨졌다 — 이제
// 어떤 게시판이든 이 자기완결형 모듈 하나에 boardId만 넘기면 되고, 같은
// 모듈을 여러 개 배치하는 Page(예: /boards 디렉토리)와 로직을 공유한다.
export default function BoardPostsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <BoardModule boardId={String(id)} />
      </div>
    </main>
  );
}
