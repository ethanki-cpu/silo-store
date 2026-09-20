import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { customerKeyFor, paidTiers, TossConfigError } from "@/lib/tossServer";

// EPIC-158: 클라이언트가 토스 SDK를 열기 전에 받아가는 customerKey + 서버가 계산한 유료 등급 목록/금액.
// 금액/키는 전부 서버 산출값이라 클라이언트가 조작할 수 없다.
export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const tiers = await paidTiers();
  if (tiers.length === 0) return NextResponse.json({ error: "구독 가능한 등급 정보를 확인할 수 없어요." }, { status: 500 });
  const { data: nameRow } = await requester.scopedClient.from("members").select("name").eq("id", requester.member.id).maybeSingle();

  try {
    const { data: billing } = await requester.scopedClient
      .from("member_billing")
      .select("status, tier_rank, next_billing_date, card_company, card_number_masked, last_failure_reason")
      .eq("member_id", requester.member.id)
      .maybeSingle();

    return NextResponse.json({
      customerKey: customerKeyFor(requester.member.id),
      tiers,
      customerName: (nameRow as { name: string } | null)?.name ?? "",
      billing: billing ?? null,
      currentRank: requester.member.membership_rank,
    });
  } catch (e) {
    if (e instanceof TossConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
