import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-071: 관리자가 회원 정보(이름/등급/관리자 여부)를 수정.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 접근할 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const membershipRank =
    typeof body?.membership_rank === "number" ? body.membership_rank : undefined;
  const isAdmin = typeof body?.is_admin === "boolean" ? body.is_admin : undefined;

  // 본인의 마지막 관리자 권한을 스스로 해제해 관리자가 아예 없는 상태로
  // 빠지는 걸 막는다 — 다른 관리자가 대상이면 허용(관리자 여러 명 가능).
  if (isAdmin === false && id === requester.member.id) {
    return NextResponse.json(
      { error: "본인의 관리자 권한은 스스로 해제할 수 없어요." },
      { status: 400 },
    );
  }

  if (name === undefined && membershipRank === undefined && isAdmin === undefined) {
    return NextResponse.json(
      { error: "수정할 값이 없어요." },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (membershipRank !== undefined) update.membership_rank = membershipRank;
  if (isAdmin !== undefined) update.is_admin = isAdmin;

  const { data: updated, error } = await requester.scopedClient
    .from("members")
    .update(update)
    .eq("id", id)
    .select("id, name, email, membership_rank, is_admin, joined_at, membership_started_at")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: "회원 정보를 수정하지 못했어요.", detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(updated);
}
