"use client";

import { useMemo, useState } from "react";

export type UniversalBoardPost = {
  id: string;
  title: string;
  authorName: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
};

type SortOption = "views" | "likes" | "latest";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "최신날짜순" },
  { value: "views", label: "조회수순" },
  { value: "likes", label: "좋아요순" },
];

// EPIC-044: 헤리티지(할머니/할아버지)·클럽 등 이름/주제별로 페이지가
// 무한히 늘어나는 카테고리를 위한 만능 게시판 템플릿. 각 동적 라우트
// page.tsx는 URL 파라미터만 읽어 title로 넘기고, 실제 게시글 데이터는
// 아직 카테고리별 테이블/조회 API가 없어 posts=[] 기본값(뼈대)으로 둔다.
export function UniversalBoard({
  title,
  posts = [],
  totalPages = 1,
}: {
  title: string;
  posts?: UniversalBoardPost[];
  totalPages?: number;
}) {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<SortOption>("latest");

  const visiblePosts = useMemo(() => {
    const filtered = posts.filter((post) =>
      post.title.toLowerCase().includes(keyword.trim().toLowerCase()),
    );

    return [...filtered].sort((a, b) => {
      if (sort === "views") return b.viewCount - a.viewCount;
      if (sort === "likes") return b.likeCount - a.likeCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, keyword, sort]);

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="w-full sm:w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {visiblePosts.length === 0 ? (
        <p className="text-gray-500">아직 게시글이 없어요.</p>
      ) : (
        <div className="space-y-2">
          {visiblePosts.map((post) => (
            <div
              key={post.id}
              className="rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
            >
              <h2 className="font-medium">{post.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                {post.authorName} · 조회 {post.viewCount} · 좋아요{" "}
                {post.likeCount} · {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">
        총 {totalPages}페이지
      </p>
    </main>
  );
}
