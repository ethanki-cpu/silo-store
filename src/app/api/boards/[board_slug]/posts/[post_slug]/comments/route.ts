import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";

// EPIC-079-PHASE-2: posts.slug는 board별로만 UNIQUE라, 실제 post_id를
// 알려면 먼저 board를 slug로 찾아야 한다(bookmark/like route와 동일한 이유).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string; post_slug: string }> },
) {
  const { board_slug: boardSlug, post_slug: postSlug } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { board, boardError } = await fetchBoard(boardSlug);
  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const { data: post, error: postError } = await requester.scopedClient
    .from("posts")
    .select("id")
    .eq("slug", postSlug)
    .eq("board_id", (board as { id: string }).id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없어요." }, { status: 404 });
  }

  const postId = post.id as string;

  const body = await request.json();
  const commentBody = body?.body as string | undefined;
  const replyToId = body?.parentId as string | undefined;

  if (!commentBody || !commentBody.trim()) {
    return NextResponse.json(
      { error: "댓글 내용을 입력해주세요." },
      { status: 400 },
    );
  }

  // EPIC-089: 유튜브처럼 답글은 딱 1단계만 들여쓴다 — 답글에 또 답글을
  // 달면(=parentId가 가리키는 댓글도 이미 parent_id가 있으면) 그 댓글의
  // parent_id(최상위 댓글)로 그대로 매달아 평평하게 유지한다. parentId가
  // 이 게시글 소속이 아니면(다른 글 댓글 id를 잘못 보낸 경우) 조용히
  // 무시하고 최상위 댓글로 처리한다.
  let parentId: string | null = null;
  if (replyToId) {
    const { data: parentComment } = await requester.scopedClient
      .from("comments")
      .select("id, post_id, parent_id")
      .eq("id", replyToId)
      .maybeSingle();
    if (parentComment && parentComment.post_id === postId) {
      parentId = (parentComment.parent_id as string | null) ?? (parentComment.id as string);
    }
  }

  const { data: comment, error: insertError } = await requester.scopedClient
    .from("comments")
    .insert({
      post_id: postId,
      author_id: requester.member.id,
      body: commentBody,
      parent_id: parentId,
    })
    .select()
    .single();

  if (insertError || !comment) {
    return NextResponse.json(
      { error: "댓글 작성에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  await requester.scopedClient.from("points_ledger").insert({
    member_id: requester.member.id,
    reason: "comment",
    points: 1,
    related_id: comment.id,
  });

  return NextResponse.json(comment);
}
