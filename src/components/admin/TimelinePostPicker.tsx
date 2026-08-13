"use client";

// EPIC-097 후속(사용자 지시: "이미 존재하는 게시글을 타임라인 위젯에
// 연결"): 게시판을 고르고 제목으로 검색해 게시글 하나를 선택하면,
// TimelineItemAccordion이 그 게시글의 썸네일/제목/본문 요약/링크를 항목에
// 한 번 복사해 채운다(실시간 동기화가 아니라 가져오기 — 이후엔 다른
// 필드처럼 자유롭게 고칠 수 있는 독립 사본). 이 컴포넌트는 선택 UI만
// 담당하고, 실제 필드 매핑은 호출부(TimelineItemAccordion)가 한다.
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { stripHtml } from "@/lib/sanitize";
import type { BoardPost } from "@/lib/boardLayout";

type BoardOption = { id: string; name: string; slug?: string };

export type PickedPost = {
  title: string;
  excerpt: string;
  thumbnailUrl?: string;
  url: string;
  postId: string;
};

export function TimelinePostPicker({
  onSelect,
  onClose,
}: {
  onSelect: (post: PickedPost) => void;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [boardId, setBoardId] = useState("");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [boardSlug, setBoardSlug] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/boards", {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const options = data
          .filter((b: { is_public?: boolean }) => b.is_public !== false)
          .map((b: { id: string; name: string; slug?: string }) => ({ id: b.id, name: b.name, slug: b.slug }));
        setBoards(options);
        if (options.length > 0) setBoardId(options[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!boardId) {
      setPosts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: "1", sort: "latest", q: query });
    fetch(`/api/boards/${boardId}/posts?${params.toString()}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setBoardSlug(data.board?.slug);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, query, session]);

  function handlePick(post: BoardPost) {
    const thumbnailUrl =
      post.thumbnail_visible !== false ? (post.featured_image_url || post.photo_url || undefined) : undefined;
    const excerpt = stripHtml(post.body ?? "").trim().slice(0, 120);
    const url = `/boards/${boardSlug ?? boardId}/${post.slug ?? post.id}`;
    onSelect({
      title: post.title ?? "",
      excerpt,
      thumbnailUrl: thumbnailUrl ?? undefined,
      url,
      postId: post.id,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-white/10 bg-gray-950 text-gray-100">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold">게시글에서 가져오기</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-gray-300 hover:bg-white/10"
          >
            닫기
          </button>
        </div>

        <div className="space-y-2 border-b border-white/10 p-3">
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목으로 검색"
            className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-center text-xs text-gray-500">불러오는 중...</p>
          ) : posts.length === 0 ? (
            <p className="p-4 text-center text-xs text-gray-500">게시글이 없어요.</p>
          ) : (
            <div className="space-y-1">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => handlePick(post)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-white/10"
                >
                  {post.thumbnail_visible !== false && (post.featured_image_url || post.photo_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.featured_image_url || post.photo_url || ""}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded bg-white/10" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm">{post.title || "(제목 없음)"}</p>
                    <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString("ko-KR")}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
