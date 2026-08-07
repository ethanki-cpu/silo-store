import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-089: 댓글/대댓글 좋아요 토글 — posts의 like/route.ts와 같은 자리
// (게시글→댓글 소속 확인 없이 comment_id만으로 처리해도 안전한 이유: RLS
// insert/delete 정책이 member_id=본인 행만 허용하고, comment_likes.comment_id
// FK가 존재하지 않는 댓글이면 어차피 insert 자체가 실패한다). board_slug/
// post_slug는 이 라우트 경로 일관성(다른 게시글 하위 액션들과 동일한
// URL 셰이프)을 위해서만 받고 실제 조회에는 쓰지 않는다.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: existing } = await requester.scopedClient
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("member_id", requester.member.id)
    .maybeSingle();

  if (existing) {
    await requester.scopedClient.from("comment_likes").delete().eq("id", existing.id);
  } else {
    const { error: insertError } = await requester.scopedClient
      .from("comment_likes")
      .insert({ comment_id: commentId, member_id: requester.member.id });
    if (insertError) {
      return NextResponse.json(
        { error: "좋아요 처리에 실패했어요.", detail: insertError.message },
        { status: 500 },
      );
    }
  }

  const { count } = await requester.scopedClient
    .from("comment_likes")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  return NextResponse.json({ liked: !existing, likeCount: count ?? 0 });
}
