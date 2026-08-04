import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard } from "@/lib/serverAuth";
import { HUB_DEFINITION, resolveBoardDefinition } from "@/lib/boardLayout";

const FEED_LIMIT = HUB_DEFINITION.pageSize;

// Board Definition System(EPIC-047/048) — hub 게시판(전체 디렉토리 `/boards`
// 뿐 아니라 Silo Store/Online Docent/Heritage 같은 개별 hub도 포함)이
// 상단에 표시할 "최신글/인기글/추천글" 종합 피드. `?parent=<slug>`가 있으면
// 그 slug를 부모로 둔 자식 게시판만 대상으로 좁힌다(없으면 전체 게시판
// 대상 — 최상위 `/boards` 디렉토리용). "추천글"에 대응하는 별도 테이블/
// 플래그가 없어(스키마 변경 최소화 원칙), 이미 "좋아요 10개 이상으로
// 승격"된 기존 is_best(개념글) 플래그를 추천글로 재해석해 사용한다.
export async function GET(request: NextRequest) {
  const parent = request.nextUrl.searchParams.get("parent");

  const { data: allBoards } = await supabase
    .from("boards")
    .select("id, name, category, board_type, slug");

  if (!allBoards) {
    return NextResponse.json({ latest: [], popular: [], recommended: [] });
  }

  const boards = parent
    ? allBoards.filter((b) => resolveBoardDefinition(b).parent === parent)
    : allBoards;

  const requester = await getRequestMember(request);
  const tier = requester ? await getTier(requester.member.membership_rank) : null;

  const readableBoardIds = boards
    .filter((b) => canReadBoard(b, tier))
    .map((b) => b.id);

  const boardNameById = new Map(boards.map((b) => [b.id, b.name]));
  // EPIC-079-PHASE-2: 슬러그 라우팅(/boards/[board_slug]/[post_slug]) 링크를
  // 만들려면 board_id → board_slug 매핑도 필요하다.
  const boardSlugById = new Map(boards.map((b) => [b.id, (b as { slug?: string }).slug ?? b.id]));

  if (readableBoardIds.length === 0) {
    return NextResponse.json({ latest: [], popular: [], recommended: [] });
  }

  // EPIC-066: view_count/tags가 라이브 DB에 아직 없을 수 있어(다른
  // 라우트들과 동일한 이유) 새 컬럼 포함으로 먼저 시도하고 실패하면
  // 레거시 컬럼만으로 재시도한다 — 피드 자체가 마이그레이션 전까지
  // 완전히 멈추지 않게 한다.
  let usedRichFields = true;
  let posts:
    | {
        id: string;
        slug?: string;
        board_id: string | null;
        title: string | null;
        like_count: number;
        is_best: boolean;
        photo_url: string | null;
        author_id: string;
        created_at: string;
        view_count?: number | null;
        tags?: string[] | null;
      }[]
    | null;

  ({ data: posts } = await supabase
    .from("posts")
    .select(
      "id, slug, board_id, title, like_count, is_best, photo_url, author_id, created_at, view_count, tags",
    )
    .in("board_id", readableBoardIds)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(200));

  if (!posts) {
    usedRichFields = false;
    ({ data: posts } = await supabase
      .from("posts")
      .select("id, board_id, title, like_count, is_best, photo_url, author_id, created_at")
      .in("board_id", readableBoardIds)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(200));
  }

  const allPosts = posts ?? [];

  const authorIds = [...new Set(allPosts.map((p) => p.author_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", authorIds.length > 0 ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  // EPIC-066: 게시글별 댓글 수 — /api/boards/[id]/posts와 동일하게 한 번의
  // 배치 조회(IN절)로 N+1을 피한다.
  const postIds = allPosts.map((p) => p.id);
  const { data: allComments } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds.length > 0 ? postIds : ["00000000-0000-0000-0000-000000000000"]);
  const commentCountByPostId = new Map<string, number>();
  for (const c of allComments ?? []) {
    commentCountByPostId.set(c.post_id, (commentCountByPostId.get(c.post_id) ?? 0) + 1);
  }

  function toFeedItem(p: (typeof allPosts)[number]) {
    return {
      id: p.id,
      slug: p.slug ?? p.id,
      board_id: p.board_id,
      board_slug: boardSlugById.get(p.board_id ?? "") ?? p.board_id,
      board_name: boardNameById.get(p.board_id ?? "") ?? "",
      title: p.title,
      like_count: p.like_count,
      photo_url: p.photo_url,
      author_name: nameById.get(p.author_id) ?? "알 수 없음",
      created_at: p.created_at,
      comment_count: commentCountByPostId.get(p.id) ?? 0,
      view_count: usedRichFields ? (p.view_count ?? 0) : 0,
      tags: usedRichFields ? (p.tags ?? []) : [],
    };
  }

  const latest = allPosts.slice(0, FEED_LIMIT).map(toFeedItem);
  const popular = [...allPosts]
    .sort((a, b) => b.like_count - a.like_count)
    .slice(0, FEED_LIMIT)
    .map(toFeedItem);
  const recommended = allPosts
    .filter((p) => p.is_best)
    .slice(0, FEED_LIMIT)
    .map(toFeedItem);

  return NextResponse.json({ latest, popular, recommended });
}
