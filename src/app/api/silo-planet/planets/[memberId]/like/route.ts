import { NextRequest, NextResponse } from "next/server";
import { getRequestMember, getTier } from "@/lib/serverAuth";

// EPIC-161 Phase 2: 행성 좋아요 토글 — Great Gatsby(rank>=2)부터.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const tier = await getTier(requester.member.membership_rank);
  if (!requester.member.is_admin && (tier?.rank ?? -1) < 2) {
    return NextResponse.json(
      { error: "행성 좋아요는 Great Gatsby 등급부터 가능해요. 멤버십 가입 안내에서 등급을 올릴 수 있어요." },
      { status: 403 },
    );
  }

  const { data: existing } = await requester.scopedClient
    .from("planet_likes")
    .select("id")
    .eq("member_id", requester.member.id)
    .eq("planet_member_id", memberId)
    .maybeSingle();

  if (existing) {
    await requester.scopedClient.from("planet_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  }

  const { error } = await requester.scopedClient
    .from("planet_likes")
    .insert({ member_id: requester.member.id, planet_member_id: memberId });

  if (error) {
    return NextResponse.json({ error: "좋아요 처리에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ liked: true });
}
