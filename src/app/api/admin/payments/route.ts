import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";

const FLOOR_LABEL: Record<string, string> = {
  "1f_silostore": "1층 사일로상점",
  "2f_salon": "2층 살롱데상",
};

const SHOOT_TYPE_LABEL: Record<string, string> = {
  photo: "사진촬영",
  video: "영상촬영",
};

type PaymentRow = {
  type: "orders" | "reservations" | "rental_bookings" | "docent_purchases";
  id: string;
  member_id: string;
  description: string;
  amount: number;
  payment_status: string;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 접근할 수 있어요." },
      { status: 403 },
    );
  }

  const statusFilter = request.nextUrl.searchParams.get("status") ?? "pending";

  const applyFilter = (query: any) =>
    statusFilter === "pending"
      ? query.eq("payment_status", "pending_transfer")
      : query;

  const [ordersRes, reservationsRes, rentalRes, docentRes] = await Promise.all([
    applyFilter(
      requester.scopedClient
        .from("orders")
        .select(
          "id, member_id, order_type, rental_days, price_charged, payment_status, created_at, items(name)",
        ),
    ),
    applyFilter(
      requester.scopedClient
        .from("reservations")
        .select(
          "id, member_id, price_charged, point_earned, payment_status, created_at, club_sessions(session_date, clubs(name))",
        ),
    ),
    applyFilter(
      requester.scopedClient
        .from("rental_bookings")
        .select(
          "id, member_id, price_charged, payment_status, created_at, hours, headcount, rental_types(floor, shoot_type)",
        ),
    ),
    applyFilter(
      requester.scopedClient
        .from("docent_purchases")
        .select(
          "id, member_id, price_charged, payment_status, purchased_at, docent_contents(title)",
        ),
    ),
  ]);

  const rows: PaymentRow[] = [];

  for (const o of ordersRes.data ?? []) {
    const item = o.items as unknown as { name: string } | null;
    rows.push({
      type: "orders",
      id: o.id,
      member_id: o.member_id,
      description: `${o.order_type === "purchase" ? "구매" : `대여 ${o.rental_days}일`}: ${item?.name ?? "알 수 없음"}`,
      amount: o.price_charged,
      payment_status: o.payment_status,
      created_at: o.created_at,
    });
  }

  for (const r of reservationsRes.data ?? []) {
    const session = r.club_sessions as unknown as {
      session_date: string;
      clubs: { name: string } | null;
    } | null;
    rows.push({
      type: "reservations",
      id: r.id,
      member_id: r.member_id,
      description: `클럽모임: ${session?.clubs?.name ?? "알 수 없음"} (${session?.session_date ?? "-"})`,
      amount: r.price_charged,
      payment_status: r.payment_status,
      created_at: r.created_at,
    });
  }

  for (const b of rentalRes.data ?? []) {
    const rt = b.rental_types as unknown as {
      floor: string;
      shoot_type: string;
    } | null;
    rows.push({
      type: "rental_bookings",
      id: b.id,
      member_id: b.member_id,
      description: `공간 대관: ${FLOOR_LABEL[rt?.floor ?? ""] ?? rt?.floor} ${SHOOT_TYPE_LABEL[rt?.shoot_type ?? ""] ?? rt?.shoot_type} (${b.hours}시간, ${b.headcount}명)`,
      amount: b.price_charged,
      payment_status: b.payment_status,
      created_at: b.created_at,
    });
  }

  for (const d of docentRes.data ?? []) {
    const dc = d.docent_contents as unknown as { title: string } | null;
    rows.push({
      type: "docent_purchases",
      id: d.id,
      member_id: d.member_id,
      description: `도슨트 콘텐츠: ${dc?.title ?? "알 수 없음"}`,
      amount: d.price_charged,
      payment_status: d.payment_status,
      created_at: d.purchased_at,
    });
  }

  const memberIds = [...new Set(rows.map((r) => r.member_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  const result = rows
    .map((r) => ({ ...r, member_name: nameById.get(r.member_id) ?? "알 수 없음" }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return NextResponse.json(result);
}
