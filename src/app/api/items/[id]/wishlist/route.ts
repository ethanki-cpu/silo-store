import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: existing } = await requester.scopedClient
    .from("wishlists")
    .select("id")
    .eq("item_id", id)
    .eq("member_id", requester.member.id)
    .maybeSingle();

  if (existing) {
    await requester.scopedClient
      .from("wishlists")
      .delete()
      .eq("id", existing.id);

    return NextResponse.json({ wishlisted: false });
  }

  const { error: insertError } = await requester.scopedClient
    .from("wishlists")
    .insert({ item_id: id, member_id: requester.member.id });

  if (insertError) {
    return NextResponse.json(
      { error: "찜하기에 실패했어요.", detail: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ wishlisted: true });
}
