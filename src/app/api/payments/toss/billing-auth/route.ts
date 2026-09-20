import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import {
  customerKeyFor,
  patronPrice,
  PATRON_RANK,
  PATRON_SUBSCRIPTION_POINT_PCT,
  rpc,
  tossRequest,
  TossConfigError,
} from "@/lib/tossServer";

// EPIC-158: 카드 등록(빌링 인증) 성공 후 호출 — authKey로 빌링키를 발급받아 member_billing에 저장하고
// 1회차 결제를 즉시 시도한다. 성공하면 membership_rank를 3(Patron)으로 승급하고 points_ledger를 기록한다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  let body: { authKey?: string; customerKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }
  const { authKey, customerKey } = body;
  if (!authKey || !customerKey) {
    return NextResponse.json({ error: "authKey/customerKey가 필요해요." }, { status: 400 });
  }

  try {
    if (customerKey !== customerKeyFor(requester.member.id)) {
      return NextResponse.json({ error: "customerKey가 올바르지 않아요." }, { status: 403 });
    }

    const { data: existing } = await requester.scopedClient
      .from("member_billing")
      .select("status")
      .eq("member_id", requester.member.id)
      .maybeSingle();
    if (existing?.status === "active") {
      return NextResponse.json({ error: "이미 정기구독 중이에요." }, { status: 409 });
    }

    const amount = await patronPrice();
    if (!amount) return NextResponse.json({ error: "구독 금액을 확인할 수 없어요." }, { status: 500 });
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
    });
    if (saved.error) return NextResponse.json({ error: "카드 정보를 저장하지 못했어요.", detail: saved.error }, { status: 500 });

    // 3) 1회차 결제
    const orderId = `sub_${randomUUID()}`;
    const charged = await tossRequest<{ status?: string; paymentKey?: string }>(`/v1/billing/${billingKey}`, {
      customerKey,
      amount,
      orderId,
      orderName: "사일로 Patron 멤버십 정기구독",
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
      p_point_pct: PATRON_SUBSCRIPTION_POINT_PCT,
    });
    if (recorded.error) {
      return NextResponse.json({ error: "결제 결과를 기록하지 못했어요.", detail: recorded.error, charged: ok }, { status: 500 });
    }

    if (!ok) {
      const message = charged.ok ? "결제가 승인되지 않았어요." : charged.message;
      return NextResponse.json({ error: `첫 결제에 실패했어요. (${message})`, status: "suspended" }, { status: 402 });
    }
    return NextResponse.json({ ok: true, membership_rank: Math.max(PATRON_RANK, requester.member.membership_rank), amount });
  } catch (e) {
    if (e instanceof TossConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
