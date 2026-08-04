import { supabase } from "@/lib/supabaseClient";
import { BOARD_RICH_FIELDS, BOARD_LEGACY_FIELDS } from "@/lib/boardLayout";

// EPIC-070: /api/boards/[board_slug]/posts와 /api/boards/[board_slug]/posts/
// [post_slug] 양쪽 라우트가 똑같이 쓰던 "게시판 조회(rich→legacy 폴백)"를
// 한 곳으로 모음.
// EPIC-079-PHASE-2: UUID 라우팅에서 slug 라우팅(/boards/[board_slug]/...)으로
// 바뀌면서 조회 키를 slug로 변경 — 다만 slug가 UUID 형태 그대로인 구
// 데이터(마이그레이션 백필 폴백, docs/sql/epic-079-phase-2-slug.sql 참고)나
// 아직 slug로 안 바뀐 외부 링크가 남아있을 수 있어, slug로 못 찾으면 id로도
// 한 번 더 시도한다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchBoard(slugOrId: string) {
  let { data: board, error: boardError } = await supabase
    .from("boards")
    .select(BOARD_RICH_FIELDS)
    .eq("slug", slugOrId)
    .single();

  if (boardError) {
    ({ data: board, error: boardError } = await supabase
      .from("boards")
      .select(BOARD_LEGACY_FIELDS)
      .eq("slug", slugOrId)
      .single());
  }

  if (boardError && UUID_RE.test(slugOrId)) {
    ({ data: board, error: boardError } = await supabase
      .from("boards")
      .select(BOARD_RICH_FIELDS)
      .eq("id", slugOrId)
      .single());
    if (boardError) {
      ({ data: board, error: boardError } = await supabase
        .from("boards")
        .select(BOARD_LEGACY_FIELDS)
        .eq("id", slugOrId)
        .single());
    }
  }

  return { board, boardError };
}
