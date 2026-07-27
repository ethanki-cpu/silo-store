import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { id, postId } = await params;

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, name, category, board_type")
    .eq("id", id)
    .single();

  if (boardError || !board) {
    return NextResponse.json(
      { error: "게시판을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const requester = await getRequestMember(request);
  const tier = requester
    ? await getTier(requester.member.membership_rank)
    : null;

  if (!canReadBoard(board, tier)) {
    return NextResponse.json(
      { error: `이 게시판은 ${RANK_LABELS[3]} 등급부터 열람 가능해요.` },
      { status: 403 },
    );
  }

  const client = requester ? requester.scopedClient : supabase;

  const { data: post, error: postError } = await client
    .from("posts")
    .select(
      "id, board_id, title, body, is_docent_post, like_count, is_best, photo_url, author_id, created_at",
    )
    .eq("id", postId)
    .eq("board_id", id)
    .single();

  if (postError || !post) {
    return NextResponse.json(
      { error: "게시글을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  // EPIC-046: "글 번호(No.)" — 별도 시퀀스 컬럼이 없어, 같은 게시판에서
  // 이 글보다 먼저(또는 동시에) 작성된 글의 개수로 파생 계산한다(1부터 시작).
  const { count: postNumber } = await client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("board_id", id)
    .lte("created_at", post.created_at);

  const { data: comments } = await client
    .from("comments")
    .select("id, body, author_id, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const authorIds = [
    ...new Set([post.author_id, ...(comments ?? []).map((c) => c.author_id)]),
  ];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", authorIds);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  let likedByMe = false;
  if (requester) {
    const { data: myLike } = await requester.scopedClient
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("member_id", requester.member.id)
      .maybeSingle();
    likedByMe = !!myLike;
  }

  return NextResponse.json({
    board,
    post: {
      ...post,
      author_name: nameById.get(post.author_id) ?? "알 수 없음",
      post_number: postNumber ?? null,
    },
    comments: (comments ?? []).map((c) => ({
      ...c,
      author_name: nameById.get(c.author_id) ?? "알 수 없음",
    })),
    likedByMe,
  });
}
