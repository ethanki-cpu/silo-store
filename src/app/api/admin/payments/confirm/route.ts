import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// TABLE_SELECT의 대상 테이블(orders/reservations/rental_bookings/
// docent_purchases)마다 컬럼 구성이 조금씩 다르지만(point_earned/
// order_type 유무), 이 라우트가 실제로 읽는 필드만 모아 하나의 느슨한
// 공통 타입으로 둔다 — 테이블별 정확한 스키마 타입을 새로 만드는 대신
// `any`를 없애는 최소 수정.
type PaymentRow = {
  id: string;
  member_id: string;
  payment_status: string;
  point_earned?: number;
  order_type?: string;
};

const REASON_BY_TYPE: Record<string, (row: PaymentRow) => string> = {
  orders: (row) => (row.order_type === "purchase" ? "shop_purchase" : "shop_rental"),
  reservations: () => "club_participation",
  rental_bookings: () => "venue_rental",
  docent_purchases: () => "",
};

const TABLE_SELECT: Record<string, string> = {
  orders: "id, member_id, order_type, point_earned, payment_status",
  reservations: "id, member_id, point_earned, payment_status",
  rental_bookings: "id, member_id, point_earned, payment_status",
  docent_purchases: "id, member_id, payment_status",
};

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 접근할 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const type = body?.type as string | undefined;
  const id = body?.id as string | undefined;

  if (!type || !id || !TABLE_SELECT[type]) {
    return NextResponse.json(
      { error: "type과 id가 필요해요." },
      { status: 400 },
    );
  }

  const { data: row, error: fetchError } = await requester.scopedClient
    .from(type)
    .select(TABLE_SELECT[type])
    .eq("id", id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json(
      { error: "기록을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  // TABLE_SELECT[type]이 리터럴이 아닌 일반 string이라 Supabase가 select
  // 결과 타입을 정확히 추론하지 못한다(GenericStringError로 fallback) —
  // PaymentRow와 구조적으로 겹치지 않는다는 오탐이라 unknown을 거쳐 캐스트.
  const paymentRow = row as unknown as PaymentRow;

  if (paymentRow.payment_status !== "pending_transfer") {
    return NextResponse.json(
      { error: "이미 처리된 건이에요." },
      { status: 409 },
    );
  }

  const { error: updateError } = await requester.scopedClient
    .from(type)
    .update({ payment_status: "confirmed" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "상태 변경에 실패했어요.", detail: updateError.message },
      { status: 500 },
    );
  }

  const reason = REASON_BY_TYPE[type](paymentRow);
  const pointEarned = paymentRow.point_earned ?? 0;
  let pointsAwarded = false;

  if (pointEarned > 0) {
    const { data: existing } = await requester.scopedClient
      .from("points_ledger")
      .select("id")
      .eq("related_id", id)
      .eq("reason", reason)
      .maybeSingle();

    if (!existing) {
      await requester.scopedClient.from("points_ledger").insert({
        member_id: paymentRow.member_id,
        reason,
        points: pointEarned,
        related_id: id,
      });
      pointsAwarded = true;
    }
  }

  return NextResponse.json({ confirmed: true, pointsAwarded, pointEarned });
}
