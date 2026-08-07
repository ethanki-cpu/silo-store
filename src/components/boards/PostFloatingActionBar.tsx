"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrapButton } from "@/components/common/ScrapButton";

// EPIC-089(요구사항 3): 게시글 상세 좌측 하단에 스크롤해도 항상 떠 있는
// 플로팅 액션 바 — [목록으로](버튼형) · 좋아요 · 북마크 · 공유 · 댓글
// 아이콘 순서(요청 원문의 순서 그대로). 기존 PostActions.tsx(본문 아래
// 인라인 좋아요/북마크/공유 행)는 그대로 남겨두고 이 바를 추가로 얹는다 —
// 완전히 새 배치 규칙(요구사항 2/3의 "이 자리로 옮겨라")이 적용되는 건
// "목록으로"와 "페이지 수정" 두 버튼뿐이라, 나머지 액션은 기존 위치도
// 유지하는 편이 이미 있던 화면 흐름을 덜 깬다.
export function PostFloatingActionBar({
  boardSlug,
  likeCount,
  likedByMe,
  onToggleLike,
  likeSubmitting,
  showLike,
  postId,
  showBookmark,
  showComments,
}: {
  boardSlug: string;
  likeCount: number;
  likedByMe: boolean;
  onToggleLike: () => void;
  likeSubmitting: boolean;
  showLike: boolean;
  postId: string;
  showBookmark: boolean;
  showComments: boolean;
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

  function scrollToComments() {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="fixed bottom-6 left-4 z-40 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur"
      role="toolbar"
      aria-label="게시글 빠른 작업"
    >
      <Link
        href={`/boards/${boardSlug}`}
        className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        ← 목록으로
      </Link>

      <div className="mx-0.5 h-6 w-px bg-gray-200" aria-hidden="true" />

      {showLike && (
        <button
          type="button"
          onClick={onToggleLike}
          disabled={likeSubmitting}
          aria-label={likedByMe ? "좋아요 취소" : "좋아요"}
          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
            likedByMe ? "border-red-300 bg-red-50 text-red-600" : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          {likedByMe ? "♥" : "♡"}
        </button>
      )}

      {showBookmark && <ScrapButton postId={postId} size="sm" />}

      <button
        type="button"
        onClick={handleShare}
        aria-label="공유"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-sm text-gray-600"
      >
        {copied ? "✓" : "⤴"}
      </button>

      {showComments && (
        <button
          type="button"
          onClick={scrollToComments}
          aria-label="댓글로 이동"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-sm text-gray-600"
        >
          💬
        </button>
      )}
    </div>
  );
}
