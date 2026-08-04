"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import {
  BOARD_DEFINITIONS,
  BOARD_GROUP_ORDER,
  resolveBoardDefinition,
} from "@/lib/boardLayout";
import { PageModuleRenderer } from "@/components/modules/PageModuleRenderer";
import { HeroModule } from "@/components/modules/HeroModule";
import { PageEditButton } from "@/components/admin/PageEditButton";
import type { PageModuleConfig } from "@/lib/pageModules";

type Board = {
  id: string;
  // EPIC-079-PHASE-2: URL 라우팅 키 — /api/boards가 항상 채워서 내려준다.
  slug?: string;
  name: string;
  category: string | null;
  board_type:
    | "topic"
    | "group"
    | "patron"
    | "artist_promo"
    | "adoption_story"
    | "archive"
    | "qna";
  locked: boolean;
  lockMessage: string | null;
};

export default function BoardsPage() {
  const { session, loading: authLoading } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setFetching(true);
      const headers: Record<string, string> = session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const res = await fetch("/api/boards", { headers });
      const data = await res.json();

      setBoards(Array.isArray(data) ? data : []);
      setFetching(false);
    }

    load();
  }, [session, authLoading]);

  if (fetching) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  // EPIC-049: Community 허브 아래 salon-topics/salon-weekday/survey처럼
  // hub가 다른 hub의 자식인 중첩 구조가 있어서, 최상위 디렉토리는 parent가
  // 없는 최상위 hub만 보여준다(중첩 hub는 그 부모 hub의 "하위 게시판
  // 카드"에서 접근).
  const hubBoards = boards.filter((b) => {
    const def = resolveBoardDefinition(b);
    return def.boardType === "hub" && def.parent === null;
  });

  // EPIC-054C: 최상위 hub 하나마다 Slide Board 모듈 하나씩 배치 — 한 Page
  // 안에 여러 Board를 나란히 배치할 수 있는 구조(pageModules.ts)를 실제로
  // 증명하는 자리. hubChildBoards는 바로 아래 "게시판 허브" 카드 그리드와
  // 중복되지 않도록 끈다(기존 마스터 피드도 동일하게 생략했었음).
  const modules: PageModuleConfig[] = hubBoards.map((b) => ({
    id: b.id,
    kind: "slide_board",
    props: { boardId: b.slug ?? b.id, includeChildBoards: false },
  }));

  return (
    <>
      <PageEditButton slug="boards" />
      <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <HeroModule
          title="게시판"
          breadcrumb={[{ label: "홈", href: "/" }, { label: "게시판" }]}
          description="사일로 스토어의 모든 게시판을 한눈에 모아봅니다."
        />
        <div className="border-t border-gray-200 mb-8 mt-6" />

        <div className="space-y-12">
          <PageModuleRenderer modules={modules} />
        </div>

        {hubBoards.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
              게시판 허브
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hubBoards.map((b) => (
                <Link
                  key={b.id}
                  href={`/boards/${b.slug ?? b.id}`}
                  className="block rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow group"
                >
                  <p className="font-serif font-medium text-gray-900 group-hover:underline">
                    {b.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="border-t border-gray-200 mb-8" />

        {BOARD_GROUP_ORDER.map((groupKey) => {
          const items = boards.filter(
            (b) => resolveBoardDefinition(b).id === groupKey,
          );
          if (items.length === 0) return null;

          return (
            <section key={groupKey} className="mb-10">
              <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                {BOARD_DEFINITIONS[groupKey].title_ko}
              </h2>
              <div className="divide-y divide-gray-100">
                {items.map((board) =>
                  board.locked ? (
                    <div
                      key={board.id}
                      className="py-3 text-gray-300 cursor-not-allowed"
                    >
                      <p className="font-serif font-medium">
                        🔒 {board.name}
                      </p>
                      <p className="text-xs mt-1">{board.lockMessage}</p>
                    </div>
                  ) : (
                    <Link
                      key={board.id}
                      href={`/boards/${board.slug ?? board.id}`}
                      className="block py-3 group"
                    >
                      <p className="font-serif font-medium text-gray-900 group-hover:underline">
                        {board.name}
                      </p>
                    </Link>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
      </main>
    </>
  );
}
