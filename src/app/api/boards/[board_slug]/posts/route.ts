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
import { renderPostHtml, type JSONContent } from "@/lib/blockEditorCore";
import { resolveFallbackEmbedThumbnail } from "@/lib/embedThumbnail";
import { fetchBoard } from "@/lib/boardFetch";
import { slugifyWithFallback } from "@/lib/slugify";

// 게시판 규모가 크지 않아 검색/정렬/페이지네이션을 DB 쪽 복잡한 OR/배열-
// 포함 쿼리로 밀어넣는 대신, 전체를 가져와 라우트 핸들러에서 처리한다
// (이 저장소의 다른 라우트들과 동일한 접근).
//
// tags/view_count/updated_at는 라이브 DB에 아직 마이그레이션되지 않았을
// 수 있다 — 없는 컬럼을 select하면 PostgREST가 쿼리 전체를 42703으로
// 실패시키므로, 먼저 새 컬럼 포함으로 시도하고 실패하면 레거시 컬럼만으로
// 재시도해 마이그레이션 전에도 게시판 읽기가 완전히 멈추지 않게 한다.
// EPIC-092 후속: 갤러리 카드 hover 미리보기(영상 재생 → 이미지 슬라이드)가
// 본문 갤러리/임베드 전체 목록이 필요해 body_json도 목록 조회에 포함시킨다
// — 별도 per-post fetch 없이 hover 즉시 재생되게 하려는 선택(사용자 확인).
const richFields =
  "id, slug, title, body, body_json, is_docent_post, like_count, is_best, photo_url, featured_image_url, thumbnail_visible, category, tags, view_count, updated_at, author_id, created_at";
const legacyFields =
  "id, title, body, is_docent_post, like_count, is_best, photo_url, author_id, created_at";

async function fetchPosts(client: typeof supabase, boardId: string) {
  let usedRichFields = true;
  let posts: Record<string, unknown>[] | null;
  let postsError: { message: string } | null;

  ({ data: posts, error: postsError } = await client
    .from("posts")
    .select(richFields)
    .eq("board_id", boardId)
    .order("created_at", { ascending: false }));

  if (postsError) {
    usedRichFields = false;
    ({ data: posts, error: postsError } = await client
      .from("posts")
      .select(legacyFields)
      .eq("board_id", boardId)
      .order("created_at", { ascending: false }));
  }

  return { posts, postsError, usedRichFields };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string }> },
) {
  const { board_slug: boardSlug } = await params;

  // EPIC-070: 서로 의존관계 없는 쿼리(게시판 조회 / 로그인 사용자 확인)를
  // 순차 await 대신 Promise.all로 병렬화 — Vercel 서버리스에서 Supabase
  // 왕복 지연이 그대로 누적되는 게 페이지 로딩이 느린 핵심 원인이었다.
  const [{ board, boardError }, requester] = await Promise.all([
    fetchBoard(boardSlug),
    getRequestMember(request),
  ]);

  if (boardError || !board) {
    return NextResponse.json(
      { error: "게시판을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const boardId = (board as { id: string }).id;

  // Board Definition System(EPIC-047): 검색/정렬/페이지네이션 동작 자체가
  // 게시판 설정에 따라 달라진다 — 하드코딩된 상수 대신 이 게시판이 어떤
  // BoardDefinition에 속하는지부터 정한다. EPIC-066: board에 admin 오버라이드
  // 컬럼(is_public/render_type/...)이 실려 있으면 resolveBoardDefinition이
  // 하드코딩 값 위에 얹어 즉시 반영한다.
  const definition = resolveBoardDefinition(board);
  const client = requester ? requester.scopedClient : supabase;

  // EPIC-070: 게시글 조회는 권한 체크(tier) 결과와 무관하게 board_id만
  // 있으면 되므로, 권한 판정이 끝나길 기다리지 않고 tier 조회와 동시에
  // 시작한다 — 거부 판정이면 아래에서 결과를 버리고 403을 반환한다.
  const [tier, { posts, postsError, usedRichFields }] = await Promise.all([
    requester ? getTier(requester.member.membership_rank) : Promise.resolve(null),
    fetchPosts(client, boardId),
  ]);

  if (!canReadBoard(board, tier, requester?.member.is_admin)) {
    // EPIC-087-PHASE-C: 잠금 사유가 accessLevel과 min_rank_to_read 둘 다일
    // 수 있어 더 높은 랭크 쪽으로 안내한다.
    const requiredRank = Math.max(definition.membership, (board as { min_rank_to_read?: number | null }).min_rank_to_read ?? 0);
    return NextResponse.json(
      {
        error: `이 게시판은 ${RANK_LABELS[requiredRank] ?? "상위"} 등급부터 열람 가능해요.`,
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
  // EPIC-066: Board Widget의 Tag/Year 필터 — Category/Board Type 필터는
  // 게시판 단위 속성이라 이 게시글 목록 API가 아니라 /boards 디렉토리
  // 수준(어떤 게시판을 보여줄지)에서 걸러야 할 값이라 여기서 다루지 않는다.
  const tagFilter = searchParams.get("tag")?.trim() || null;
  const yearFilter = searchParams.get("year")?.trim() || null;

  if (postsError || !posts) {
    return NextResponse.json(
      { error: "게시글을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const normalizedPosts = usedRichFields
    ? (posts as unknown as {
        id: string;
        slug: string;
        title: string | null;
        body: string | null;
        body_json: JSONContent | null;
        is_docent_post: boolean;
        like_count: number;
        is_best: boolean;
        photo_url: string | null;
        featured_image_url: string | null;
        thumbnail_visible: boolean | null;
        category: string | null;
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
        slug: p.id,
        body_json: null as JSONContent | null,
        featured_image_url: null as string | null,
        thumbnail_visible: true as boolean | null,
        category: null as string | null,
        tags: [] as string[] | null,
        view_count: 0 as number | null,
        updated_at: p.created_at,
      }));

  const authorIds = [...new Set(normalizedPosts.map((p) => p.author_id))];
  const postIds = normalizedPosts.map((p) => p.id);

  // 서로 독립적인 두 조회(작성자 이름 / 댓글 수)를 병렬화.
  const [{ data: profiles }, { data: allComments }] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, name")
      .in("id", authorIds.length > 0 ? authorIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds.length > 0 ? postIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

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

  // EPIC-066: Filter UI가 보여줄 선택지 — 검색/태그/연도 필터를 적용하기
  // 전(enriched 원본) 기준으로 뽑아야, 필터를 하나 걸었다고 다른 필터의
  // 선택지가 줄어들어 보이지 않는다.
  const availableTags = [...new Set(enriched.flatMap((post) => post.tags ?? []))].sort();
  const availableYears = [
    ...new Set(enriched.map((post) => new Date(post.created_at).getFullYear().toString())),
  ].sort((a, b) => Number(b) - Number(a));

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

  if (tagFilter) {
    enriched = enriched.filter((post) => (post.tags ?? []).includes(tagFilter));
  }

  if (yearFilter) {
    enriched = enriched.filter(
      (post) => new Date(post.created_at).getFullYear().toString() === yearFilter,
    );
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
    availableTags,
    availableYears,
  });
}

// EPIC-079-PHASE-2: 새 글의 slug를 제목에서 생성한다 — 같은 게시판 안에서만
// UNIQUE면 되므로(docs/sql/epic-079-phase-2-slug.sql의 (board_id, slug)
// 복합 UNIQUE 인덱스), 충돌 시 -2, -3 ... 접미사를 붙여 재시도한다.
//
// EPIC-079-WRITE-FIX: 한글 제목처럼 slugify 결과가 빈 문자열이 되는 경우,
// 예전엔 여기서 null을 반환하고 "insert 성공 후 반환된 id로 폴백 slug를
// 다시 계산해 UPDATE"하는 2단계 방식이었다 — 그런데 `posts.slug`가 라이브
// DB에서 DEFAULT 없는 NOT NULL 컬럼이라, slug 없이 하는 첫 INSERT 자체가
// `null value in column "slug" violates not-null constraint`로 즉시
// 실패해서 그 UPDATE 단계에 영영 도달하지 못했다 — 한글 제목(이 사이트
// 게시글 대부분)으로 글을 쓰면 항상 500이 나던 원인. 호출부가 INSERT 전에
// 미리 만들어둔 id(fallbackId)를 넘겨받아, 처음부터 항상 비어있지 않은
// slug를 반환하도록 바꿔 이 문제를 근본적으로 없앤다(2단계 INSERT→UPDATE
// 자체가 불필요해짐).
async function generateUniquePostSlug(
  client: typeof supabase,
  boardId: string,
  title: string,
  fallbackId: string,
): Promise<string> {
  const base = slugifyWithFallback(title, fallbackId);

  let candidate = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await client
      .from("posts")
      .select("id")
      .eq("board_id", boardId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string }> },
) {
  const { board_slug: boardSlug } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { board, boardError } = await fetchBoard(boardSlug);

  if (boardError || !board) {
    return NextResponse.json(
      { error: "게시판을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const boardId = (board as { id: string }).id;
  const definition = resolveBoardDefinition(board);

  if (!definition.allowPosting) {
    return NextResponse.json(
      { error: "이 게시판에는 글을 쓸 수 없어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const title = body?.title as string | undefined;
  const bodyJson = body?.bodyJson as JSONContent | undefined;
  const isDocentPost = Boolean(body?.isDocentPost);
  const orderId = body?.orderId as string | undefined;
  // EPIC-079-PHASE-5/HOTFIX-3: 대표 이미지를 지정하지 않았고(직접 업로드도,
  // 이미지/임베드 ★ 지정도 없음) 본문에 임베드가 있으면 그 썸네일로 자동
  // 폴백 — 상세는 resolveFallbackEmbedThumbnail 주석 참고.
  const featuredImageUrl =
    (body?.featuredImageUrl as string | null | undefined) ??
    (bodyJson ? await resolveFallbackEmbedThumbnail(bodyJson) : null);
  const featuredImagePath = (body?.featuredImagePath as string | null | undefined) ?? null;
  const thumbnailVisible = body?.thumbnailVisible === undefined ? true : Boolean(body.thumbnailVisible);
  const category = (body?.category as string | null | undefined) ?? null;
  const tags =
    definition.tags && Array.isArray(body?.tags)
      ? (body.tags as unknown[])
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => t.trim())
      : [];

  // EPIC-092(요구사항 1): 관리자만 등록 시 created_at을 직접 지정할 수
  // 있다 — 클라이언트의 is_admin 표시는 UI 게이팅일 뿐이라 서버가
  // requester.member.is_admin으로 다시 검증한다. 값이 없거나 관리자가
  // 아니면 조용히 무시하고 DB 기본값(now())을 그대로 쓴다.
  const requestedCreatedAt = body?.createdAt as string | undefined;
  const createdAtOverride =
    requester.member.is_admin && requestedCreatedAt && !isNaN(new Date(requestedCreatedAt).getTime())
      ? new Date(requestedCreatedAt).toISOString()
      : null;

  if (!title || !bodyJson) {
    return NextResponse.json(
      { error: "제목과 내용을 모두 입력해주세요." },
      { status: 400 },
    );
  }

  // EPIC-053.1: 클라이언트가 보낸 JSON(Block 정본)을 신뢰하지 않고,
  // 실제로 저장/렌더링할 HTML은 서버가 JSON으로부터 항상 다시 계산한다
  // (Tiptap 스키마로 렌더링 + sanitize-html 새니타이즈 — Stored XSS 방지
  // 이중 방어이자, "정본은 JSON, HTML은 파생 캐시" 원칙을 서버에서
  // 강제하는 지점).
  let sanitizedBody: string;
  try {
    sanitizedBody = renderPostHtml(bodyJson);
  } catch {
    return NextResponse.json({ error: "본문 형식이 올바르지 않아요." }, { status: 400 });
  }

  if (sanitizedBody.replace(/<[^>]*>/g, "").trim().length === 0) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }

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

  // EPIC-079-WRITE-FIX: id를 미리 만들어(DB 기본값에 맡기지 않고) slug
  // 계산의 폴백 값으로 넘긴다 — posts.slug가 NOT NULL(기본값 없음)이라
  // insert 시점에 항상 비어있지 않은 slug가 있어야 한다(아래 주석 참고).
  const postId = crypto.randomUUID();
  const slug = await generateUniquePostSlug(requester.scopedClient, boardId, title, postId);

  let { data: post, error: insertError } = await requester.scopedClient
    .from("posts")
    .insert({
      id: postId,
      board_id: boardId,
      author_id: requester.member.id,
      title,
      body: sanitizedBody,
      body_json: bodyJson,
      featured_image_url: featuredImageUrl,
      featured_image_path: featuredImagePath,
      thumbnail_visible: thumbnailVisible,
      category,
      is_docent_post: isDocentPost,
      visibility: "public",
      order_id: validatedOrderId,
      tags,
      slug,
      ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
    })
    .select()
    .single();

  // body_json/featured_image_*/tags 컬럼이 라이브 DB에 아직 없으면(42703)
  // 단계적으로 재시도한다 — 마이그레이션(docs/sql/epic-053-1.sql) 전에도
  // 글쓰기 자체가 완전히 막히지 않게 한다. body_json이 없으면 JSON
  // 정본이 저장되지 않으므로(레거시 HTML-only 저장), 이 경우는 UI에
  // 별도 안내 없이도 다음 조회 시 legacyHtml 경로로 정상 표시된다.
  if (insertError) {
    ({ data: post, error: insertError } = await requester.scopedClient
      .from("posts")
      .insert({
        id: postId,
        board_id: boardId,
        author_id: requester.member.id,
        title,
        body: sanitizedBody,
        is_docent_post: isDocentPost,
        visibility: "public",
        order_id: validatedOrderId,
        tags,
        slug,
        ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
      })
      .select()
      .single());
  }

  if (insertError) {
    ({ data: post, error: insertError } = await requester.scopedClient
      .from("posts")
      .insert({
        id: postId,
        board_id: boardId,
        author_id: requester.member.id,
        title,
        body: sanitizedBody,
        is_docent_post: isDocentPost,
        visibility: "public",
        order_id: validatedOrderId,
        slug,
        ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
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
