import { NextRequest, NextResponse } from "next/server";
import { getRequestMember, getTier } from "@/lib/serverAuth";

// EPIC-161 Phase 2: 실로플래닛에 행성/별/모션 추가 제안 — Lautrec(rank>=4)부터.
// board_proposals를 board_id=null(게시판과 무관), kind='planet'으로 재사용한다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const tier = await getTier(requester.member.membership_rank);
  if (!requester.member.is_admin && (tier?.rank ?? -1) < 4) {
    return NextResponse.json(
      { error: "실로플래닛 제안은 Lautrec 등급부터 가능해요. 멤버십 가입 안내에서 등급을 올릴 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const proposalBody = (body?.body as string | undefined)?.trim();
  if (!proposalBody) {
    return NextResponse.json({ error: "제안 내용을 입력해주세요." }, { status: 400 });
  }

  const { data: proposal, error } = await requester.scopedClient
    .from("board_proposals")
    .insert({ member_id: requester.member.id, board_id: null, kind: "planet", body: proposalBody })
    .select()
    .single();

  if (error || !proposal) {
    return NextResponse.json({ error: "제안 제출에 실패했어요.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json(proposal);
}
