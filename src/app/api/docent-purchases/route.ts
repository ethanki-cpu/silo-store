import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const contentId = body?.contentId as string | undefined;

  if (!contentId) {
    return NextResponse.json(
      { error: "contentId가 필요해요." },
      { status: 400 },
    );
  }

  const { data: content, error: contentError } = await supabase
    .from("docent_contents")
    .select("id, price, is_free")
    .eq("id", contentId)
    .single();

  if (contentError || !content) {
    return NextResponse.json(
      { error: "콘텐츠를 찾을 수 없어요." },
      { status: 404 },
    );
  }

  if (content.is_free) {
    return NextResponse.json(
      { error: "무료 콘텐츠는 구매가 필요 없어요." },
      { status: 400 },
    );
  }

  const { data: existing } = await requester.scopedClient
    .from("docent_purchases")
    .select("id")
    .eq("content_id", contentId)
    .eq("member_id", requester.member.id)
    .eq("payment_status", "confirmed")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "이미 구매한 콘텐츠예요." },
      { status: 409 },
    );
  }

  const tier = await getTier(requester.member.membership_rank);
  if (!tier) {
    return NextResponse.json(
      { error: "등급 정보를 찾을 수 없어요." },
      { status: 500 },
    );
  }

  // HOTFIX-161.7(사용자 지시): 콘텐츠 정가와 무관하게 등급별 고정가를
  // 받고(docent_flat_price — Silo Angel 2000원/그 외 유료 등급 1000원),
  // 등급별 하루 무료 열람 건수(docent_daily_free_count)까지는 무료다.
  // docent_monthly_free_count/docent_per_item_discount_pct/docent_free_only
  // 는 더 이상 이 계산에 쓰이지 않는다(serverAuth.ts 참고).
  const flatPrice = tier.docent_flat_price ?? content.price;
  let priceCharged = flatPrice;
  const discountAppliedPct = 0;
  let isDailyFree = false;
  // EPIC-158: 유료 도슨트는 토스페이먼츠 단건 결제 — 결제 완료 전까지 pending_payment(계좌이체 대기가 아님).
  let paymentStatus: "confirmed" | "pending_payment" = "pending_payment";

  if (tier.docent_daily_free_count > 0) {
    // HOTFIX-161.7: 자정(KST, UTC+9) 기준 오늘 하루 무료 건수만 센다 —
    // post_views의 daily_view_limits와 같은 자정 기준 계산.
    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStartUtc = new Date(
      Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate()) - 9 * 60 * 60 * 1000,
    ).toISOString();

    const { count } = await requester.scopedClient
      .from("docent_purchases")
      .select("id", { count: "exact", head: true })
      .eq("member_id", requester.member.id)
      .eq("is_daily_free", true)
      .gte("purchased_at", todayStartUtc);

    if ((count ?? 0) < tier.docent_daily_free_count) {
      priceCharged = 0;
      isDailyFree = true;
      paymentStatus = "confirmed";
    }
  }

  const { data: purchase, error: insertError } = await requester.scopedClient
    .from("docent_purchases")
    .insert({
      member_id: requester.member.id,
      content_id: contentId,
      price_charged: priceCharged,
      discount_applied_pct: discountAppliedPct,
      is_monthly_free: false,
      is_daily_free: isDailyFree,
      payment_status: paymentStatus,
    })
    .select()
    .single();

  if (insertError || !purchase) {
    return NextResponse.json(
      { error: "구매 저장에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    price_charged: priceCharged,
    discount_applied_pct: discountAppliedPct,
    is_monthly_free: false,
    is_daily_free: isDailyFree,
    payment_status: paymentStatus,
    purchase_id: purchase.id,
    order_id: `docent_${purchase.id}`,
    needs_agreement_notice: tier.docent_needs_agreement,
  });
}
