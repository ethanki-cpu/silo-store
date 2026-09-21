import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { paidTier, rpc, SUBSCRIPTION_POINT_PCT, tossRequest, TossConfigError } from "@/lib/tossServer";

// HOTFIX-158.6: 월 자동 청구 크론(vercel.json — 매일 1회). Vercel Cron이 CRON_SECRET 환경 변수를
// `Authorization: Bearer <값>`으로 붙여 호출한다. 처리 순서:
//  1) 기간이 끝난 해지 예약을 확정(구독 종료 + 기본 등급 전환)
//  2) 오늘 청구일이 된 구독을 빌링키로 결제 — 청구 등급은 예약된 변경 등급이 있으면 그 등급(다음 결제일부터 적용 정책),
//     금액은 min(동의 가격, 현재 가격)이라 회원이 동의하지 않은 요금 인상은 청구되지 않는다.
//  3) 실패하면 1일/3일/5일 뒤 재시도(총 3회), 4번째 실패에서 일시 중지 + 기본 등급 전환(DB 함수 toss_record_recurring).
type Due = {
  member_id: string;
  customer_key: string;
  toss_billing_key: string;
  tier_rank: number;
  pending_tier_rank: number | null;
  agreed_price: number | null;
  pending_agreed_price: number | null;
  failed_count: number;
  member_name: string | null;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const finalized = await rpc<number>("toss_finalize_cancellations", {});
    if (finalized.error) return NextResponse.json({ error: "해지 확정 실패", detail: finalized.error }, { status: 500 });

    const due = await rpc<Due[]>("toss_due_billings", {});
    if (due.error) return NextResponse.json({ error: "청구 대상 조회 실패", detail: due.error }, { status: 500 });

    const summary = { finalizedCancellations: finalized.data ?? 0, due: due.data?.length ?? 0, charged: 0, failed: 0, skipped: 0 };
    for (const row of due.data ?? []) {
      const targetRank = row.pending_tier_rank ?? row.tier_rank;
      const agreed = row.pending_tier_rank ? row.pending_agreed_price : row.agreed_price;
      const tier = await paidTier(targetRank);
      if (!tier || !agreed) {
        // 유료 등급이 아니게 됐거나 동의 가격이 없으면(비정상) 청구하지 않고 실패로 기록해 재시도/중지 흐름에 태운다.
        await rpc("toss_record_recurring", {
          p_member_id: row.member_id, p_ok: false, p_amount: 0, p_tier_rank: targetRank, p_order_id: null,
          p_payment_key: null, p_failure_reason: "INVALID_TIER_OR_NO_AGREED_PRICE", p_point_pct: 0,
        });
        summary.skipped++;
        continue;
      }
      const amount = Math.min(agreed, tier.price);
      const orderId = `sub_${randomUUID()}`;
      const charged = await tossRequest<{ status?: string; paymentKey?: string }>(`/v1/billing/${row.toss_billing_key}`, {
        customerKey: row.customer_key,
        amount,
        orderId,
        orderName: `사일로 ${tier.name} 멤버십 정기구독`,
        customerName: row.member_name ?? undefined,
      });
      const ok = charged.ok && charged.data.status === "DONE";
      await rpc("toss_record_recurring", {
        p_member_id: row.member_id,
        p_ok: ok,
        p_amount: amount,
        p_tier_rank: tier.rank,
        p_order_id: orderId,
        p_payment_key: charged.ok ? (charged.data.paymentKey ?? null) : null,
        p_failure_reason: ok ? null : charged.ok ? `status:${charged.data.status}` : `${charged.code}: ${charged.message}`,
        p_point_pct: SUBSCRIPTION_POINT_PCT,
      });
      if (ok) summary.charged++;
      else summary.failed++;
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    if (e instanceof TossConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
