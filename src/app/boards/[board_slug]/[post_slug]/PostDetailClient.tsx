"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import type { JSONContent } from "@/lib/blockEditorCore";
import { PostDetailHeader } from "@/components/boards/PostDetailHeader";
import { PostTags } from "@/components/boards/PostTags";
import { PostActions } from "@/components/boards/PostActions";
import { PostBody } from "@/components/boards/PostBody";
import { CommentSection } from "@/components/boards/CommentSection";
import { BoardPostListPanel } from "@/components/boards/BoardPostListPanel";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PostFloatingActionBar } from "@/components/boards/PostFloatingActionBar";
import type { BreadcrumbItem } from "@/components/PageHeader";

type PostDetail = {
  id: string;
  slug?: string;
  title: string;
  body: string;
  is_docent_post: boolean;
  like_count: number;
  is_best: boolean;
  photo_url: string | null;
  body_json: JSONContent | null;
  featured_image_url: string | null;
  thumbnail_visible: boolean | null;
  tags: string[] | null;
  view_count: number | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at?: string;
  post_number: number | null;
};

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
};

type Comment = {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
  parent_id: string | null;
  author_avatar_url: string | null;
  like_count: number;
  liked_by_me: boolean;
};

// EPIC-079-PHASE-2: URL이 UUID(/boards/[id]/[postId])에서 slug
// (/boards/[board_slug]/[post_slug])로 바뀌었다 — 이 페이지 자체는 slug를
// 그대로 API에 전달하기만 하면 되고(API가 내부적으로 slug→실제 id를
// 해석), 하위 액션(좋아요/북마크/댓글/삭제)도 같은 board_slug/post_slug
// 경로를 재사용한다.
// EPIC-085: 이 파일은 원래 page.tsx 그 자체였다 — generateMetadata(동적
// OG/SEO)를 추가하려면 그 export가 Server Component에서만 가능한데, 이
// 화면 전체가 client fetch 기반(useParams/useAuth/useState)이라 그대로는
// 안 된다. 그래서 클라이언트 로직은 이 파일(이름만 PostDetailClient로
// 변경, 내용은 100% 동일)에 남기고, page.tsx가 얇은 Server Component
// 래퍼로 generateMetadata + 이 컴포넌트 렌더링만 담당하도록 분리했다.
export function PostDetailClient({ breadcrumb = [] }: { breadcrumb?: BreadcrumbItem[] }) {
  const { board_slug: boardSlug, post_slug: postSlug } = useParams<{
    board_slug: string;
    post_slug: string;
  }>();
  const { session, member, loading: authLoading } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const [board, setBoard] = useState<Board | null>(null);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedByMe, setLikedByMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);

  async function load() {
    setFetching(true);
    setError(null);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}`, {
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "게시글을 불러오지 못했어요.");
      setFetching(false);
      return;
    }

    setBoard(data.board);
    setPost(data.post);
    setComments(data.comments);
    setLikedByMe(data.likedByMe);
    setFetching(false);
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSlug, postSlug, session, authLoading]);

  async function handleLike() {
    setLikeSubmitting(true);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}/like`, {
      method: "POST",
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    const data = await res.json();
    setLikeSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setLikedByMe(data.liked);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            like_count: data.likeCount,
            is_best: prev.is_best || Boolean(data.promoted),
          }
        : prev,
    );
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setCommentSubmitting(true);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ body: commentBody }),
    });

    const data = await res.json();
    setCommentSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setCommentBody("");
    load();
  }

  // EPIC-089: 답글(대댓글) — CommentSection이 parentId를 이미 "최상위
  // 댓글" id로 정규화해 넘겨준다(서버도 방어적으로 한 번 더 평평하게
  // 만듦). 낙관적 갱신 없이 load()로 다시 불러온다 — 톱레벨 댓글 등록과
  // 동일한 단순한 패턴.
  async function handleReply(parentId: string, body: string) {
    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ body, parentId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    load();
  }

  // EPIC-089: 댓글/대댓글 좋아요 — 낙관적으로 즉시 반영하고, 실패하면
  // 되돌린다(ScrapButton의 optimistic 패턴과 동일).
  async function handleToggleCommentLike(commentId: string) {
    if (!session) {
      router.push("/login");
      return;
    }
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, liked_by_me: !c.liked_by_me, like_count: c.like_count + (c.liked_by_me ? -1 : 1) }
          : c,
      ),
    );
    const res = await fetch(
      `/api/boards/${boardSlug}/posts/${postSlug}/comments/${commentId}/like`,
      { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } },
    );
    if (!res.ok) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, liked_by_me: !c.liked_by_me, like_count: c.like_count + (c.liked_by_me ? -1 : 1) }
            : c,
        ),
      );
      return;
    }
    const data = await res.json();
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, liked_by_me: data.liked, like_count: data.likeCount } : c)),
    );
  }

  async function handleDelete() {
    if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;

    setDeleting(true);
    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}`, {
      method: "DELETE",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했어요.");
      setDeleting(false);
      return;
    }

    router.push(`/boards/${boardSlug}`);
  }

  if (fetching) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (error && !post) {
    return (
      <main className="flex-1 p-8 bg-white">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!post) return null;

  // Board Definition System(EPIC-047): 좋아요/북마크/댓글 노출 여부는 이
  // 정의 하나로 결정한다(board_type별 하드코딩 분기 없음).
  const definition = resolveBoardDefinition(
    board ?? { board_type: "topic", category: null },
  );

  // EPIC-046/047: 별도 태그 컬럼 값(post.tags)에 게시판 카테고리/도슨트·
  // 개념글 여부를 함께 얹어 보여준다.
  const displayTags = [
    ...(post.tags ?? []),
    board?.category,
    post.is_docent_post ? "도슨트" : null,
    post.is_best ? "개념글" : null,
  ].filter((t): t is string => Boolean(t));

  return (
    <>
      <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-4xl mx-auto w-full">
        {breadcrumb.length > 0 && (
          <nav className="mb-4 text-xs text-gray-400" aria-label="breadcrumb">
            {breadcrumb.map((item, i) => (
              <span key={i}>
                {item.href ? (
                  <Link href={item.href} className="hover:text-gray-600">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-500">{item.label}</span>
                )}
                {i < breadcrumb.length - 1 && <span className="mx-1.5">›</span>}
              </span>
            ))}
          </nav>
        )}
        {/* EPIC-089(요구사항 3): "목록으로"는 이제 항상 떠 있는
            PostFloatingActionBar(좌측 하단)로 옮겨갔다 — 본문 상단 좌측의
            이 자리는 그 대신 관리자용 "페이지 수정" 버튼(기존엔 화면 우측
            상단에 고정돼 있었음)이 인라인으로 채운다. 관리자가 아니면 이
            자리는 비워둔다(방문자용 대체 링크 없음 — 목록으로는 FAB에 항상
            있으므로 중복 노출하지 않음). */}
        <div className="mb-4">
          <PageEditButton
            slug="boards-id-postid"
            label="게시글 보여지는 방식 수정"
            className="inline-flex items-center rounded-md bg-[#166534] px-3 py-1.5 text-sm text-white hover:opacity-90"
          />
        </div>
        <PostDetailHeader
          postNumber={post.post_number}
          createdAt={post.created_at}
          updatedAt={post.updated_at}
          title={post.title}
          authorId={post.author_id}
          authorName={post.author_name}
          likeCount={post.like_count}
          viewCount={post.view_count}
          commentCount={comments.length}
          showLikes={definition.likes}
          showComments={definition.comments}
          showViewCount={definition.showViewCount}
          editHref={
            member?.id === post.author_id || member?.is_admin
              ? `/boards/${boardSlug}/${postSlug}/edit`
              : undefined
          }
          onDelete={member?.id === post.author_id || member?.is_admin ? handleDelete : undefined}
          deleting={deleting}
        />

        <div className="max-w-2xl mx-auto w-full">
          <PostTags tags={displayTags} />

          <PostBody body={post.body} />

          <PostActions
            likeCount={post.like_count}
            likedByMe={likedByMe}
            onToggleLike={handleLike}
            likeSubmitting={likeSubmitting}
            showLike={definition.likes}
            postId={post.id}
            showBookmark={definition.bookmarks}
          />

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          {definition.comments && (
            <CommentSection
              comments={comments}
              commentBody={commentBody}
              onCommentBodyChange={setCommentBody}
              onSubmit={handleComment}
              submitting={commentSubmitting}
              onReply={handleReply}
              onToggleLike={handleToggleCommentLike}
            />
          )}

          <BoardPostListPanel boardId={boardSlug} currentPostId={postSlug} />
        </div>
      </div>
      </main>
      {/* EPIC-089(요구사항 3): 좌측 하단 고정 액션 바 — "목록으로"가 이제
          여기 항상 떠 있으므로(스크롤 위치 무관) EPIC-084-REVISED가 하단에
          추가했던 중복 "목록으로" 링크는 제거했다. */}
      <PostFloatingActionBar
        boardSlug={boardSlug}
        likeCount={post.like_count}
        likedByMe={likedByMe}
        onToggleLike={handleLike}
        likeSubmitting={likeSubmitting}
        showLike={definition.likes}
        postId={post.id}
        showBookmark={definition.bookmarks}
        showComments={definition.comments}
      />
    </>
  );
}
