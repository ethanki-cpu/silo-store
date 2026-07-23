import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  const { data: boards, error } = await supabase
    .from("boards")
    .select("id, name, category, board_type, min_rank_to_write");

  if (error || !boards) {
    return NextResponse.json(
      { error: "게시판 목록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const requester = await getRequestMember(request);
  const tier = requester ? await getTier(requester.member.membership_rank) : null;

  const result = boards.map((board) => {
    const locked = !canReadBoard(board, tier);
    return {
      ...board,
      locked,
      lockMessage: locked
        ? `${RANK_LABELS[3]} 등급부터 열람 가능`
        : null,
    };
  });

  return NextResponse.json(result);
}
