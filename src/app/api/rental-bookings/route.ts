import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const rentalTypeId = body?.rentalTypeId as string | undefined;
  const bookingDate = body?.bookingDate as string | undefined;
  const hours = Number(body?.hours);
  const headcount = Number(body?.headcount);

  if (!rentalTypeId || !bookingDate) {
    return NextResponse.json(
      { error: "대관 종류와 날짜를 선택해주세요." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(hours) || hours < 1) {
    return NextResponse.json(
      { error: "시간 수는 1 이상의 정수여야 해요." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(headcount) || headcount < 1) {
    return NextResponse.json(
      { error: "인원 수는 1 이상의 정수여야 해요." },
      { status: 400 },
    );
  }

  const { data: rentalType, error: rentalTypeError } = await supabase
    .from("rental_types")
    .select(
      "id, floor, shoot_type, weekday_price, weekend_price, base_headcount, extra_person_hourly_fee",
    )
    .eq("id", rentalTypeId)
    .single();

  if (rentalTypeError || !rentalType) {
    return NextResponse.json(
      { error: "대관 종류를 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const dayOfWeek = new Date(`${bookingDate}T00:00:00`).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const basePricePerHour = isWeekend
    ? rentalType.weekend_price
    : rentalType.weekday_price;

  const hoursCost = basePricePerHour * hours;

  const extraPeople = Math.max(0, headcount - rentalType.base_headcount);
  const extraPeopleCost =
    extraPeople * rentalType.extra_person_hourly_fee * hours;

  const priceCharged = hoursCost + extraPeopleCost;

  const tier = await getTier(requester.member.membership_rank);
  if (!tier) {
    return NextResponse.json(
      { error: "등급 정보를 찾을 수 없어요." },
      { status: 500 },
    );
  }

  const pointEarned = Math.round(
    (priceCharged * tier.venue_rental_point_pct) / 100,
  );

  const { data: booking, error: insertError } = await requester.scopedClient
    .from("rental_bookings")
    .insert({
      member_id: requester.member.id,
      rental_type_id: rentalTypeId,
      booking_date: bookingDate,
      is_weekend: isWeekend,
      hours,
      headcount,
      price_charged: priceCharged,
      point_earned_pct: tier.venue_rental_point_pct,
      point_earned: pointEarned,
      payment_status: "pending_transfer",
    })
    .select()
    .single();

  if (insertError || !booking) {
    return NextResponse.json(
      { error: "예약 저장에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  if (pointEarned > 0) {
    await requester.scopedClient.from("points_ledger").insert({
      member_id: requester.member.id,
      reason: "venue_rental",
      points: pointEarned,
      related_id: booking.id,
    });
  }

  return NextResponse.json({
    floor: rentalType.floor,
    shoot_type: rentalType.shoot_type,
    booking_date: bookingDate,
    is_weekend: isWeekend,
    hours,
    headcount,
    price_charged: priceCharged,
    point_earned_pct: tier.venue_rental_point_pct,
    point_earned: pointEarned,
    payment_status: "pending_transfer",
  });
}
