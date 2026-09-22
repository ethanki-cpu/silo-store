import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { describeTierAccess, describeBoardHighlightsForTier, type TierRow, type BoardPermissionRow } from "@/lib/tierAccess";
import { steppayConfigured, tierProducts } from "@/lib/steppayServer";

// EPIC-160: 로그인하지 않아도 볼 수 있는 유료 멤버십 4등급(Alice/Great Gatsby/Patron/Lautrec) 목록.
// 가격·혜택은 membership_tiers, 결제 가능 여부는 스텝페이 상품 등록 여부(available)에서 온다.
// 방문마다 DB/스텝페이를 다시 읽지 않도록 CDN 캐시를 건다.
export async function GET() {
  // HOTFIX-161.7(사용자 지시 — "지금 표시된게 너무 적어"): describeTierAccess의
  // 뭉뚱그린 "boards" 문구 대신, 실제 게시판별 권한 설정(boards.min_rank_to_*
  // 6개 + badge_min_rank, /admin/board-permissions에서 관리)을 그대로 읽어
  // 등급별 하이라이트를 만든다.
  const [{ data }, { data: boardRows }] = await Promise.all([
    supabase.from("membership_tiers").select("*").order("rank", { ascending: true }),
    supabase
      .from("boards")
      .select("name, min_rank_to_read, min_rank_to_view_post, min_rank_to_comment, min_rank_to_like, min_rank_to_bookmark, min_rank_to_write, min_rank_to_propose, badge_min_rank"),
  ]);
  const boards = (boardRows ?? []) as BoardPermissionRow[];
  // 무료 입문 등급(Silo Angel, rank 0)을 맨 앞에 포함 — 무료로 먼저 유입시킨 뒤 유료로 전환하는 흐름의 시작점.
  const tiers = ((data ?? []) as TierRow[]).filter((t) => !t.is_lifetime && t.rank >= 0 && t.rank < 99 && (t.price > 0 || t.rank === 0));

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
    free: t.price === 0,
    available: t.price === 0 ? true : products.has(t.rank),
    imageUrl: t.image_url ?? null,
    access: { ...describeTierAccess(t), boards: describeBoardHighlightsForTier(boards, t.rank) },
    // 절약 계산기용 할인율(마이페이지/멤버십 화면이 지난 30일 이용 금액에 곱해 추정한다)
    rates: {
      shopPurchasePct: t.shop_purchase_discount_pct ?? 0,
      shopRentalPct: t.shop_rental_discount_pct ?? 0,
      clubPct: t.club_all_free ? 100 : (t.club_participation_discount_pct ?? 0),
      docentPct: t.docent_per_item_discount_pct ?? 0,
    },
  }));

  return NextResponse.json({ plans }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
