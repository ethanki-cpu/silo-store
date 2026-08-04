import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";

// Board Engine(EPIC-047): 북마크 토글 — likes/route.ts와 동일한 own-row
// 토글 패턴이지만 like_count 동기화나 포인트 적립이 없어 더 단순하다.
// post_bookmarks가 라이브 DB에 아직 없으면(마이그레이션 전) 502 대신
// 사용자에게 안내 메시지를 보여준다.
// EPIC-079-PHASE-2: URL이 slug로 바뀌면서, posts.slug가 board별로만
// UNIQUE라 실제 post_id를 알려면 먼저 board를 slug로 찾아 board_id를
// 얻은 뒤 (board_id, post_slug)로 실제 게시글을 조회해야 한다.
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

  const { data: existing, error: selectError } = await requester.scopedClient
    .from("post_bookmarks")
    .select("id")
    .eq("post_id", postId)
    .eq("member_id", requester.member.id)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json(
      { error: "북마크 기능을 아직 사용할 수 없어요." },
      { status: 503 },
    );
  }

  if (existing) {
    await requester.scopedClient
      .from("post_bookmarks")
      .delete()
      .eq("id", existing.id);

    return NextResponse.json({ bookmarked: false });
  }

  await requester.scopedClient
    .from("post_bookmarks")
    .insert({ post_id: postId, member_id: requester.member.id });

  return NextResponse.json({ bookmarked: true });
}
