import { NextRequest, NextResponse } from "next/server";
import { getRequestMember, getTier, canProposeOnBoard } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";

// EPIC-161 Phase 2: "제안" 제출 — 글쓰기보다 약한 권한(카테고리 제안/글쓰기
// 제안/게시글 삭제 제안 등)을 가벼운 제출함에 담는다. 실제 반영은 관리자가
// /admin/board-proposals에서 수동으로 처리(자동 실행 워크플로 없음).
const KINDS = ["write", "category", "delete_post", "other"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string }> },
) {
  const { board_slug: boardSlug } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { board, boardError } = await fetchBoard(boardSlug);
  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const tier = await getTier(requester.member.membership_rank);
  const proposeCheck = canProposeOnBoard(board, tier, requester.member.is_admin);
  if (!proposeCheck.ok) {
    return NextResponse.json({ error: proposeCheck.error }, { status: 403 });
  }

  const body = await request.json();
  const proposalBody = (body?.body as string | undefined)?.trim();
  const kindRaw = body?.kind as string | undefined;
  const kind = KINDS.includes(kindRaw as (typeof KINDS)[number]) ? kindRaw : "other";
  const postId = (body?.postId as string | undefined) || null;

  if (!proposalBody) {
    return NextResponse.json({ error: "제안 내용을 입력해주세요." }, { status: 400 });
  }

  const { data: proposal, error: insertError } = await requester.scopedClient
    .from("board_proposals")
    .insert({
      member_id: requester.member.id,
      board_id: (board as { id: string }).id,
      post_id: postId,
      kind,
      body: proposalBody,
    })
    .select()
    .single();

  if (insertError || !proposal) {
    return NextResponse.json(
      { error: "제안 제출에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(proposal);
}
