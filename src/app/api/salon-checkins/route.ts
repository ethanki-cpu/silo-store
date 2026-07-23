import { NextRequest, NextResponse } from "next/server";
import { getRequestMember, getTier } from "@/lib/serverAuth";

const DEFAULT_HOURS = 1;

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const guestCount = Number(body?.guestCount ?? 0) || 0;

  const tier = await getTier(requester.member.membership_rank);
  if (!tier) {
    return NextResponse.json(
      { error: "등급 정보를 찾을 수 없어요." },
      { status: 500 },
    );
  }

  // hours는 지금은 기본 1시간 고정. 나중에 체크아웃 기능이 생기면
  // 그때 실제 이용 시간으로 다시 계산해서 업데이트하면 됨.
  const hours = DEFAULT_HOURS;
  const feeCharged = tier.salon_entry_free
    ? 0
    : tier.salon_entry_hourly_fee * hours;

  const { data: checkin, error: insertError } = await requester.scopedClient
    .from("salon_checkins")
    .insert({
      member_id: requester.member.id,
      hours,
      fee_charged: feeCharged,
      guest_count: guestCount,
    })
    .select()
    .single();

  if (insertError || !checkin) {
    return NextResponse.json(
      { error: "체크인에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    checkin_at: checkin.checkin_at,
    fee_charged: feeCharged,
    free: tier.salon_entry_free,
    guest_count: guestCount,
  });
}
