import { NextRequest, NextResponse } from "next/server";
import { rpc, tossRequest, TossConfigError } from "@/lib/tossServer";

// EPIC-158: 도슨트 단건 결제 successUrl — 토스가 브라우저를 리다이렉트하므로 Authorization 헤더가 없다.
// 신원 대신 (1) 추측 불가능한 구매 id(orderId=docent_<uuid>), (2) DB에 저장된 서버 산출 금액과의 일치,
// (3) 토스 승인 API 성공을 모두 만족할 때만 confirmed로 확정한다(확정 쓰기는 비밀 검증 RPC).
type PurchaseRow = { id: string; member_id: string; content_id: string; price_charged: number; payment_status: string };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = Number(searchParams.get("amount"));
  const back = (path: string) => NextResponse.redirect(new URL(path, origin));

  const purchaseId = orderId?.startsWith("docent_") ? orderId.slice("docent_".length) : null;
  if (!paymentKey || !orderId || !purchaseId || !Number.isFinite(amount)) return back("/docent?payment=failed");

  try {
    const found = await rpc<PurchaseRow[]>("toss_get_docent_purchase", { p_purchase_id: purchaseId });
    const purchase = found.data?.[0];
    if (!purchase) return back("/docent?payment=failed");
    const contentPath = `/docent/${purchase.content_id}`;

    if (purchase.payment_status === "confirmed") return back(`${contentPath}?payment=success`);
    if (purchase.price_charged !== amount) return back(`${contentPath}?payment=failed&reason=amount`);

    const confirmed = await tossRequest("/v1/payments/confirm", { paymentKey, orderId, amount });
    if (!confirmed.ok) {
      return back(`${contentPath}?payment=failed&reason=${encodeURIComponent(confirmed.message)}`);
    }

    const done = await rpc("toss_confirm_docent_purchase", {
      p_purchase_id: purchaseId,
      p_payment_key: paymentKey,
      p_order_id: orderId,
    });
    if (done.error) return back(`${contentPath}?payment=failed&reason=record`);
    return back(`${contentPath}?payment=success`);
  } catch (e) {
    if (e instanceof TossConfigError) return back("/docent?payment=failed&reason=config");
    throw e;
  }
}
