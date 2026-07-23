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

  let priceCharged = content.price;
  let discountAppliedPct = 0;
  let isMonthlyFree = false;
  let paymentStatus: "confirmed" | "pending_transfer" = "pending_transfer";

  if (tier.docent_free_only) {
    priceCharged = content.price;
    paymentStatus = "pending_transfer";
  } else {
    let freeAvailable = false;

    if (tier.docent_monthly_free_count > 0) {
      const now = new Date();
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      const { count } = await requester.scopedClient
        .from("docent_purchases")
        .select("id", { count: "exact", head: true })
        .eq("member_id", requester.member.id)
        .eq("is_monthly_free", true)
        .gte("purchased_at", monthStart);

      freeAvailable = (count ?? 0) < tier.docent_monthly_free_count;
    }

    if (freeAvailable) {
      priceCharged = 0;
      isMonthlyFree = true;
      paymentStatus = "confirmed";
    } else {
      discountAppliedPct = tier.docent_per_item_discount_pct || 0;
      priceCharged = Math.round(
        content.price * (1 - discountAppliedPct / 100),
      );
      paymentStatus = "pending_transfer";
    }
  }

  const { data: purchase, error: insertError } = await requester.scopedClient
    .from("docent_purchases")
    .insert({
      member_id: requester.member.id,
      content_id: contentId,
      price_charged: priceCharged,
      discount_applied_pct: discountAppliedPct,
      is_monthly_free: isMonthlyFree,
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
    is_monthly_free: isMonthlyFree,
    payment_status: paymentStatus,
    needs_agreement_notice: tier.docent_needs_agreement,
  });
}
