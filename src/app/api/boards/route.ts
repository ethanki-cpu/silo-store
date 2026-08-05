import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { resolveBoardDefinition, BOARD_RICH_FIELDS, BOARD_LEGACY_FIELDS } from "@/lib/boardLayout";

export async function GET(request: NextRequest) {
  // EPIC-079-PHASE-5: 글쓰기 폼의 "게시될 페이지 선택" 드롭다운이 이 목록을
  // 그대로 쓰는데, 정렬이 전혀 없어(PostgREST 기본 순서 = 사실상 임의) 관리자
  // "사이트 구성 관리"에서 드래그로 잡은 sort_order가 여기 전혀 반영되지
  // 않았다 — /api/admin/boards(EPIC-075)와 동일하게 sort_order 정렬을 적용
  // (컬럼 없는 라이브 DB를 위한 폴백도 동일하게 유지).
  let { data: boards, error } = await supabase
    .from("boards")
    .select(BOARD_RICH_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) {
    ({ data: boards, error } = await supabase.from("boards").select(BOARD_LEGACY_FIELDS));
  }

  if (error || !boards) {
    return NextResponse.json(
      { error: "게시판 목록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const requester = await getRequestMember(request);
  const tier = requester ? await getTier(requester.member.membership_rank) : null;

  const result = boards.map((board) => {
    const locked = !canReadBoard(board, tier, requester?.member.is_admin);
    const definition = resolveBoardDefinition(board);
    return {
      ...board,
      locked,
      lockMessage: locked
        ? board.is_public === false
          ? "비공개 게시판이에요."
          : `${RANK_LABELS[definition.membership] ?? "상위"} 등급부터 열람 가능`
        : null,
    };
  });

  return NextResponse.json(result);
}
