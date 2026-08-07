import Link from "next/link";
import type { HubFeed } from "@/lib/boardLayout";
import { PostTags } from "@/components/boards/PostTags";

// EPIC-056: Board Module 목록 ⑧ Slide Module — 최신글/인기글 슬라이드.
// src/components/boards/BoardRenderer.tsx 안에 갇혀 있던 사설(private)
// 컴포넌트를 그대로 뽑아낸 것(마크업/동작 변경 없음) — HubView(hub
// 게시판)와 온라인 도슨트/사일로 유산 등 여러 페이지가 이 모듈 하나를
// 재사용한다.
// EPIC-086: GalleryModule(EPIC-084)과 동일한 이유 — 특정 게시판 하나에
// 연결된 위젯(DbSlideModule)에서는 우측 상단에 Contextual Write
// (/write?boardId=) 버튼을 보여준다. HubRenderer/SlideRenderer처럼 여러
// 게시판을 한꺼번에 모아 보여주는 자리는 boardId를 안 넘기므로 버튼이
// 뜨지 않는다(하위 호환, opt-in).
export function SlideModule({
  title,
  items,
  boardId,
}: {
  title: string;
  items: HubFeed["latest"];
  boardId?: string;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wide text-gray-400">
          {title}
        </h2>
        {boardId && (
          <Link
            href={`/write?boardId=${encodeURIComponent(boardId)}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            글쓰기
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">아직 글이 없어요.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/boards/${item.board_slug ?? item.board_id}/${item.slug ?? item.id}`}
              className="shrink-0 w-56 rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {item.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photo_url}
                  alt={item.title ?? ""}
                  className="w-full aspect-[4/3] object-cover"
                />
              )}
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                  {item.board_name}
                </p>
                <p className="font-serif font-medium text-gray-900 line-clamp-2">
                  {item.title}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {item.author_name} · 좋아요 {item.like_count}
                  {item.comment_count !== undefined && <> · 댓글 {item.comment_count}</>}
                  {item.view_count !== undefined && <> · 조회 {item.view_count ?? 0}</>}
                </p>
                {item.tags && item.tags.length > 0 && <PostTags tags={item.tags} />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
