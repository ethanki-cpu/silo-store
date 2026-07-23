import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import {
  getRequestMember,
  getTier,
  canReadBoard,
  canWriteToBoard,
  RANK_LABELS,
} from "@/lib/serverAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const { data: posts, error: postsError } = await client
    .from("posts")
    .select("id, title, body, is_docent_post, like_count, is_best, author_id, created_at")
    .eq("board_id", id)
    .order("created_at", { ascending: false });

  if (postsError || !posts) {
    return NextResponse.json(
      { error: "게시글을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", authorIds.length > 0 ? authorIds : ["00000000-0000-0000-0000-000000000000"]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  let answeredByPostId = new Map<string, boolean>();
  if (board.board_type === "qna") {
    const postIds = posts.map((p) => p.id);
    const { data: comments } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds.length > 0 ? postIds : ["00000000-0000-0000-0000-000000000000"]);
    answeredByPostId = new Map(
      (comments ?? []).map((c) => [c.post_id, true]),
    );
  }

  const result = posts.map((post) => ({
    ...post,
    author_name: nameById.get(post.author_id) ?? "알 수 없음",
    ...(board.board_type === "qna"
      ? { is_answered: answeredByPostId.get(post.id) ?? false }
      : {}),
  }));

  return NextResponse.json({ board, posts: result });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

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

  const body = await request.json();
  const title = body?.title as string | undefined;
  const postBody = body?.body as string | undefined;
  const isDocentPost = Boolean(body?.isDocentPost);
  const orderId = body?.orderId as string | undefined;

  if (!title || !postBody) {
    return NextResponse.json(
      { error: "제목과 내용을 모두 입력해주세요." },
      { status: 400 },
    );
  }

  const tier = await getTier(requester.member.membership_rank);
  const permission = canWriteToBoard(board, tier, isDocentPost);

  if (!permission.ok) {
    return NextResponse.json({ error: permission.error }, { status: 403 });
  }

  let validatedOrderId: string | null = null;

  if (board.board_type === "adoption_story") {
    if (!orderId) {
      return NextResponse.json(
        { error: "구매하신 물품을 선택해주세요." },
        { status: 400 },
      );
    }

    const { data: order } = await requester.scopedClient
      .from("orders")
      .select("id, payment_status")
      .eq("id", orderId)
      .single();

    if (!order || order.payment_status !== "confirmed") {
      return NextResponse.json(
        { error: "본인의 구매 확정 건만 선택할 수 있어요." },
        { status: 400 },
      );
    }

    validatedOrderId = order.id;
  }

  const { data: post, error: insertError } = await requester.scopedClient
    .from("posts")
    .insert({
      board_id: id,
      author_id: requester.member.id,
      title,
      body: postBody,
      is_docent_post: isDocentPost,
      visibility: "public",
      order_id: validatedOrderId,
    })
    .select()
    .single();

  if (insertError || !post) {
    return NextResponse.json(
      { error: "글 작성에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  await requester.scopedClient.from("points_ledger").insert({
    member_id: requester.member.id,
    reason: "post",
    points: 5,
    related_id: post.id,
  });

  return NextResponse.json(post);
}
