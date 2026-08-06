"use client";

import { useState } from "react";
import { ScrapButton } from "@/components/common/ScrapButton";

// Board Definition System(EPIC-047): 게시글 상세의 좋아요/공유/스크랩
// 액션 행 — 좋아요/스크랩은 BoardDefinition의 likes/bookmarks 토글로
// 켜고 끌 수 있다(showLike/showBookmark). 공유는 토글 필드가 없어(모든
// 게시판 공통 기능) 항상 표시하며, 별도 서버 연동 없이 현재 URL을
// 클립보드에 복사하는 방식으로 구현.
// EPIC-085: "북마크"(post_bookmarks, 라이브 DB에 한 번도 마이그레이션되지
// 않아 항상 실패하던 죽은 기능)를 ScrapButton(user_scraps)으로 교체 —
// showBookmark 필드명은 boardLayout.ts의 BoardDefinition.bookmarks를 그대로
// 재사용(스키마 필드명 변경은 이번 범위 밖, "이 게시글을 저장할 수
// 있는가"라는 의미는 동일하다).
export function PostActions({
  likeCount,
  likedByMe,
  onToggleLike,
  likeSubmitting,
  showLike = true,
  postId,
  showBookmark = true,
}: {
  likeCount: number;
  likedByMe: boolean;
  onToggleLike: () => void;
  likeSubmitting: boolean;
  showLike?: boolean;
  postId: string;
  showBookmark?: boolean;
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
      {showLike && (
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
      )}

      {showBookmark && <ScrapButton postId={postId} />}

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
