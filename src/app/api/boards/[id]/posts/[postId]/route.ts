import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { resolveBoardDefinition } from "@/lib/boardLayout";

const richFields =
  "id, board_id, title, body, is_docent_post, like_count, is_best, photo_url, tags, view_count, updated_at, author_id, created_at";
const legacyFields =
  "id, board_id, title, body, is_docent_post, like_count, is_best, photo_url, author_id, created_at";

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

  const definition = resolveBoardDefinition(board);

  const requester = await getRequestMember(request);
  const tier = requester
    ? await getTier(requester.member.membership_rank)
    : null;

  if (!canReadBoard(board, tier)) {
    return NextResponse.json(
      {
        error: `이 게시판은 ${RANK_LABELS[definition.membership] ?? "상위"} 등급부터 열람 가능해요.`,
      },
      { status: 403 },
    );
  }

  const client = requester ? requester.scopedClient : supabase;

  // Board Engine(EPIC-047): tags/view_count/updated_at가 라이브 DB에 아직
  // 없을 수 있어(마이그레이션 전), 새 컬럼 포함 select가 42703으로 실패하면
  // 레거시 컬럼만으로 재시도한다(자세한 배경은 posts/route.ts 참고).
  let usedRichFields = true;
  let { data: post, error: postError } = await client
    .from("posts")
    .select(richFields)
    .eq("id", postId)
    .eq("board_id", id)
    .single();

  if (postError) {
    usedRichFields = false;
    ({ data: post, error: postError } = await client
      .from("posts")
      .select(legacyFields)
      .eq("id", postId)
      .eq("board_id", id)
      .single());
  }

  if (postError || !post) {
    return NextResponse.json(
      { error: "게시글을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const normalizedPost = usedRichFields
    ? (post as unknown as {
        id: string;
        board_id: string;
        title: string | null;
        body: string | null;
        is_docent_post: boolean;
        like_count: number;
        is_best: boolean;
        photo_url: string | null;
        tags: string[] | null;
        view_count: number | null;
        updated_at: string;
        author_id: string;
        created_at: string;
      })
    : {
        ...(post as {
          id: string;
          board_id: string;
          title: string | null;
          body: string | null;
          is_docent_post: boolean;
          like_count: number;
          is_best: boolean;
          photo_url: string | null;
          author_id: string;
          created_at: string;
        }),
        tags: [] as string[] | null,
        view_count: 0 as number | null,
        updated_at: (post as { created_at: string }).created_at,
      };

  // 조회수 증가 — view_count 컬럼이 없으면(마이그레이션 전) 조용히 무시.
  if (usedRichFields) {
    await client
      .from("posts")
      .update({ view_count: (normalizedPost.view_count ?? 0) + 1 })
      .eq("id", postId);
  }

  // EPIC-046: "글 번호(No.)" — 별도 시퀀스 컬럼이 없어, 같은 게시판에서
  // 이 글보다 먼저(또는 동시에) 작성된 글의 개수로 파생 계산한다(1부터 시작).
  const { count: postNumber } = await client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("board_id", id)
    .lte("created_at", normalizedPost.created_at);

  const { data: comments } = definition.comments
    ? await client
        .from("comments")
        .select("id, body, author_id, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; body: string; author_id: string; created_at: string }[] };

  const authorIds = [
    ...new Set([
      normalizedPost.author_id,
      ...(comments ?? []).map((c) => c.author_id),
    ]),
  ];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", authorIds);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  let likedByMe = false;
  let bookmarkedByMe = false;
  if (requester) {
    if (definition.likes) {
      const { data: myLike } = await requester.scopedClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("member_id", requester.member.id)
        .maybeSingle();
      likedByMe = !!myLike;
    }

    // post_bookmarks가 라이브 DB에 아직 없을 수 있어(마이그레이션 전) 에러는
    // 무시하고 기본값 false로 둔다.
    if (definition.bookmarks) {
      const { data: myBookmark } = await requester.scopedClient
        .from("post_bookmarks")
        .select("id")
        .eq("post_id", postId)
        .eq("member_id", requester.member.id)
        .maybeSingle();
      bookmarkedByMe = !!myBookmark;
    }
  }

  return NextResponse.json({
    board,
    post: {
      ...normalizedPost,
      view_count: usedRichFields ? (normalizedPost.view_count ?? 0) + 1 : 0,
      tags: definition.tags ? (normalizedPost.tags ?? []) : [],
      author_name: nameById.get(normalizedPost.author_id) ?? "알 수 없음",
      post_number: postNumber ?? null,
    },
    comments: (comments ?? []).map((c) => ({
      ...c,
      author_name: nameById.get(c.author_id) ?? "알 수 없음",
    })),
    likedByMe,
    bookmarkedByMe,
  });
}
