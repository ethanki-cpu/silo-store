import { supabase } from "@/lib/supabaseClient";
import { BOARD_RICH_FIELDS, BOARD_LEGACY_FIELDS } from "@/lib/boardLayout";

// EPIC-070: /api/boards/[id]/posts와 /api/boards/[id]/posts/[postId] 양쪽
// 라우트가 똑같이 쓰던 "게시판 조회(rich→legacy 폴백)"를 한 곳으로 모음.
export async function fetchBoard(id: string) {
  let { data: board, error: boardError } = await supabase
    .from("boards")
    .select(BOARD_RICH_FIELDS)
    .eq("id", id)
    .single();

  if (boardError) {
    ({ data: board, error: boardError } = await supabase
      .from("boards")
      .select(BOARD_LEGACY_FIELDS)
      .eq("id", id)
      .single());
  }

  return { board, boardError };
}
