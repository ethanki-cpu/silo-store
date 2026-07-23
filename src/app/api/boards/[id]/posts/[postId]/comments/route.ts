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

  const body = await request.json();
  const commentBody = body?.body as string | undefined;

  if (!commentBody || !commentBody.trim()) {
    return NextResponse.json(
      { error: "댓글 내용을 입력해주세요." },
      { status: 400 },
    );
  }

  const { data: comment, error: insertError } = await requester.scopedClient
    .from("comments")
    .insert({
      post_id: postId,
      author_id: requester.member.id,
      body: commentBody,
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
