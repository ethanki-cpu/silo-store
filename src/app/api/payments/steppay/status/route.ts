import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { steppayConfigured } from "@/lib/steppayServer";

// EPIC-159: 내 스텝페이 구독 상태(본인 행만 RLS로 읽음). 결제 결과 페이지와 멤버십 화면이 사용한다.
export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data } = await requester.scopedClient
    .from("steppay_subscriptions")
    .select("subscription_id, status, next_payment_date, end_date, updated_at")
    .eq("member_id", requester.member.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    enabled: steppayConfigured(),
    subscription: data ?? null,
    membership_rank: requester.member.membership_rank,
  });
}
