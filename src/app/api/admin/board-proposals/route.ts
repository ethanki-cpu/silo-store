import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-161 Phase 2: 관리자 제안 수신함 — 게시판/작성자 이름까지 붙여서 반환한다.
export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  const { data: proposals, error } = await requester.scopedClient
    .from("board_proposals")
    .select("id, member_id, board_id, post_id, kind, body, status, created_at, reviewed_at")
    .order("created_at", { ascending: false });

  if (error || !proposals) {
    return NextResponse.json({ error: "제안 목록을 불러오지 못했어요." }, { status: 500 });
  }

  const boardIds = [...new Set(proposals.map((p) => p.board_id))];
  const memberIds = [...new Set(proposals.map((p) => p.member_id))];

  const [{ data: boards }, { data: members }] = await Promise.all([
    boardIds.length > 0
      ? requester.scopedClient.from("boards").select("id, name").in("id", boardIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    memberIds.length > 0
      ? requester.scopedClient.from("public_profiles").select("id, name").in("id", memberIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const boardNameById = new Map((boards ?? []).map((b) => [b.id, b.name]));
  const memberNameById = new Map((members ?? []).map((m) => [m.id, m.name]));

  return NextResponse.json(
    proposals.map((p) => ({
      ...p,
      board_name: boardNameById.get(p.board_id) ?? "알 수 없음",
      member_name: memberNameById.get(p.member_id) ?? "알 수 없음",
    })),
  );
}
