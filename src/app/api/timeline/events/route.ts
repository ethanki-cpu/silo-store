import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { fetchBoard } from "@/lib/boardFetch";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";
import { fetchNavGroup, parseCategoryTitle, fallbackThumbnailForHref } from "@/lib/timelineGroup";

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

  // HOTFIX-147.5(사용자 지시 — "혁명~제국 타임라인에는 신고전주의/리전시/
  // 빅토리안/인상파 이 네가지의 '페이지'가 들어와야 하는거야, 게시글이
  // 아니라"): 이 그룹 바로 아래 카테고리(페이지) 하나당 슬라이드 하나 —
  // 그 카테고리에 속한 게시글들을 끌어모으지 않는다. 각 카테고리 제목의
  // 연대 접두사("1750~1850 신고전주의...")를 그대로 TL3 날짜로 쓴다.
  if (groupParam) {
    const group = await fetchNavGroup(groupParam);
    if (!group || group.children.length === 0) {
      return NextResponse.json({ error: "이 카테고리에 하위 페이지를 찾지 못했어요." }, { status: 404 });
    }

    const events = await Promise.all(
      group.children.map(async (child, index) => {
        const { startYear, endYear, headline } = parseCategoryTitle(child.title);
        const mediaUrl = child.thumbnailUrl ?? (await fallbackThumbnailForHref(child.href));
        const excerpt = child.description ? htmlToExcerpt(child.description, EXCERPT_MAX_LENGTH) : "";
        return {
          unique_id: child.id,
          // 연대 접두사가 없는 예외적인 제목은 순번으로 순서만 보존한다
          // (실제로는 이 세션에서 다루는 모든 카테고리가 접두사를 갖고 있음).
          start_date: { year: startYear ?? 2000 + index },
          ...(endYear != null ? { end_date: { year: endYear } } : {}),
          text: {
            headline,
            text: `${excerpt ? `<p>${excerpt}</p>` : ""}<p><a href="${child.href}">자세히 보기</a></p>`,
          },
          ...(mediaUrl ? { media: { url: mediaUrl, thumbnail: mediaUrl, caption: headline } } : {}),
          // HOTFIX-151.11(사용자 신고 — "이집트/바빌론/그리스 이벤트에서
          // 그 페이지로 넘어가는 버튼이 없어"): 이 링크는 위 text.text에
          // 이미 있지만, 그 native 텍스트는 이벤트별 "자유 편집"(커스텀
          // 오버레이, SlideOverlayFieldsEditor)이 켜지면 화면에서 완전히
          // 가려진다 — TL3 표준 스키마엔 없는 필드지만(TL3는 무시) 클라
          // 이언트가 이 값으로 오버레이에도 같은 링크를 따로 그릴 수 있게
          // 별도로 노출한다(SiloTimelineEmbedBlock.tsx의 eventHrefs).
          href: child.href,
        };
      }),
    );

    const groupThumb = group.thumbnailUrl;
    return NextResponse.json({
      title: {
        text: {
          headline: group.title,
          text: group.description ? `<p>${htmlToExcerpt(group.description, EXCERPT_MAX_LENGTH)}</p>` : "",
        },
        ...(groupThumb ? { media: { url: groupThumb, thumbnail: groupThumb } } : {}),
      },
      events,
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

  // HOTFIX-147.5(사용자 지시 — "신고전주의 타임라인의 가장 첫번째로 보이는
  // 대시보드 위의 슬라이드를 어디서 수정하라는거야?"): TL3는 이벤트를
  // 아무것도 고르지 않았을 때 이 title 슬라이드를 표지처럼 보여준다 —
  // 지금까지 게시판 이름 텍스트만 있고 이미지/설명이 없어 휑하게 비어
  // 보였다. 게시판 수정(BoardForm) → "첫 화면 대표사진 히어로"의 첫 번째
  // 슬라이드(widget_settings.timelineHeroSlides[0])를 그대로 이 표지
  // 슬라이드에도 재사용한다 — 새 편집 UI를 따로 만들지 않고, 이미 있는
  // 히어로 편집 화면 하나가 이 표지까지 함께 채운다.
  const heroSlide = (board as { widget_settings?: { timelineHeroSlides?: { imageUrl: string; title: string; description: string }[] } | null })
    .widget_settings?.timelineHeroSlides?.[0];

  return NextResponse.json({
    title: {
      text: {
        headline: heroSlide?.title || (board as { name: string }).name,
        text: heroSlide?.description ? `<p>${htmlToExcerpt(heroSlide.description, EXCERPT_MAX_LENGTH)}</p>` : "",
      },
      ...(heroSlide?.imageUrl ? { media: { url: heroSlide.imageUrl, thumbnail: heroSlide.imageUrl } } : {}),
    },
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
    // HOTFIX-151.11: group 모드와 동일하게, 이벤트별 자유 편집 오버레이가
    // 이 링크를 가리는 경우에도 클라이언트가 별도로 그릴 수 있게 노출.
    href: detailHref,
  };
}
