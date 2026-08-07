import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { BOARD_RICH_FIELDS_EXT, BOARD_RICH_FIELDS, BOARD_LEGACY_FIELDS } from "@/lib/boardLayout";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  let { data: board, error } = await requester.scopedClient
    .from("boards")
    .select(BOARD_RICH_FIELDS_EXT)
    .eq("id", id)
    .single();

  if (error) {
    ({ data: board, error } = await requester.scopedClient
      .from("boards")
      .select(BOARD_RICH_FIELDS)
      .eq("id", id)
      .single());
  }

  if (error) {
    ({ data: board, error } = await requester.scopedClient
      .from("boards")
      .select(BOARD_LEGACY_FIELDS)
      .eq("id", id)
      .single());
  }

  if (error || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json(board);
}

// EPIC-066: 관리자가 편집 가능한 필드만 화이트리스트 — board_type(권한 축)/
// id는 여기로 못 바꾼다.
const EDITABLE_FIELDS = [
  "name",
  "category",
  "is_public",
  "group_key",
  "render_type",
  "default_card_type",
  "use_search",
  "use_like",
  "use_comment",
  "use_view_count",
  "default_page_size",
  "default_sort",
  "description",
  "widget_settings",
  "min_rank_to_write",
  "min_rank_to_read",
  "sort_order",
  "topic",
  "thumbnail_url",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) patch[field] = body[field];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 값이 없어요." }, { status: 400 });
  }

  if (typeof patch.category === "string") {
    const { data: existing } = await requester.scopedClient
      .from("boards")
      .select("id")
      .eq("category", patch.category)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 슬러그예요." }, { status: 409 });
    }
  }

  const { data: board, error } = await requester.scopedClient
    .from("boards")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error || !board) {
    return NextResponse.json(
      { error: "게시판 수정에 실패했어요.", detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(board);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  const { error } = await requester.scopedClient.from("boards").delete().eq("id", id);

  if (error) {
    // 23503 = foreign key violation — 이 게시판에 글이 남아있으면
    // posts.board_id 참조 때문에 삭제가 막힌다(schema에 on delete cascade
    // 없음, 의도적 — 게시글 유실 방지).
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "이 게시판에는 게시글이 있어 삭제할 수 없어요. 먼저 게시글을 모두 정리해주세요." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "게시판 삭제에 실패했어요.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: true });
}
