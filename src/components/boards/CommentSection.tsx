"use client";

import { useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";

// EPIC-054B: Page Module 시스템(src/lib/pageModules.ts)이 CommentModuleProps에서
// 이 타입을 그대로 재사용할 수 있도록 export.
// EPIC-089: 유튜브 스타일 대댓글/좋아요/아바타 — parent_id(항상 "최상위
// 댓글" id, 답글의 답글도 평평하게 매달림)/author_avatar_url/like_count/
// liked_by_me 추가. 기존 필드는 그대로 유지해 다른 소비처(pageModules 등)
// 호환성을 깨지 않는다.
export type Comment = {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
  parent_id?: string | null;
  author_avatar_url?: string | null;
  like_count?: number;
  liked_by_me?: boolean;
};

function Avatar({ url, name }: { url?: string | null; name: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- 외부/Storage URL 혼재, next/image 도메인 화이트리스트 밖일 수 있음(기존 댓글 아바타 관례 없음, 안전한 <img>로 시작).
    <img src={url} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500">
      {name.slice(0, 1)}
    </div>
  );
}

function CommentRow({
  comment,
  indented,
  onReply,
  onToggleLike,
  replyTargetName,
}: {
  comment: Comment;
  indented: boolean;
  onReply: (parentId: string, body: string) => Promise<void>;
  onToggleLike: (commentId: string) => void;
  /** 답글에 다시 답글을 달 때 입력창에 미리 채워줄 "@이름 " 멘션 — 최상위 댓글엔 없음. */
  replyTargetName?: string;
}) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function startReply() {
    setReplyBody(replyTargetName ? `@${replyTargetName} ` : "");
    setReplying(true);
  }

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyBody);
    setSubmitting(false);
    setReplyBody("");
    setReplying(false);
  }

  return (
    <div className={indented ? "ml-11 mt-4" : "py-4"}>
      <div className="flex gap-3">
        <Avatar url={comment.author_avatar_url} name={comment.author_name} />
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            <Link href={`/u/${comment.author_id}`} className="hover:underline">
              {comment.author_name}
            </Link>{" "}
            · {new Date(comment.created_at).toLocaleString()}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
            {comment.body}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <button
              type="button"
              onClick={() => onToggleLike(comment.id)}
              className={`inline-flex items-center gap-1 ${comment.liked_by_me ? "text-red-600" : ""}`}
            >
              {comment.liked_by_me ? "♥" : "♡"} {comment.like_count ?? 0}
            </button>
            <button type="button" onClick={startReply} className="hover:underline">
              답글
            </button>
          </div>

          {replying && (
            <form onSubmit={submitReply} className="mt-2 flex gap-2">
              <input
                type="text"
                autoFocus
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="답글을 입력하세요"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                등록
              </button>
              <button
                type="button"
                onClick={() => setReplying(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600"
              >
                취소
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// EPIC-046/047: 댓글 영역도 게시글과 동일한 Editorial 톤 — 카드형 박스 대신
// 얇은 구분선(hairline)으로 나눈 목록. 작성자명은 Board Engine의 "작성자
// 프로필" 공통 기능에 맞춰 프로필(/u/[memberId])로 링크한다.
export function CommentSection({
  comments,
  commentBody,
  onCommentBodyChange,
  onSubmit,
  submitting,
  onReply,
  onToggleLike,
}: {
  comments: Comment[];
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
  /** 답글(대댓글) 등록 — parentId는 항상 "최상위 댓글" id. 이 컴포넌트를
   * pageModules(PageModuleRenderer)의 범용 "comment" 모듈로 쓰는 기존
   * 호출부는 실제 게시글 컨텍스트가 없어 이 두 핸들러를 안 넘길 수 있다 —
   * 그 경우 답글/좋아요 버튼은 조용히 아무 일도 하지 않는다(기존 그 경로가
   *애초에 실제 데이터에 연결돼 있지 않은 것과 동일한 수준). */
  onReply?: (parentId: string, body: string) => Promise<void>;
  onToggleLike?: (commentId: string) => void;
}) {
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (!c.parent_id) continue;
    const list = repliesByParent.get(c.parent_id) ?? [];
    list.push(c);
    repliesByParent.set(c.parent_id, list);
  }

  return (
    // EPIC-089: PostFloatingActionBar의 "댓글" 아이콘이 부드럽게 스크롤할 앵커.
    <section id="comments" className="mt-16">
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

      {topLevel.length === 0 ? (
        <p className="text-sm text-gray-400">아직 댓글이 없어요.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {topLevel.map((c) => (
            <div key={c.id}>
              <CommentRow
                comment={c}
                indented={false}
                onReply={onReply ?? (async () => {})}
                onToggleLike={onToggleLike ?? (() => {})}
              />
              {(repliesByParent.get(c.id) ?? []).map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  indented
                  onReply={onReply ?? (async () => {})}
                  onToggleLike={onToggleLike ?? (() => {})}
                  replyTargetName={reply.author_name}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
