import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { steppayRequest, SteppayConfigError, steppayConfigured } from "@/lib/steppayServer";

// EPIC-159: 셀프 구독 해지 — 이미 결제한 기간이 끝날 때까지 등급을 유지하고 그 뒤 종료(END_OF_PERIOD, 환불 안내 정책과 동일).
// 구독 상태(PENDING_CANCEL → CANCELED)와 등급 강등은 스텝페이 웹훅이 반영한다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!steppayConfigured()) return NextResponse.json({ error: "결제 서비스가 아직 준비되지 않았어요." }, { status: 503 });

  try {
    const { data: sub } = await requester.scopedClient
      .from("steppay_subscriptions")
      .select("subscription_id, status")
      .eq("member_id", requester.member.id)
      .in("status", ["ACTIVE", "UNPAID", "PAUSE"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) return NextResponse.json({ error: "해지할 수 있는 구독이 없어요." }, { status: 409 });

    const cancelled = await steppayRequest("POST", `/api/v1/subscriptions/${sub.subscription_id}/cancel`, { whenToCancel: "END_OF_PERIOD" });
    if (!cancelled.ok) return NextResponse.json({ error: `해지하지 못했어요. (${cancelled.message})` }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SteppayConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
