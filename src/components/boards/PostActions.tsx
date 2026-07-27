"use client";

import { useState } from "react";

// Board Engine(EPIC-047): 게시글 상세의 좋아요/공유/북마크 액션 행.
// 공유는 별도 서버 연동 없이 현재 URL을 클립보드에 복사하는 방식으로 구현.
export function PostActions({
  likeCount,
  likedByMe,
  onToggleLike,
  likeSubmitting,
  bookmarkedByMe,
  onToggleBookmark,
  bookmarkSubmitting,
}: {
  likeCount: number;
  likedByMe: boolean;
  onToggleLike: () => void;
  likeSubmitting: boolean;
  bookmarkedByMe: boolean;
  onToggleBookmark: () => void;
  bookmarkSubmitting: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근이 막힌 환경(권한 거부 등)에서는 조용히 무시.
    }
  }

  return (
    <div className="flex items-center gap-2 mt-8">
      <button
        type="button"
        onClick={onToggleLike}
        disabled={likeSubmitting}
        className={`rounded-md px-4 py-2 text-sm border ${
          likedByMe
            ? "bg-red-50 border-red-300 text-red-600"
            : "bg-white border-gray-300 text-gray-700"
        }`}
      >
        {likedByMe ? "♥" : "♡"} 좋아요 {likeCount}
      </button>

      <button
        type="button"
        onClick={onToggleBookmark}
        disabled={bookmarkSubmitting}
        className={`rounded-md px-4 py-2 text-sm border ${
          bookmarkedByMe
            ? "bg-amber-50 border-amber-300 text-amber-600"
            : "bg-white border-gray-300 text-gray-700"
        }`}
      >
        {bookmarkedByMe ? "★" : "☆"} 북마크
      </button>

      <button
        type="button"
        onClick={handleShare}
        className="rounded-md px-4 py-2 text-sm border bg-white border-gray-300 text-gray-700"
      >
        {copied ? "링크 복사됨" : "⤴ 공유"}
      </button>
    </div>
  );
}
