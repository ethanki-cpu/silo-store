import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import {
  getRequestMember,
  getTier,
  canReadBoard,
  canWriteToBoard,
  RANK_LABELS,
} from "@/lib/serverAuth";
import { resolveBoardDefinition, isSortOption, type SortOption } from "@/lib/boardLayout";
import { sanitizeHtml } from "@/lib/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, name, category, board_type")
    .eq("id", id)
    .single();

  if (boardError || !board) {
    return NextResponse.json(
      { error: "게시판을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  // Board Definition System(EPIC-047): 검색/정렬/페이지네이션 동작 자체가
  // 게시판 설정에 따라 달라진다 — 하드코딩된 상수 대신 이 게시판이 어떤
  // BoardDefinition에 속하는지부터 정한다.
  const definition = resolveBoardDefinition(board);

  const requester = await getRequestMember(request);
  const tier = requester ? await getTier(requester.member.membership_rank) : null;

  if (!canReadBoard(board, tier)) {
    return NextResponse.json(
      {
        error: `이 게시판은 ${RANK_LABELS[definition.membership] ?? "상위"} 등급부터 열람 가능해요.`,
      },
      { status: 403 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const page = definition.pageable ? Math.max(1, Number(searchParams.get("page")) || 1) : 1;
  const q = definition.searchable ? (searchParams.get("q") ?? "").trim().toLowerCase() : "";
  const sortParam = searchParams.get("sort");
  const sort: SortOption = definition.sortable && isSortOption(sortParam)
    ? sortParam
    : definition.defaultSort;

  const client = requester ? requester.scopedClient : supabase;

  // 게시판 규모가 크지 않아 검색/정렬/페이지네이션을 DB 쪽 복잡한 OR/배열-
  // 포함 쿼리로 밀어넣는 대신, 전체를 가져와 라우트 핸들러에서 처리한다
  // (이 저장소의 다른 라우트들과 동일한 접근).
  //
  // tags/view_count/updated_at는 라이브 DB에 아직 마이그레이션되지 않았을
  // 수 있다 — 없는 컬럼을 select하면 PostgREST가 쿼리 전체를 42703으로
  // 실패시키므로, 먼저 새 컬럼 포함으로 시도하고 실패하면 레거시 컬럼만으로
  // 재시도해 마이그레이션 전에도 게시판 읽기가 완전히 멈추지 않게 한다.
  const richFields =
    "id, title, body, is_docent_post, like_count, is_best, photo_url, tags, view_count, updated_at, author_id, created_at";
  const legacyFields =
    "id, title, body, is_docent_post, like_count, is_best, photo_url, author_id, created_at";

  let usedRichFields = true;
  let posts: Record<string, unknown>[] | null;
  let postsError: { message: string } | null;

  ({ data: posts, error: postsError } = await client
    .from("posts")
    .select(richFields)
    .eq("board_id", id)
    .order("created_at", { ascending: false }));

  if (postsError) {
    usedRichFields = false;
    ({ data: posts, error: postsError } = await client
      .from("posts")
      .select(legacyFields)
      .eq("board_id", id)
      .order("created_at", { ascending: false }));
  }

  if (postsError || !posts) {
    return NextResponse.json(
      { error: "게시글을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const normalizedPosts = usedRichFields
    ? (posts as unknown as {
        id: string;
        title: string | null;
        body: string | null;
        is_docent_post: boolean;
        like_count: number;
        is_best: boolean;
        photo_url: string | null;
        tags: string[] | null;
        view_count: number | null;
        updated_at: string;
        author_id: string;
        created_at: string;
      }[])
    : (posts as unknown as {
        id: string;
        title: string | null;
        body: string | null;
        is_docent_post: boolean;
        like_count: number;
        is_best: boolean;
        photo_url: string | null;
        author_id: string;
        created_at: string;
      }[]).map((p) => ({
        ...p,
        tags: [] as string[] | null,
        view_count: 0 as number | null,
        updated_at: p.created_at,
      }));

  const authorIds = [...new Set(normalizedPosts.map((p) => p.author_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", authorIds.length > 0 ? authorIds : ["00000000-0000-0000-0000-000000000000"]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  const postIds = normalizedPosts.map((p) => p.id);
  const { data: allComments } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds.length > 0 ? postIds : ["00000000-0000-0000-0000-000000000000"]);

  const commentCountByPostId = new Map<string, number>();
  for (const c of allComments ?? []) {
    commentCountByPostId.set(c.post_id, (commentCountByPostId.get(c.post_id) ?? 0) + 1);
  }

  let answeredByPostId = new Map<string, boolean>();
  if (board.board_type === "qna") {
    answeredByPostId = new Map(
      postIds.map((pid) => [pid, (commentCountByPostId.get(pid) ?? 0) > 0]),
    );
  }

  let enriched = normalizedPosts.map((post) => ({
    ...post,
    author_name: nameById.get(post.author_id) ?? "알 수 없음",
    comment_count: commentCountByPostId.get(post.id) ?? 0,
    tags: definition.tags ? ((post.tags ?? []) as string[]) : [],
    ...(board.board_type === "qna"
      ? { is_answered: answeredByPostId.get(post.id) ?? false }
      : {}),
  }));

  if (q) {
    enriched = enriched.filter((post) => {
      const haystacks = [
        post.title ?? "",
        post.body ?? "",
        post.author_name,
        ...(post.tags ?? []),
      ];
      return haystacks.some((h) => h.toLowerCase().includes(q));
    });
  }

  // sort는 definition.sortable이 false면 이미 defaultSort로 고정돼 있으므로,
  // 정렬 자체는 항상 적용해도 안전하다(비정렬형 게시판도 결정적인 순서는
  // 필요).
  enriched.sort((a, b) => {
    switch (sort) {
      case "popular":
        return b.like_count - a.like_count;
      case "views":
        return (b.view_count ?? 0) - (a.view_count ?? 0);
      case "comments":
        return b.comment_count - a.comment_count;
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "latest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalCount = enriched.length;
  // EPIC-065: Widget Builder의 Board Widget "페이지당 개수" 설정 — 쿼리
  // 파라미터로 넘어오면 definition.pageSize 대신 사용한다(1~100로 clamp,
  // 파라미터가 없거나 pageable이 아니면 기존 동작 그대로).
  const pageSizeParam = Number(searchParams.get("pageSize"));
  const overridePageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(100, Math.floor(pageSizeParam))
      : null;
  const pageSize = definition.pageable
    ? (overridePageSize ?? definition.pageSize)
    : totalCount || 1;
  const start = (page - 1) * pageSize;
  const pageItems = definition.pageable ? enriched.slice(start, start + pageSize) : enriched;

  return NextResponse.json({
    board,
    posts: pageItems,
    totalCount,
    page,
    pageSize,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, name, category, board_type")
    .eq("id", id)
    .single();

  if (boardError || !board) {
    return NextResponse.json(
      { error: "게시판을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const definition = resolveBoardDefinition(board);

  if (!definition.allowPosting) {
    return NextResponse.json(
      { error: "이 게시판에는 글을 쓸 수 없어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const title = body?.title as string | undefined;
  const postBody = body?.body as string | undefined;
  const isDocentPost = Boolean(body?.isDocentPost);
  const orderId = body?.orderId as string | undefined;
  const tags =
    definition.tags && Array.isArray(body?.tags)
      ? (body.tags as unknown[])
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => t.trim())
      : [];

  if (!title || !postBody) {
    return NextResponse.json(
      { error: "제목과 내용을 모두 입력해주세요." },
      { status: 400 },
    );
  }

  // EPIC-052: 클라이언트 에디터(Tiptap)를 거치지 않고 API를 직접 호출해도
  // 안전하도록, 저장 직전에 서버에서 한 번 더 정제한다(Stored XSS 방지 —
  // 클라이언트 쪽 정제만 믿지 않음).
  const sanitizedBody = sanitizeHtml(postBody);

  const tier = await getTier(requester.member.membership_rank);
  const permission = canWriteToBoard(board, tier, isDocentPost);

  if (!permission.ok) {
    return NextResponse.json({ error: permission.error }, { status: 403 });
  }

  let validatedOrderId: string | null = null;

  if (board.board_type === "adoption_story") {
    if (!orderId) {
      return NextResponse.json(
        { error: "구매하신 물품을 선택해주세요." },
        { status: 400 },
      );
    }

    const { data: order } = await requester.scopedClient
      .from("orders")
      .select("id, payment_status")
      .eq("id", orderId)
      .single();

    if (!order || order.payment_status !== "confirmed") {
      return NextResponse.json(
        { error: "본인의 구매 확정 건만 선택할 수 있어요." },
        { status: 400 },
      );
    }

    validatedOrderId = order.id;
  }

  let { data: post, error: insertError } = await requester.scopedClient
    .from("posts")
    .insert({
      board_id: id,
      author_id: requester.member.id,
      title,
      body: sanitizedBody,
      is_docent_post: isDocentPost,
      visibility: "public",
      order_id: validatedOrderId,
      tags,
    })
    .select()
    .single();

  // tags 컬럼이 라이브 DB에 아직 없으면(42703) 태그 없이 재시도 — 글쓰기
  // 자체가 마이그레이션 전까지 완전히 막히지 않게 한다.
  if (insertError) {
    ({ data: post, error: insertError } = await requester.scopedClient
      .from("posts")
      .insert({
        board_id: id,
        author_id: requester.member.id,
        title,
        body: sanitizedBody,
        is_docent_post: isDocentPost,
        visibility: "public",
        order_id: validatedOrderId,
      })
      .select()
      .single());
  }

  if (insertError || !post) {
    return NextResponse.json(
      { error: "글 작성에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  await requester.scopedClient.from("points_ledger").insert({
    member_id: requester.member.id,
    reason: "post",
    points: 5,
    related_id: post.id,
  });

  return NextResponse.json(post);
}
