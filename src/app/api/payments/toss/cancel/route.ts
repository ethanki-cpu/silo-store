import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { rpc, TossConfigError } from "@/lib/tossServer";

// HOTFIX-158.6: 셀프 구독 해지(기간 만료 시 종료). { cancel: true } = 해지 예약, { cancel: false } = 해지 철회.
// 이미 결제한 기간이 끝날 때까지 등급은 유지되고, 다음 결제일에 크론이 구독을 종료(기본 등급 전환)한다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  let body: { cancel?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }
  const cancel = body.cancel !== false;

  try {
    const res = await rpc<number>("toss_request_cancel", { p_member_id: requester.member.id, p_cancel: cancel });
    if (res.error) return NextResponse.json({ error: "처리하지 못했어요.", detail: res.error }, { status: 500 });
    if (!res.data) return NextResponse.json({ error: "구독 중인 멤버십이 없어요." }, { status: 409 });
    return NextResponse.json({ ok: true, cancel });
  } catch (e) {
    if (e instanceof TossConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
