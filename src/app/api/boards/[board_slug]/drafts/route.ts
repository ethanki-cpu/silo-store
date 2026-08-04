// EPIC-053: 임시 저장(Draft) API
// - 로컬 스토리지 기반 (클라이언트)
// - 서버 사이드 임시 저장도 지원 (향후 확장)
// - 자동 저장된 내용을 복구할 수 있음

import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { supabase } from "@/lib/supabaseClient";
import { fetchBoard } from "@/lib/boardFetch";

// GET: 임시 저장본 조회
// EPIC-079-PHASE-2: URL이 board_slug로 바뀌면서 posts.board_id(실제 UUID)를
// 얻으려면 먼저 board를 slug로 조회해야 한다.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string }> },
) {
  const { board_slug: boardSlug } = await params;

  const { board, boardError } = await fetchBoard(boardSlug);
  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }
  const boardId = (board as { id: string }).id;

  // 현재 사용자 확인 (익명도 가능)
  const requester = await getRequestMember(request);

  // draft_status 조회는 boards 테이블에서 board_id로 조회
  // 임시 저장본은 posts 테이블에 is_draft 플래그로 저장
  const { data: drafts, error } = await supabase
    .from("posts")
    .select("id, title, body, created_at, updated_at")
    .eq("board_id", boardId)
    .eq("author_id", requester?.member?.id ?? "")
    .eq("visibility", "draft") // 임시 저장 표시용
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drafts: drafts ?? [] });
}

// POST: 임시 저장 생성/업데이트
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string }> },
) {
  const { board_slug: boardSlug } = await params;

  // 현재 사용자 확인
  const requester = await getRequestMember(request);
  if (!requester?.member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, draftId } = body;

  // draftId가 있으면 업데이트, 없으면 생성
  if (draftId) {
    const { data, error } = await supabase
      .from("posts")
      .update({
        title: title ?? "",
        body: content ?? "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .eq("author_id", requester.member.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ draft: data });
  } else {
    const { board, boardError } = await fetchBoard(boardSlug);
    if (boardError || !board) {
      return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
    }

    // 새 임시 저장
    const { data, error } = await supabase
      .from("posts")
      .insert({
        board_id: (board as { id: string }).id,
        author_id: requester.member.id,
        title: title ?? "",
        body: content ?? "",
        visibility: "draft",
        like_count: 0,
        is_best: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ draft: data });
  }
}

// DELETE: 임시 저장 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string }> },
) {
  // params에서 boardSlug 추출 (경로 파라미터지만 실제로는 draftId로 식별)
  await params;

  // 현재 사용자 확인
  const requester = await getRequestMember(request);
  if (!requester?.member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const draftId = searchParams.get("draftId");

  if (!draftId) {
    return NextResponse.json({ error: "draftId가 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", draftId)
    .eq("author_id", requester.member.id)
    .eq("visibility", "draft");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
