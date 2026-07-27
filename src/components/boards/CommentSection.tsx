"use client";

import type { FormEvent } from "react";

type Comment = {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
};

// EPIC-046: 댓글 영역도 게시글과 동일한 Editorial 톤 — 카드형 박스 대신
// 얇은 구분선(hairline)으로 나눈 목록, 작성자명은 소문자 캡션 스타일.
export function CommentSection({
  comments,
  commentBody,
  onCommentBodyChange,
  onSubmit,
  submitting,
}: {
  comments: Comment[];
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
}) {
  return (
    <section className="mt-16">
      <h2 className="font-serif text-lg font-semibold text-gray-900 mb-6">
        댓글 {comments.length}
      </h2>

      <form onSubmit={onSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          required
          value={commentBody}
          onChange={(e) => onCommentBodyChange(e.target.value)}
          placeholder="댓글을 입력하세요"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          등록
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-gray-400">아직 댓글이 없어요.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {comments.map((c) => (
            <div key={c.id} className="py-4">
              <p className="text-sm text-gray-800 leading-relaxed">
                {c.body}
              </p>
              <p className="text-xs uppercase tracking-wide text-gray-400 mt-2">
                {c.author_name} · {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
