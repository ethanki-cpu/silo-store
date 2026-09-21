import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";
import { rpc, steppayRequest, SteppayConfigError, steppayConfigured, subscriptionPriceCode } from "@/lib/steppayServer";

// EPIC-159: Patron 정기구독 결제 시작. 회원에 대응하는 스텝페이 고객을 만들고(없으면), 구독 상품으로 주문을 생성해
// 스텝페이 결제 페이지(관리형 결제 — 리다이렉트 방식) 주소를 돌려준다. 금액은 스텝페이의 가격 플랜이 정하므로 클라이언트가 조작할 수 없다.
// 결제 결과(성공/실패/취소)는 결과 페이지로 돌아오고, 등급 반영은 웹훅(/api/webhooks/steppay)이 담당한다.
const ENTITLED = ["ACTIVE", "PENDING_CANCEL", "PENDING_PAUSE", "QUEUEING"];

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!steppayConfigured()) return NextResponse.json({ error: "결제 서비스가 아직 준비되지 않았어요." }, { status: 503 });

  try {
    const { data: existing } = await requester.scopedClient
      .from("steppay_subscriptions")
      .select("status")
      .eq("member_id", requester.member.id)
      .in("status", ENTITLED)
      .limit(1);
    if (existing && existing.length > 0) return NextResponse.json({ error: "이미 정기구독 중이에요." }, { status: 409 });

    // 1) 스텝페이 고객(회원당 1명)
    const known = await rpc<number>("steppay_get_customer", { p_member_id: requester.member.id });
    if (known.error) return NextResponse.json({ error: "고객 정보를 확인하지 못했어요.", detail: known.error }, { status: 500 });
    let customerId = known.data;
    if (!customerId) {
      const { data: userData } = await supabase.auth.getUser(requester.accessToken);
      const email = userData.user?.email;
      if (!email) return NextResponse.json({ error: "이메일이 있는 계정만 정기구독을 시작할 수 있어요." }, { status: 400 });
      const { data: nameRow } = await requester.scopedClient.from("members").select("name").eq("id", requester.member.id).maybeSingle();
      const created = await steppayRequest<{ id: number; code?: string }>("POST", "/api/v1/customers", {
        username: `silo_${requester.member.id}`,
        email,
        name: (nameRow as { name?: string } | null)?.name || email.split("@")[0],
        attributes: { siloMemberId: requester.member.id },
      });
      if (!created.ok) return NextResponse.json({ error: `고객 등록에 실패했어요. (${created.message})` }, { status: 502 });
      customerId = created.data.id;
      const linked = await rpc("steppay_link_customer", {
        p_member_id: requester.member.id,
        p_customer_id: customerId,
        p_code: created.data.code ?? null,
      });
      if (linked.error) return NextResponse.json({ error: "고객 정보를 저장하지 못했어요.", detail: linked.error }, { status: 500 });
    }

    // 2) 구독 상품/가격 플랜 → 주문 생성
    const price = await subscriptionPriceCode();
    if (!price.ok) return NextResponse.json({ error: `구독 상품을 확인하지 못했어요. (${price.message})` }, { status: 502 });
    const order = await steppayRequest<{ orderCode: string }>("POST", "/api/v1/orders", {
      customerId,
      items: [{ minimumQuantity: 1, productCode: price.data.productCode, priceCode: price.data.priceCode }],
    });
    if (!order.ok || !order.data.orderCode) {
      return NextResponse.json({ error: `주문을 만들지 못했어요. (${order.ok ? "orderCode 없음" : order.message})` }, { status: 502 });
    }

    // 3) 결제 페이지 주소(리다이렉트)
    const origin = request.nextUrl.origin;
    const url = new URL(`https://api.steppay.kr/api/public/orders/${order.data.orderCode}/pay`);
    url.searchParams.set("successUrl", `${origin}/payments/steppay/result`);
    url.searchParams.set("errorUrl", `${origin}/payments/steppay/result`);
    url.searchParams.set("cancelUrl", `${origin}/membership`);
    return NextResponse.json({ ok: true, payUrl: url.toString(), orderCode: order.data.orderCode });
  } catch (e) {
    if (e instanceof SteppayConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    throw e;
  }
}
