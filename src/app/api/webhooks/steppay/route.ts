import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { rpc, SteppayConfigError, tierRankForProductCode, verifySteppaySignature } from "@/lib/steppayServer";

// EPIC-159: 스텝페이 웹훅 v2 수신. 요청 규격 {timestamp, version, event, data}, 서명 헤더 `Steppay-Signature`.
// 처리 이벤트: subscription.created / subscription.updated → 구독 상태 저장 + members.membership_rank 승급·강등,
// payment.completed / payment.failed → 결제 기록(감사용, 등급은 구독 상태가 결정). 그 밖의 이벤트는 200으로 무시.
// 스텝페이는 전송 순서를 보장하지 않으므로 DB RPC가 오래된 이벤트(timestamp)를 무시하고, 같은 이벤트를 여러 번 받아도 결과가 같다(멱등).
export const runtime = "nodejs";

type SubscriptionData = {
  subscriptionId: number;
  status: string;
  customerId: number;
  nextPaymentDate?: string | null;
  endDate?: string | null;
  orderCode?: string | null;
  items?: { productCode?: string }[];
};

type PaymentData = {
  paymentId: number;
  customerId?: string | number | null;
  orderId?: string | number | null;
  status: string;
  paidAmount?: number | string | null;
  paidAt?: string | null;
  errorMessage?: string | null;
};

/** 스텝페이 LocalDateTime(타임존 없음, 한국 서버 시각)을 KST로 해석해 ISO로. */
function toIso(v?: string | null): string | null {
  if (!v) return null;
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}+09:00`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request: NextRequest) {
  const secret = process.env.STEPPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STEPPAY_WEBHOOK_SECRET 환경 변수가 설정되지 않았어요." }, { status: 500 });

  const rawBody = await request.text();
  if (!verifySteppaySignature(request.headers.get("steppay-signature"), rawBody, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { timestamp?: number; event?: string; data?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const event = payload.event ?? "";
  const eventTs = Number(payload.timestamp) || Math.floor(Date.now() / 1000);
  const hash = createHash("sha256").update(rawBody).digest("hex");
  const ack = (note: string) => NextResponse.json({ ok: true, note });

  try {
    if (event === "subscription.created" || event === "subscription.updated") {
      const d = payload.data as SubscriptionData;
      const productCodes = (d.items ?? []).map((i) => i.productCode).filter(Boolean);
      // EPIC-160: 상품 코드로 멤버십 등급(Alice/Great Gatsby/Patron/Lautrec)을 찾는다. 우리 멤버십 상품이 아니면 무시.
      let tierRank: number | null = null;
      for (const code of productCodes) {
        tierRank = await tierRankForProductCode(code);
        if (tierRank) break;
      }
      if (!tierRank) {
        await rpc("steppay_log_event", { p_hash: hash, p_event: event, p_note: "ignored: not a membership product" });
        return ack("ignored: not a membership product");
      }
      const applied = await rpc<string>("steppay_apply_subscription", {
        p_customer_id: Number(d.customerId),
        p_subscription_id: Number(d.subscriptionId),
        p_status: d.status,
        p_product_code: productCodes[0] ?? null,
        p_next: toIso(d.nextPaymentDate),
        p_end: toIso(d.endDate),
        p_order_code: d.orderCode ?? null,
        p_event_ts: eventTs,
        p_rank: tierRank,
      });
      if (applied.error) return NextResponse.json({ error: "apply failed", detail: applied.error }, { status: 500 });
      await rpc("steppay_log_event", { p_hash: hash, p_event: event, p_note: `${d.status} → ${applied.data}` });
      return ack(String(applied.data));
    }

    if (event === "payment.completed" || event === "payment.failed") {
      const d = payload.data as PaymentData;
      const recorded = await rpc<string>("steppay_record_payment", {
        p_customer_id: d.customerId == null ? null : Number(d.customerId),
        p_payment_id: Number(d.paymentId),
        p_status: d.status ?? (event === "payment.completed" ? "COMPLETE" : "FAILED"),
        p_amount: d.paidAmount == null ? null : Number(d.paidAmount),
        p_paid_at: toIso(d.paidAt),
        p_order_ref: d.orderId == null ? null : String(d.orderId),
        p_error: d.errorMessage ?? null,
        p_event_ts: eventTs,
      });
      if (recorded.error) return NextResponse.json({ error: "record failed", detail: recorded.error }, { status: 500 });
      await rpc("steppay_log_event", { p_hash: hash, p_event: event, p_note: String(recorded.data) });
      return ack(String(recorded.data));
    }

    await rpc("steppay_log_event", { p_hash: hash, p_event: event, p_note: "ignored: unhandled event" });
    return ack("ignored");
  } catch (e) {
    if (e instanceof SteppayConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
