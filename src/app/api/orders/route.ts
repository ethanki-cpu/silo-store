import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Tier = {
  rank: number;
  shop_purchase_point_pct: number;
  shop_purchase_discount_pct: number;
  shop_rental_point_pct: number;
  shop_rental_discount_pct: number;
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const itemId = body?.itemId as string | undefined;
  const orderType = body?.orderType as "purchase" | "rental" | undefined;
  const rentalDays = body?.rentalDays as number | undefined;

  if (!itemId || (orderType !== "purchase" && orderType !== "rental")) {
    return NextResponse.json(
      { error: "itemId와 orderType(purchase|rental)이 필요해요." },
      { status: 400 },
    );
  }

  if (
    orderType === "rental" &&
    (!Number.isInteger(rentalDays) || (rentalDays as number) < 1)
  ) {
    return NextResponse.json(
      { error: "대여 일수는 1 이상의 정수여야 해요." },
      { status: 400 },
    );
  }

  const scopedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: member } = await scopedClient
    .from("members")
    .select("id, membership_rank")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (!member) {
    return NextResponse.json(
      { error: "회원 정보를 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, name, price, rental_price_per_day, status")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return NextResponse.json(
      { error: "물품을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  if (item.status !== "available") {
    return NextResponse.json(
      { error: "지금은 구매/대여할 수 없는 물품이에요." },
      { status: 400 },
    );
  }

  const { data: tier } = await supabase
    .from("membership_tiers")
    .select(
      "rank, shop_purchase_point_pct, shop_purchase_discount_pct, shop_rental_point_pct, shop_rental_discount_pct",
    )
    .eq("rank", member.membership_rank)
    .single<Tier>();

  if (!tier) {
    return NextResponse.json(
      { error: "등급 정보를 찾을 수 없어요." },
      { status: 500 },
    );
  }

  const basePrice =
    orderType === "purchase"
      ? item.price
      : item.rental_price_per_day * (rentalDays as number);

  const discountPct =
    orderType === "purchase"
      ? tier.shop_purchase_discount_pct
      : tier.shop_rental_discount_pct;

  const pointPct =
    orderType === "purchase"
      ? tier.shop_purchase_point_pct
      : tier.shop_rental_point_pct;

  const priceCharged = Math.round(basePrice * (1 - (discountPct || 0) / 100));
  const pointEarned = Math.round((basePrice * (pointPct || 0)) / 100);

  const { data: order, error: insertError } = await scopedClient
    .from("orders")
    .insert({
      member_id: member.id,
      item_id: itemId,
      order_type: orderType,
      rental_days: orderType === "rental" ? rentalDays : null,
      price_charged: priceCharged,
      discount_applied_pct: discountPct || 0,
      point_earned: pointEarned,
      payment_status: "pending_transfer",
    })
    .select()
    .single();

  if (insertError || !order) {
    return NextResponse.json(
      { error: "주문 저장에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  if (pointEarned > 0) {
    await scopedClient.from("points_ledger").insert({
      member_id: member.id,
      reason: orderType === "purchase" ? "shop_purchase" : "shop_rental",
      points: pointEarned,
      related_id: order.id,
    });
  }

  return NextResponse.json({
    item_name: item.name,
    order_type: orderType,
    rental_days: orderType === "rental" ? rentalDays : null,
    price_charged: priceCharged,
    discount_applied_pct: discountPct || 0,
    point_earned: pointEarned,
    payment_status: "pending_transfer",
  });
}
