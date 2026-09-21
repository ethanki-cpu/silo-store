import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { describeTierAccess, type TierRow } from "@/lib/tierAccess";
import { steppayConfigured, tierProducts } from "@/lib/steppayServer";

// EPIC-160: 로그인하지 않아도 볼 수 있는 유료 멤버십 4등급(Alice/Great Gatsby/Patron/Lautrec) 목록.
// 가격·혜택은 membership_tiers, 결제 가능 여부는 스텝페이 상품 등록 여부(available)에서 온다.
// 방문마다 DB/스텝페이를 다시 읽지 않도록 CDN 캐시를 건다.
export async function GET() {
  const { data } = await supabase.from("membership_tiers").select("*").order("rank", { ascending: true });
  const tiers = ((data ?? []) as TierRow[]).filter((t) => t.price > 0 && !t.is_lifetime && t.rank > 0 && t.rank < 99);

  let products = new Map<number, unknown>();
  if (steppayConfigured()) {
    try {
      products = await tierProducts();
    } catch {
      /* 상품 조회 실패 시 available=false로 표시 */
    }
  }

  const plans = tiers.map((t) => ({
    rank: t.rank,
    name: t.name,
    price: t.price,
    available: products.has(t.rank),
    access: describeTierAccess(t),
  }));

  return NextResponse.json({ plans }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
