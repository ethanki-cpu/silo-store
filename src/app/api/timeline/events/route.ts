import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";

// EPIC-147(사용자 지시 — 사일로 게시글을 클래식 TimelineJS3의 timeline.json
// 포맷으로 렌더링): 이 게시판의 글 목록을 TL3 JSON 스키마로 실시간
// 변환해 내려준다.
// EPIC-147-후속(사용자 재지시):
// 1. "게시글이 쓰여진 날짜가 timeline 에 적용되었는데, 그게 그렇게 되면
//    안돼... 게시글이 쓰여진 날과는 독립적인, 타임라인에 등장하는 연대를
//    설정할수 있도록 해줘" — posts.timeline_year/timeline_end_year/
//    timeline_display_date(신규 컬럼)가 있으면 그 값을 쓰고, 없으면(아직
//    지정 안 한 기존 글) created_at으로 폴백한다.
// 2. "타임라인에는 게시글의 모든게 올라가면 안돼, 제목과... 최대 100자의
//    게시글의 첫 도입부내용을 올리는데, instagram 게시물 보기 같은 embed
//    내용은 필요없어" — 본문 전체 HTML 대신 htmlToExcerpt(임베드 블록
//    제거 후 100자로 자름)만 쓴다. "자세히 보기" 링크는 발췌 다음에
//    별도로 붙여 계속 상세 페이지 내비게이션 역할을 하게 한다.
const richFields =
  "id, slug, title, body, featured_image_url, thumbnail_visible, category, created_at, timeline_year, timeline_end_year, timeline_display_date";
const legacyFields = "id, title, body, photo_url, created_at";

const EXCERPT_MAX_LENGTH = 100;

type TLDateInput = {
  year: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  display_date?: string;
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
    timeline_year: number | null;
    timeline_end_year: number | null;
    timeline_display_date: string | null;
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
        buildEvent({
          boardId,
          postId: post.id,
          postSlug: post.slug ?? post.id,
          title: post.title,
          body: post.body,
          createdAt: post.created_at,
          mediaUrl: post.thumbnail_visible !== false ? post.featured_image_url : null,
          category: post.category,
          timelineYear: post.timeline_year,
          timelineEndYear: post.timeline_end_year,
          timelineDisplayDate: post.timeline_display_date,
        }),
      )
    : (posts as unknown as LegacyPostRow[]).map((post) =>
        buildEvent({
          boardId,
          postId: post.id,
          postSlug: post.id,
          title: post.title,
          body: post.body,
          createdAt: post.created_at,
          mediaUrl: post.photo_url,
          category: null,
          timelineYear: null,
          timelineEndYear: null,
          timelineDisplayDate: null,
        }),
      );

  return NextResponse.json({
    title: { text: { headline: (board as { name: string }).name } },
    events,
  });
}

function buildEvent({
  boardId,
  postId,
  postSlug,
  title,
  body,
  createdAt,
  mediaUrl,
  category,
  timelineYear,
  timelineEndYear,
  timelineDisplayDate,
}: {
  boardId: string;
  postId: string;
  postSlug: string;
  title: string | null;
  body: string | null;
  createdAt: string;
  mediaUrl: string | null | undefined;
  category: string | null | undefined;
  timelineYear: number | null | undefined;
  timelineEndYear: number | null | undefined;
  timelineDisplayDate: string | null | undefined;
}) {
  const detailHref = `/boards/${boardId}/${postSlug}`;
  const excerpt = htmlToExcerpt(body, EXCERPT_MAX_LENGTH);
  const startDate: TLDateInput =
    timelineYear != null
      ? { year: timelineYear, ...(timelineDisplayDate ? { display_date: timelineDisplayDate } : {}) }
      : toTLDate(createdAt);
  return {
    unique_id: postId,
    start_date: startDate,
    ...(timelineEndYear != null ? { end_date: { year: timelineEndYear } } : {}),
    text: {
      headline: title ?? "(제목 없음)",
      text: `${excerpt ? `<p>${excerpt}</p>` : ""}<p><a href="${detailHref}">자세히 보기</a></p>`,
    },
    ...(mediaUrl ? { media: { url: mediaUrl, caption: title ?? undefined } } : {}),
    ...(category ? { group: category } : {}),
  };
}
