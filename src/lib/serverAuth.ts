import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { resolveBoardDefinition } from "@/lib/boardLayout";

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
  // HOTFIX-161.7(사용자 지시): 온라인 도슨트 단품 가격을 "콘텐츠 정가 *
  // (1-할인율)"에서 "콘텐츠 정가와 무관한 등급별 고정가 + 등급별 하루
  // 무료 열람 건수"로 교체 — 위 docent_free_only/docent_per_item_discount_pct/
  // docent_monthly_free_count 3개는 더 이상 /api/docent-purchases 실제
  // 계산에 쓰이지 않는다(하위 호환을 위해 필드는 남겨둠).
  docent_flat_price: number | null;
  docent_daily_free_count: number;
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
      "rank, board_write_scope, board_can_write_docent, board_can_create, board_has_patron_board, board_has_promo_board, venue_rental_point_pct, salon_entry_free, salon_entry_hourly_fee, docent_free_only, docent_per_item_discount_pct, docent_monthly_free_count, docent_needs_agreement, docent_flat_price, docent_daily_free_count",
    )
    .eq("rank", rank)
    .single<TierFlags>();

  return data;
}

export function canReadBoard(
  board: {
    board_type: string;
    category?: string | null;
    is_public?: boolean | null;
    min_rank_to_read?: number | null;
  },
  tier: TierFlags | null,
  isAdmin?: boolean,
): boolean {
  // EPIC-066: 게시판 관리의 "공개/비공개" 토글 — 비공개면 관리자를 제외한
  // 모두에게 등급과 무관하게 막는다(patron 게이팅보다 우선).
  if (board.is_public === false && !isAdmin) {
    return false;
  }

  // EPIC-087-PHASE-C: 페이지/게시판별 최소 열람 티어 — min_rank_to_write와
  // 동일한 컬럼 관례(references membership_tiers(rank), null=게이트 없음).
  // 비회원(tier===null)은 -1로 취급해 모든 게이트보다 낮다.
  if (!isAdmin && board.min_rank_to_read != null && (tier?.rank ?? -1) < board.min_rank_to_read) {
    return false;
  }

  if (board.board_type === "patron") {
    return !!tier?.board_has_patron_board;
  }

  // EPIC-050: Board Definition의 accessLevel이 "patron"으로 지정된
  // 개별 게시판(예: 패트론 게시판)은 실제 board_type과 무관하게 동일한
  // 패트론 등급 플래그로 게이팅한다 — "멤버십 권한 적용" 지시를 실제로
  // 반영하기 위함. accessLevel이 없거나 다른 값(예: "secret_room")이면
  // 아직 실제 게이팅 로직을 연결하지 않고 구조만 유지한다(NEXT_TASK.md 참고).
  const definition = resolveBoardDefinition({
    board_type: board.board_type,
    category: board.category ?? null,
  });
  if (definition.accessLevel === "patron") {
    return !!tier?.board_has_patron_board;
  }

  return true;
}

// EPIC-161: min_rank_to_read(게시판 목록 열람)와 별개로 게시글 상세 열람/댓글/
// 좋아요/북마크 각각의 최소 등급을 독립적으로 검사하는 공통 헬퍼 — 전부 같은
// 모양(컬럼 없거나 null=게이트 없음, 관리자는 항상 통과, 비회원은 rank=-1 취급)
// 이라 canWriteToBoard의 메시지 패턴(RANK_LABELS 활용)을 그대로 재사용한다.
function checkMinRank(
  minRank: number | null | undefined,
  tier: TierFlags | null,
  isAdmin: boolean | undefined,
  actionLabel: string,
): { ok: true } | { ok: false; error: string } {
  if (isAdmin) return { ok: true };
  if (minRank == null) return { ok: true };
  if ((tier?.rank ?? -1) >= minRank) return { ok: true };
  const label = RANK_LABELS[minRank] ?? `등급 ${minRank}`;
  return {
    ok: false,
    error: `이 게시판은 ${label} 등급부터 ${actionLabel}이 가능해요. 멤버십 가입 안내에서 등급을 올릴 수 있어요.`,
  };
}

export function canViewPost(
  board: { min_rank_to_view_post?: number | null },
  tier: TierFlags | null,
  isAdmin?: boolean,
) {
  return checkMinRank(board.min_rank_to_view_post, tier, isAdmin, "게시글 열람");
}

export function canCommentOnBoard(
  board: { min_rank_to_comment?: number | null },
  tier: TierFlags | null,
  isAdmin?: boolean,
) {
  return checkMinRank(board.min_rank_to_comment, tier, isAdmin, "댓글 작성");
}

export function canLikeOnBoard(
  board: { min_rank_to_like?: number | null },
  tier: TierFlags | null,
  isAdmin?: boolean,
) {
  return checkMinRank(board.min_rank_to_like, tier, isAdmin, "좋아요");
}

export function canBookmarkOnBoard(
  board: { min_rank_to_bookmark?: number | null },
  tier: TierFlags | null,
  isAdmin?: boolean,
) {
  return checkMinRank(board.min_rank_to_bookmark, tier, isAdmin, "북마크");
}

export function canProposeOnBoard(
  board: { min_rank_to_propose?: number | null },
  tier: TierFlags | null,
  isAdmin?: boolean,
) {
  return checkMinRank(board.min_rank_to_propose, tier, isAdmin, "제안");
}

export function canWriteToBoard(
  board: { board_type: string; category: string | null; min_rank_to_write?: number | null },
  tier: TierFlags | null,
  isDocentPost: boolean,
  isAdmin?: boolean,
): { ok: true } | { ok: false; error: string } {
  if (!tier) {
    return { ok: false, error: "로그인이 필요해요." };
  }

  // EPIC-160: boards.min_rank_to_write는 DB에 값이 있었지만(나의 보물들=1, 사일로 타임라인=4 등) 여기서 한 번도 참조하지 않아
  // 무효였다 — 등급별 접근 구조(Alice=클럽 모임방/나의 보물들, Lautrec=타임라인 등)가 실제로 적용되도록 강제한다.
  // null이면 게이트 없음, 관리자는 통과.
  if (!isAdmin && board.min_rank_to_write != null && tier.rank < board.min_rank_to_write) {
    const label = RANK_LABELS[board.min_rank_to_write] ?? `등급 ${board.min_rank_to_write}`;
    return { ok: false, error: `이 게시판은 ${label} 등급부터 글쓰기가 가능해요. 멤버십 가입 안내에서 등급을 올릴 수 있어요.` };
  }

  if (isDocentPost && !tier.board_can_write_docent) {
    return {
      ok: false,
      error: `도슨트 글쓰기는 ${RANK_LABELS[2]} 등급부터 가능해요.`,
    };
  }

  // EPIC-050: canReadBoard와 동일한 이유로, accessLevel==="patron"인
  // 개별 게시판은 board_type과 무관하게 글쓰기도 패트론 등급으로 막는다 —
  // 읽기만 막고 쓰기는 board_type='topic' 취급으로 뚫리는 걸 방지.
  const definition = resolveBoardDefinition(board);
  if (definition.accessLevel === "patron" && !tier.board_has_patron_board) {
    return {
      ok: false,
      error: `패트론 전용 게시판이에요. ${RANK_LABELS[3]} 등급부터 이용 가능해요.`,
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
