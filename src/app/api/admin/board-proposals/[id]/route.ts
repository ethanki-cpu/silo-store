import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

const STATUSES = ["pending", "resolved", "dismissed"] as const;

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
  const status = body?.status as string | undefined;
  if (!status || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: "잘못된 상태예요." }, { status: 400 });
  }

  const { data: updated, error } = await requester.scopedClient
    .from("board_proposals")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: requester.member.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "처리에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json(updated);
}
