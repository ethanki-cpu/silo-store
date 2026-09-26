import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { describeConditionRows, describeTierAccess, describeTierBenefits, type TierRow, type BoardPermissionRow } from "@/lib/tierAccess";
import { computeTierCategoryAccess } from "@/lib/tierCategoryAccess";
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
  const allTiers = (data ?? []) as TierRow[];
  const tiers = allTiers.filter((t) => !t.is_lifetime && t.rank >= 0 && t.rank < 99 && (t.price > 0 || t.rank === 0));
  // HOTFIX-162.14: 명예 등급(Artist, 가입 불가·초청)도 카드/비교표에 권한을 보여주려고 함께 내려주되 honorary로 표시한다.
  const honoraryTiers = allTiers.filter((t) => (t.is_lifetime || t.rank >= 99) && t.rank < 100); // EPIC-168: Owner(100)는 공개 목록에 나오지 않는다
  const shown = [...tiers, ...honoraryTiers];

  let products = new Map<number, unknown>();
  if (steppayConfigured()) {
    try {
      products = await tierProducts();
    } catch {
      /* 상품 조회 실패 시 available=false로 표시 */
    }
  }

  // HOTFIX-163.1: 카드 안에 보여줄 "카테고리별 이용 가능 항목"(사이트 메뉴 트리 + 실제 권한 설정 기반).
  let categoryAccess = new Map<number, Awaited<ReturnType<typeof computeTierCategoryAccess>> extends Map<number, infer V> ? V : never>();
  try {
    categoryAccess = await computeTierCategoryAccess(shown.map((t) => t.rank));
  } catch {
    /* 계산 실패 시 카드에서 카테고리 영역만 생략 */
  }

  const plans = shown.map((t) => ({
    rank: t.rank,
    name: t.name,
    price: t.price,
    honorary: t.is_lifetime === true || t.rank >= 99,
    free: t.price === 0 && !(t.is_lifetime === true || t.rank >= 99),
    available: t.price === 0 ? true : products.has(t.rank),
    imageUrl: t.image_url ?? null,
    access: { ...describeTierAccess(t), boards: [], benefits: describeTierBenefits(boards, t.rank) },
    // 절약 계산기용 할인율(마이페이지/멤버십 화면이 지난 30일 이용 금액에 곱해 추정한다)
    categories: categoryAccess.get(t.rank) ?? null,
    rates: {
      shopPurchasePct: t.shop_purchase_discount_pct ?? 0,
      shopRentalPct: t.shop_rental_discount_pct ?? 0,
      clubPct: t.club_all_free ? 100 : (t.club_participation_discount_pct ?? 0),
      docentPct: t.docent_per_item_discount_pct ?? 0,
    },
  }));

  return NextResponse.json({ plans, conditionRows: describeConditionRows(shown) }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
