import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";
import { resolveGroupBoardIds } from "@/lib/timelineGroup";

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
  "id, board_id, slug, title, body, featured_image_url, thumbnail_visible, category, created_at, timeline_year, timeline_end_year, timeline_display_date";
const legacyFields = "id, board_id, title, body, photo_url, created_at";

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

type RichPostRow = {
  id: string;
  board_id: string;
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
  board_id: string;
  title: string | null;
  body: string | null;
  photo_url: string | null;
  created_at: string;
};

function mapPostsToEvents(posts: Record<string, unknown>[], usedRichFields: boolean) {
  return usedRichFields
    ? (posts as unknown as RichPostRow[]).map((post) =>
        buildEvent({
          boardId: post.board_id,
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
          boardId: post.board_id,
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
}

export async function GET(request: NextRequest) {
  const boardParam = request.nextUrl.searchParams.get("board");
  const groupParam = request.nextUrl.searchParams.get("group");
  if (!boardParam && !groupParam) {
    return NextResponse.json(
      { error: "'board' 또는 'group' 쿼리 파라미터가 필요해요." },
      { status: 400 },
    );
  }

  // HOTFIX-147.3(사용자 지시 — 온라인 도슨트 2단계 카테고리 페이지에 그
  // 하위 3단계 게시판들의 글을 모두 모아 보여주는 집계 타임라인): 특정
  // 게시판 하나가 아니라 site_navigations 트리의 한 branch(href) 아래
  // 모든 게시판을 대상으로 한다 — 개별 게시판처럼 멤버십 등급 게이팅을
  // 적용할 단일 board 행이 없으므로, 이 하위 게시판들은 전부 공개(story()
  // 헬퍼의 기본 membership=0)라는 전제로 공개 조회만 한다.
  if (groupParam) {
    const boardIds = await resolveGroupBoardIds(groupParam);
    if (boardIds.length === 0) {
      return NextResponse.json({ error: "이 카테고리에 연결된 게시판을 찾지 못했어요." }, { status: 404 });
    }

    let posts: Record<string, unknown>[] | null;
    let postsError: { message: string } | null;
    ({ data: posts, error: postsError } = await supabase
      .from("posts")
      .select(richFields)
      .in("board_id", boardIds)
      .eq("visibility", "public")
      .order("created_at", { ascending: true }));

    let usedRichFields = true;
    if (postsError) {
      usedRichFields = false;
      ({ data: posts, error: postsError } = await supabase
        .from("posts")
        .select(legacyFields)
        .in("board_id", boardIds)
        .eq("visibility", "public")
        .order("created_at", { ascending: true }));
    }

    if (postsError || !posts) {
      return NextResponse.json({ error: "게시글을 불러오지 못했어요." }, { status: 500 });
    }

    return NextResponse.json({
      title: { text: { headline: "" } },
      events: mapPostsToEvents(posts, usedRichFields),
    });
  }

  const [{ board, boardError }, requester] = await Promise.all([
    fetchBoard(boardParam!),
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

  return NextResponse.json({
    title: { text: { headline: (board as { name: string }).name } },
    events: mapPostsToEvents(posts, usedRichFields),
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
    // HOTFIX-147.2(사용자 신고 — "호버해도 썸네일이 안 뜬다"): TimelineJS3의
    // TimeNav 마커는 호버와 무관하게 media.thumbnail이 있으면 항상 작은
    // 썸네일을 마커 위에 그린다(timeline.js 내부 tl-timemarker-media-container
    // 로직 확인) — media.url(큰 슬라이드 이미지)만 있고 media.thumbnail이
    // 없으면 마커에 아무것도 안 그려진다. 같은 이미지를 썸네일로도 함께 준다.
    ...(mediaUrl ? { media: { url: mediaUrl, thumbnail: mediaUrl, caption: title ?? undefined } } : {}),
    ...(category ? { group: category } : {}),
  };
}
