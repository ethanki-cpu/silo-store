import { supabase } from "@/lib/supabaseClient";

// HOTFIX-093-B(요구사항 1.2): 게시글 다중 게시판 소속(N:M) — 스키마는
// docs/sql/HOTFIX-093-B-post-boards-multi.sql 참고. posts.board_id는
// 여전히 "주 게시판"(라우팅/작성자 권한/이동 로직의 유일한 기준)이고,
// post_boards는 "추가로 노출할 게시판" 목록만 담는다.
//
// 마이그레이션 SQL이 아직 실행되지 않은 환경(로컬 dev 등)에서도 나머지
// 기능이 깨지지 않도록, 이 테이블을 건드리는 모든 함수는 실패(42P01:
// relation does not exist 등)를 조용히 무시하고 빈 결과/no-op으로
// 폴백한다 — 게시글 작성/조회 자체를 막지 않는다.

type Client = typeof supabase;

/** 이 게시판에 "추가로" 연결된(주 게시판이 아닌) 게시글 id 목록. */
export async function fetchCrossPostedPostIds(
  client: Client,
  boardId: string,
): Promise<string[]> {
  try {
    const { data, error } = await client
      .from("post_boards")
      .select("post_id")
      .eq("board_id", boardId);
    if (error) return [];
    return (data ?? []).map((row) => (row as { post_id: string }).post_id);
  } catch {
    return [];
  }
}

/** 이 게시글이 추가로 연결된 게시판들의 slug 목록(에디터 프리필용). */
export async function fetchAdditionalBoardSlugs(
  client: Client,
  postId: string,
): Promise<string[]> {
  try {
    const { data, error } = await client
      .from("post_boards")
      .select("board_id, boards(slug)")
      .eq("post_id", postId);
    if (error || !data) return [];
    return data
      .map((row) => (row as unknown as { boards: { slug: string | null } | null }).boards?.slug ?? null)
      .filter((slug): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

/**
 * additionalBoardSlugs(주 게시판 제외)를 board_id로 변환해 post_boards를
 * 통째로 다시 채운다(기존 행 삭제 후 재삽입) — 매번 정확히 "지금 선택된
 * 목록"과 일치시키는 게 부분 diff보다 훨씬 단순하고, 목록 크기가 큰
 * 경우가 없어(사이트 게시판 수가 수십 개 수준) 성능상 문제되지 않는다.
 */
export async function syncPostBoards(
  client: Client,
  postId: string,
  primaryBoardId: string,
  additionalBoardSlugs: string[],
): Promise<void> {
  try {
    let boardIds: string[] = [];
    if (additionalBoardSlugs.length > 0) {
      const { data } = await client
        .from("boards")
        .select("id, slug")
        .in("slug", additionalBoardSlugs);
      boardIds = (data ?? [])
        .map((b) => (b as { id: string }).id)
        .filter((id) => id !== primaryBoardId);
    }

    await client.from("post_boards").delete().eq("post_id", postId);

    if (boardIds.length > 0) {
      await client
        .from("post_boards")
        .insert(boardIds.map((boardId) => ({ post_id: postId, board_id: boardId })));
    }
  } catch {
    // post_boards 테이블이 아직 없는 환경 — 조용히 무시(글 저장 자체는
    // 이미 끝난 뒤라 여기서 실패해도 사용자에게 에러를 보여줄 필요 없음).
  }
}
