import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { postId } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: post, error: postError } = await requester.scopedClient
    .from("posts")
    .select("id, author_id, like_count, is_best")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return NextResponse.json(
      { error: "게시글을 찾을 수 없어요." },
      { status: 404 },
    );
  }

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
