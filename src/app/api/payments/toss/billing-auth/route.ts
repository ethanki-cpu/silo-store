import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import {
  customerKeyFor,
  paidTier,
  SUBSCRIPTION_POINT_PCT,
  rpc,
  tossRequest,
  TossConfigError,
} from "@/lib/tossServer";

// EPIC-158: 카드 등록(빌링 인증) 성공 후 호출 — authKey로 빌링키를 발급받아 member_billing에 저장하고
// 1회차 결제를 즉시 시도한다. 성공하면 구독한 등급(Alice/Great Gatsby/Patron/Lautrec)으로 membership_rank를
// 승급하고 points_ledger를 기록한다. 등급/금액은 tierRank로 받아 서버가 membership_tiers에서 다시 산출한다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  let body: { authKey?: string; customerKey?: string; tierRank?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }
  const { authKey, customerKey } = body;
  const tierRank = Number(body.tierRank);
  if (!authKey || !customerKey || !Number.isInteger(tierRank)) {
    return NextResponse.json({ error: "authKey/customerKey/tierRank가 필요해요." }, { status: 400 });
  }

  try {
    if (customerKey !== customerKeyFor(requester.member.id)) {
      return NextResponse.json({ error: "customerKey가 올바르지 않아요." }, { status: 403 });
    }

    const { data: existing } = await requester.scopedClient
      .from("member_billing")
      .select("status, tier_rank")
      .eq("member_id", requester.member.id)
      .maybeSingle();

    const tier = await paidTier(tierRank);
    if (!tier) return NextResponse.json({ error: "구독할 수 없는 등급이에요." }, { status: 400 });
    if (requester.member.membership_rank >= tier.rank && existing?.status !== "suspended") {
      return NextResponse.json({ error: "이미 그 등급 이상이에요." }, { status: 409 });
    }
    // HOTFIX-158.6(정책: 등급 변경은 다음 결제일부터 적용, 일할 계산 없음): 구독 중(active)이면 이 경로로 즉시 결제하지
    // 않는다 — 등급 변경은 /api/payments/toss/change-tier(예약), 해지는 /api/payments/toss/cancel.
    if (existing?.status === "active") {
      return NextResponse.json({ error: "이미 정기구독 중이에요. 등급 변경은 다음 결제일부터 적용돼요." }, { status: 409 });
    }
    const amount = tier.price;
    const { data: nameRow } = await requester.scopedClient.from("members").select("name").eq("id", requester.member.id).maybeSingle();
    const customerName = (nameRow as { name: string } | null)?.name;

    // 1) authKey → billingKey
    const issued = await tossRequest<{ billingKey: string; card?: { issuerCode?: string; number?: string; company?: string } }>(
      "/v1/billing/authorizations/issue",
      { authKey, customerKey },
    );
    if (!issued.ok) {
      return NextResponse.json({ error: `카드 등록에 실패했어요. (${issued.message})`, code: issued.code }, { status: 402 });
    }
    const billingKey = issued.data.billingKey;
    const card = issued.data.card ?? {};

    // 2) billing 저장(빌링키는 이후 어떤 클라이언트도 읽지 못한다 — member_billing 컬럼 권한 참고)
    const saved = await rpc("toss_save_billing", {
      p_member_id: requester.member.id,
      p_customer_key: customerKey,
      p_billing_key: billingKey,
      p_card_company: card.company ?? card.issuerCode ?? null,
      p_card_number: card.number ?? null,
      p_tier_rank: tier.rank,
    });
    if (saved.error) return NextResponse.json({ error: "카드 정보를 저장하지 못했어요.", detail: saved.error }, { status: 500 });

    // 3) 1회차 결제
    const orderId = `sub_${randomUUID()}`;
    const charged = await tossRequest<{ status?: string; paymentKey?: string }>(`/v1/billing/${billingKey}`, {
      customerKey,
      amount,
      orderId,
      orderName: `사일로 ${tier.name} 멤버십 정기구독`,
      customerName,
    });
    const ok = charged.ok && charged.data.status === "DONE";

    const recorded = await rpc("toss_record_charge", {
      p_member_id: requester.member.id,
      p_ok: ok,
      p_amount: amount,
      p_order_id: orderId,
      p_payment_key: charged.ok ? (charged.data.paymentKey ?? null) : null,
      p_failure_reason: ok ? null : charged.ok ? `status:${charged.data.status}` : `${charged.code}: ${charged.message}`,
      p_point_pct: SUBSCRIPTION_POINT_PCT,
    });
    if (recorded.error) {
      return NextResponse.json({ error: "결제 결과를 기록하지 못했어요.", detail: recorded.error, charged: ok }, { status: 500 });
    }

    if (!ok) {
      const message = charged.ok ? "결제가 승인되지 않았어요." : charged.message;
      return NextResponse.json({ error: `첫 결제에 실패했어요. (${message})`, status: "suspended" }, { status: 402 });
    }
    return NextResponse.json({ ok: true, tier_name: tier.name, membership_rank: Math.max(tier.rank, requester.member.membership_rank), amount });
  } catch (e) {
    if (e instanceof TossConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
