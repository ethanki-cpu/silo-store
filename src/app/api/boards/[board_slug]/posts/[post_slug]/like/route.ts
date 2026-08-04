import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";

// EPIC-079-PHASE-2: posts.slug는 board별로만 UNIQUE라, 실제 post_id를
// 알려면 먼저 board를 slug로 찾아야 한다(bookmark/route.ts와 동일한 이유).
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
    .select("id, author_id, like_count, is_best")
    .eq("slug", postSlug)
    .eq("board_id", (board as { id: string }).id)
    .single();

  if (postError || !post) {
    return NextResponse.json(
      { error: "게시글을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const postId = post.id as string;

  const { data: existingLike } = await requester.scopedClient
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("member_id", requester.member.id)
    .maybeSingle();

  if (existingLike) {
    await requester.scopedClient
      .from("likes")
      .delete()
      .eq("id", existingLike.id);

    const newCount = Math.max(0, post.like_count - 1);
    await requester.scopedClient
      .from("posts")
      .update({ like_count: newCount })
      .eq("id", postId);

    return NextResponse.json({ liked: false, likeCount: newCount });
  }

  await requester.scopedClient
    .from("likes")
    .insert({ post_id: postId, member_id: requester.member.id });

  const newCount = post.like_count + 1;
  const promoted = !post.is_best && newCount >= 10;

  await requester.scopedClient
    .from("posts")
    .update({ like_count: newCount, ...(promoted ? { is_best: true } : {}) })
    .eq("id", postId);

  if (post.author_id !== requester.member.id) {
    await requester.scopedClient.from("points_ledger").insert({
      member_id: post.author_id,
      reason: "like_received",
      points: 2,
      related_id: postId,
    });
  }

  if (promoted) {
    await requester.scopedClient.from("points_ledger").insert({
      member_id: post.author_id,
      reason: "best_post",
      points: 50,
      related_id: postId,
    });
  }

  return NextResponse.json({ liked: true, likeCount: newCount, promoted });
}
