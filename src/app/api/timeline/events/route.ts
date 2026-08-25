import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";
import { resolveBoardDefinition } from "@/lib/boardLayout";

// EPIC-147(사용자 지시 — 사일로 게시글을 Knight Lab Timeline NG의
// timeline.json 포맷으로 렌더링): 이 게시판의 글 목록을
// @knight-lab/timeline-ng의 TLTimeline 스키마(Timeline Json.docx 참고)로
// 실시간 변환해 내려준다 — 정적 timeline.json 파일을 그 자리에 대신하는
// 것뿐이라, `<SiloTimeline />` 브릿지는 이 URL을 그냥 `loadTimeline()`에
// 넘긴다(패키지 공식 "self-hosting" 경로와 동일, 별도 파싱 로직 불필요).
const richFields = "id, slug, title, body, featured_image_url, thumbnail_visible, category, created_at";
const legacyFields = "id, title, body, photo_url, created_at";

type TLDateInput = {
  year: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
};

function toTLDate(iso: string): TLDateInput {
  const d = new Date(iso);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

export async function GET(request: NextRequest) {
  const boardParam = request.nextUrl.searchParams.get("board");
  if (!boardParam) {
    return NextResponse.json({ error: "'board' 쿼리 파라미터(게시판 slug 또는 id)가 필요해요." }, { status: 400 });
  }

  const [{ board, boardError }, requester] = await Promise.all([
    fetchBoard(boardParam),
    getRequestMember(request),
  ]);

  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const definition = resolveBoardDefinition(board);
  const tier = requester ? await getTier(requester.member.membership_rank) : null;
  if (!canReadBoard(board, tier, requester?.member.is_admin)) {
    const requiredRank = Math.max(definition.membership, (board as { min_rank_to_read?: number | null }).min_rank_to_read ?? 0);
    return NextResponse.json(
      { error: `이 게시판은 ${RANK_LABELS[requiredRank] ?? "상위"} 등급부터 열람 가능해요.` },
      { status: 403 },
    );
  }

  const boardId = (board as { id: string; name: string }).id;
  const client = requester ? requester.scopedClient : supabase;

  let posts: Record<string, unknown>[] | null;
  let postsError: { message: string } | null;
  ({ data: posts, error: postsError } = await client
    .from("posts")
    .select(richFields)
    .eq("board_id", boardId)
    .eq("visibility", "public")
    .order("created_at", { ascending: true }));

  let usedRichFields = true;
  if (postsError) {
    usedRichFields = false;
    ({ data: posts, error: postsError } = await client
      .from("posts")
      .select(legacyFields)
      .eq("board_id", boardId)
      .eq("visibility", "public")
      .order("created_at", { ascending: true }));
  }

  if (postsError || !posts) {
    return NextResponse.json({ error: "게시글을 불러오지 못했어요." }, { status: 500 });
  }

  type RichPostRow = {
    id: string;
    slug: string;
    title: string | null;
    body: string | null;
    featured_image_url: string | null;
    thumbnail_visible: boolean | null;
    category: string | null;
    created_at: string;
  };
  type LegacyPostRow = {
    id: string;
    title: string | null;
    body: string | null;
    photo_url: string | null;
    created_at: string;
  };

  const events = usedRichFields
    ? (posts as unknown as RichPostRow[]).map((post) =>
        buildEvent(boardId, post.id, post.slug ?? post.id, post.title, post.body, post.created_at, post.thumbnail_visible !== false ? post.featured_image_url : null, post.category),
      )
    : (posts as unknown as LegacyPostRow[]).map((post) =>
        buildEvent(boardId, post.id, post.id, post.title, post.body, post.created_at, post.photo_url, null),
      );

  return NextResponse.json({
    title: { text: { headline: (board as { name: string }).name } },
    events,
  });
}

function buildEvent(
  boardId: string,
  postId: string,
  postSlug: string,
  title: string | null,
  body: string | null,
  createdAt: string,
  mediaUrl: string | null | undefined,
  category: string | null | undefined,
) {
  const detailHref = `/boards/${boardId}/${postSlug}`;
  const bodyHtml = body ?? "";
  return {
    unique_id: postId,
    start_date: toTLDate(createdAt),
    text: {
      headline: title ?? "(제목 없음)",
      text: `${bodyHtml}<p><a href="${detailHref}">자세히 보기</a></p>`,
    },
    ...(mediaUrl ? { media: { url: mediaUrl, caption: title ?? undefined } } : {}),
    ...(category ? { group: category } : {}),
  };
}
