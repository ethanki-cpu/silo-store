import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { paidTier, rpc, TossConfigError } from "@/lib/tossServer";

// HOTFIX-158.6: 구독 중 등급 변경(업그레이드/다운그레이드 모두) — 정책상 "다음 결제일부터" 적용이라
// 지금은 결제하지 않고 예약만 한다(현재 결제한 기간에는 기존 등급 유지, 일할 계산 없음).
// 요금은 서버가 지금 시점의 membership_tiers 가격을 "동의 가격"으로 저장하고, 크론은 그 이하 금액만 청구한다.
// { tierRank: 현재 구독 등급 } 을 보내면 예약을 해제한다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  let body: { tierRank?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }
  const tierRank = Number(body.tierRank);
  if (!Number.isInteger(tierRank)) return NextResponse.json({ error: "tierRank가 필요해요." }, { status: 400 });

  try {
    const tier = await paidTier(tierRank);
    if (!tier) return NextResponse.json({ error: "구독할 수 없는 등급이에요." }, { status: 400 });

    const { data: billing } = await requester.scopedClient
      .from("member_billing")
      .select("status, cancel_at_period_end, next_billing_date")
      .eq("member_id", requester.member.id)
      .maybeSingle();
    if (!billing || billing.status !== "active") return NextResponse.json({ error: "구독 중인 멤버십이 없어요." }, { status: 409 });
    if (billing.cancel_at_period_end) return NextResponse.json({ error: "해지가 예약돼 있어요. 해지를 철회한 뒤 등급을 바꿔 주세요." }, { status: 409 });

    const res = await rpc<number>("toss_set_pending_tier", { p_member_id: requester.member.id, p_tier: tier.rank, p_price: tier.price });
    if (res.error) return NextResponse.json({ error: "처리하지 못했어요.", detail: res.error }, { status: 500 });
    if (!res.data) return NextResponse.json({ error: "등급을 변경하지 못했어요." }, { status: 409 });
    return NextResponse.json({ ok: true, tier_name: tier.name, price: tier.price, effective_date: billing.next_billing_date });
  } catch (e) {
    if (e instanceof TossConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
