import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Tier = {
  rank: number;
  club_all_free: boolean;
  club_monthly_free_sessions: number;
  club_participation_discount_pct: number;
  club_point_pct: number;
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
  const sessionId = body?.sessionId as string | undefined;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId가 필요해요." },
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

  const { data: session, error: sessionError } = await supabase
    .from("club_sessions")
    .select("id, session_date, status, clubs(id, name, base_price)")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "신청 가능한 세션을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  if (session.status !== "open") {
    return NextResponse.json(
      { error: "마감되었거나 취소된 세션이에요." },
      { status: 400 },
    );
  }

  const club = session.clubs as unknown as {
    id: string;
    name: string;
    base_price: number;
  };

  const { data: existing } = await scopedClient
    .from("reservations")
    .select("id")
    .eq("member_id", member.id)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "이미 신청한 세션이에요." },
      { status: 409 },
    );
  }

  const { data: tier } = await supabase
    .from("membership_tiers")
    .select(
      "rank, club_all_free, club_monthly_free_sessions, club_participation_discount_pct, club_point_pct",
    )
    .eq("rank", member.membership_rank)
    .single<Tier>();

  if (!tier) {
    return NextResponse.json(
      { error: "등급 정보를 찾을 수 없어요." },
      { status: 500 },
    );
  }

  let priceCharged = club.base_price;
  let discountAppliedPct = 0;
  let pointEarned = 0;
  let isMonthlyFreePick = false;
  let paymentStatus: "confirmed" | "pending_transfer" = "pending_transfer";

  if (tier.club_all_free) {
    priceCharged = 0;
    paymentStatus = "confirmed";
  } else {
    let freePickAvailable = false;

    if (tier.club_monthly_free_sessions > 0) {
      const now = new Date();
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      const { count } = await scopedClient
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("member_id", member.id)
        .eq("is_monthly_free_pick", true)
        .gte("created_at", monthStart);

      freePickAvailable = (count ?? 0) < tier.club_monthly_free_sessions;
    }

    if (freePickAvailable) {
      priceCharged = 0;
      isMonthlyFreePick = true;
      paymentStatus = "confirmed";
    } else {
      discountAppliedPct = tier.club_participation_discount_pct || 0;
      priceCharged = Math.round(
        club.base_price * (1 - discountAppliedPct / 100),
      );
      pointEarned = Math.round(
        (club.base_price * (tier.club_point_pct || 0)) / 100,
      );
      paymentStatus = "pending_transfer";
    }
  }

  const { data: reservation, error: insertError } = await scopedClient
    .from("reservations")
    .insert({
      member_id: member.id,
      session_id: sessionId,
      price_charged: priceCharged,
      discount_applied_pct: discountAppliedPct,
      point_earned: pointEarned,
      is_monthly_free_pick: isMonthlyFreePick,
      payment_status: paymentStatus,
    })
    .select()
    .single();

  if (insertError || !reservation) {
    return NextResponse.json(
      { error: "신청 저장에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    club_name: club.name,
    session_date: session.session_date,
    price_charged: priceCharged,
    discount_applied_pct: discountAppliedPct,
    point_earned: pointEarned,
    is_monthly_free_pick: isMonthlyFreePick,
    payment_status: paymentStatus,
  });
}
