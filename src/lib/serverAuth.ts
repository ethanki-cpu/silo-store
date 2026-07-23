import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type TierFlags = {
  rank: number;
  board_write_scope: "limited" | "all";
  board_can_write_docent: boolean;
  board_can_create: boolean;
  board_has_patron_board: boolean;
  board_has_promo_board: boolean;
  venue_rental_point_pct: number;
  salon_entry_free: boolean;
  salon_entry_hourly_fee: number;
  docent_free_only: boolean;
  docent_per_item_discount_pct: number;
  docent_monthly_free_count: number;
  docent_needs_agreement: boolean;
};

export const RANK_LABELS: Record<number, string> = {
  0: "Silo Angel",
  1: "Alice",
  2: "Great Gatsby",
  3: "Patron",
  4: "Lautrec",
  99: "Artist",
};

export async function getRequestMember(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!accessToken) return null;

  const { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) return null;

  const scopedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: member } = await scopedClient
    .from("members")
    .select("id, membership_rank, is_admin")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (!member) return null;

  return { userId: userData.user.id, member, scopedClient, accessToken };
}

export async function getTier(rank: number): Promise<TierFlags | null> {
  const { data } = await supabase
    .from("membership_tiers")
    .select(
      "rank, board_write_scope, board_can_write_docent, board_can_create, board_has_patron_board, board_has_promo_board, venue_rental_point_pct, salon_entry_free, salon_entry_hourly_fee, docent_free_only, docent_per_item_discount_pct, docent_monthly_free_count, docent_needs_agreement",
    )
    .eq("rank", rank)
    .single<TierFlags>();

  return data;
}

export function canReadBoard(
  board: { board_type: string },
  tier: TierFlags | null,
): boolean {
  if (board.board_type !== "patron") return true;
  return !!tier?.board_has_patron_board;
}

export function canWriteToBoard(
  board: { board_type: string; category: string | null },
  tier: TierFlags | null,
  isDocentPost: boolean,
): { ok: true } | { ok: false; error: string } {
  if (!tier) {
    return { ok: false, error: "로그인이 필요해요." };
  }

  if (isDocentPost && !tier.board_can_write_docent) {
    return {
      ok: false,
      error: `도슨트 글쓰기는 ${RANK_LABELS[2]} 등급부터 가능해요.`,
    };
  }

  switch (board.board_type) {
    case "group":
      if (tier.board_write_scope === "all") return { ok: true };
      return {
        ok: false,
        error: `모임별 게시판은 ${RANK_LABELS[1]} 등급부터 글쓰기가 가능해요.`,
      };
    case "topic":
    case "adoption_story":
    case "archive":
    case "qna":
      return { ok: true };
    case "patron":
      if (tier.board_has_patron_board) return { ok: true };
      return {
        ok: false,
        error: `패트론 전용 게시판이에요. ${RANK_LABELS[3]} 등급부터 이용 가능해요.`,
      };
    case "artist_promo":
      if (tier.board_has_promo_board) return { ok: true };
      return {
        ok: false,
        error: `홍보 게시판은 ${RANK_LABELS[99]} 등급만 글쓰기가 가능해요.`,
      };
    default:
      return { ok: false, error: "글쓰기 권한이 없어요." };
  }
}
