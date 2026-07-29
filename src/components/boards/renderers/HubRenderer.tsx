import Link from "next/link";
import { SlideModule } from "@/components/modules/SlideModule";
import type { BoardRendererProps } from "./types";

// EPIC-066: Renderer Registry의 "hub" 항목 — 하위 게시판의 최신글/인기글/
// 추천글 슬라이드(Slide Module, EPIC-056) + 하위 게시판 카드. 기존
// BoardRenderer.tsx 안의 private HubView를 그대로 옮겨왔다(마크업/동작
// 변경 없음).
export function HubRenderer({ hubFeed, hubChildBoards }: BoardRendererProps) {
  const feed = hubFeed ?? { latest: [], popular: [], recommended: [] };

  return (
    <div>
      <SlideModule title="최신글" items={feed.latest} />
      <SlideModule title="인기글" items={feed.popular} />
      <SlideModule title="추천글" items={feed.recommended} />

      {/* hubChildBoards가 아예 주어지지 않으면(예: 최상위 /boards 디렉토리처럼
          그룹별 목록을 이 컴포넌트 밖에서 직접 그리는 페이지) 이 섹션 자체를
          생략한다 — 진짜 hub 게시판(Silo Store 등)은 항상 배열을 넘긴다. */}
      {hubChildBoards && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">하위 게시판</h2>
          {hubChildBoards.length === 0 ? (
            <p className="text-sm text-gray-400">하위 게시판이 없어요.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hubChildBoards.map((board) =>
                board.locked ? (
                  <div
                    key={board.id}
                    className="rounded-lg border border-gray-100 p-4 text-gray-300 cursor-not-allowed"
                  >
                    <p className="font-serif font-medium">🔒 {board.name}</p>
                    <p className="text-xs mt-1">{board.lockMessage}</p>
                  </div>
                ) : (
                  <Link
                    key={board.id}
                    href={`/boards/${board.id}`}
                    className="block rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow group"
                  >
                    <p className="font-serif font-medium text-gray-900 group-hover:underline">
                      {board.name}
                    </p>
                  </Link>
                ),
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
