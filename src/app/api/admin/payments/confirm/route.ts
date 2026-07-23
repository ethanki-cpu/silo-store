import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

const REASON_BY_TYPE: Record<string, (row: any) => string> = {
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

  if ((row as any).payment_status !== "pending_transfer") {
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

  const reason = REASON_BY_TYPE[type](row);
  const pointEarned = (row as any).point_earned as number;
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
        member_id: (row as any).member_id,
        reason,
        points: pointEarned,
        related_id: id,
      });
      pointsAwarded = true;
    }
  }

  return NextResponse.json({ confirmed: true, pointsAwarded, pointEarned });
}
