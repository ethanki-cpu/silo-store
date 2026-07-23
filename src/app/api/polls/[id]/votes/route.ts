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

  const body = await request.json();
  const optionId = body?.optionId as string | undefined;

  if (!optionId) {
    return NextResponse.json(
      { error: "선택지를 골라주세요." },
      { status: 400 },
    );
  }

  const { data: option } = await requester.scopedClient
    .from("poll_options")
    .select("id, poll_id")
    .eq("id", optionId)
    .eq("poll_id", id)
    .single();

  if (!option) {
    return NextResponse.json(
      { error: "유효하지 않은 선택지예요." },
      { status: 400 },
    );
  }

  const { error: insertError } = await requester.scopedClient
    .from("poll_votes")
    .insert({
      poll_id: id,
      option_id: optionId,
      member_id: requester.member.id,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "이미 투표하셨어요." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "투표에 실패했어요.", detail: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
