import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { resolveBoardDefinition, BOARD_RICH_FIELDS, BOARD_LEGACY_FIELDS } from "@/lib/boardLayout";
import { renderPostHtml, type JSONContent } from "@/lib/blockEditorCore";
import { enqueueOrphanedImages } from "@/lib/imageGc";

const richFields =
  "id, board_id, title, body, body_json, featured_image_url, featured_image_path, is_docent_post, like_count, is_best, photo_url, tags, view_count, updated_at, author_id, created_at";
const legacyFields =
  "id, board_id, title, body, is_docent_post, like_count, is_best, photo_url, author_id, created_at";

async function fetchBoard(id: string) {
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

// Board Engine(EPIC-047): tags/view_count/updated_at가 라이브 DB에 아직
// 없을 수 있어(마이그레이션 전), 새 컬럼 포함 select가 42703으로 실패하면
// 레거시 컬럼만으로 재시도한다(자세한 배경은 posts/route.ts 참고).
async function fetchPost(client: typeof supabase, id: string, postId: string) {
  let usedRichFields = true;
  let { data: post, error: postError } = await client
    .from("posts")
    .select(richFields)
    .eq("id", postId)
    .eq("board_id", id)
    .single();

  if (postError) {
    usedRichFields = false;
    ({ data: post, error: postError } = await client
      .from("posts")
      .select(legacyFields)
      .eq("id", postId)
      .eq("board_id", id)
      .single());
  }

  return { post, postError, usedRichFields };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { id, postId } = await params;

  // EPIC-070: 서로 의존관계 없는 쿼리를 순차 await 대신 Promise.all로
  // 병렬화 — Vercel 서버리스에서 Supabase 왕복 지연이 그대로 누적되는 게
  // 페이지 로딩이 느린 핵심 원인이었다(posts/route.ts와 동일한 배경).
  const [{ board, boardError }, requester] = await Promise.all([
    fetchBoard(id),
    getRequestMember(request),
  ]);

  if (boardError || !board) {
    return NextResponse.json(
      { error: "게시판을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const definition = resolveBoardDefinition(board);
  const client = requester ? requester.scopedClient : supabase;

  // 게시글 조회 자체는 권한 판정과 무관하게 시작할 수 있어 tier 조회와
  // 동시에 진행하고, 거부 판정이면 아래에서 결과를 버리고 403을 반환한다.
  const [tier, { post, postError, usedRichFields }] = await Promise.all([
    requester ? getTier(requester.member.membership_rank) : Promise.resolve(null),
    fetchPost(client, id, postId),
  ]);

  if (!canReadBoard(board, tier, requester?.member.is_admin)) {
    return NextResponse.json(
      {
        error: `이 게시판은 ${RANK_LABELS[definition.membership] ?? "상위"} 등급부터 열람 가능해요.`,
      },
      { status: 403 },
    );
  }

  if (postError || !post) {
    return NextResponse.json(
      { error: "게시글을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const normalizedPost = usedRichFields
    ? (post as unknown as {
        id: string;
        board_id: string;
        title: string | null;
        body: string | null;
        body_json: JSONContent | null;
        featured_image_url: string | null;
        featured_image_path: string | null;
        is_docent_post: boolean;
        like_count: number;
        is_best: boolean;
        photo_url: string | null;
        tags: string[] | null;
        view_count: number | null;
        updated_at: string;
        author_id: string;
        created_at: string;
      })
    : {
        ...(post as {
          id: string;
          board_id: string;
          title: string | null;
          body: string | null;
          is_docent_post: boolean;
          like_count: number;
          is_best: boolean;
          photo_url: string | null;
          author_id: string;
          created_at: string;
        }),
        body_json: null as JSONContent | null,
        featured_image_url: null as string | null,
        featured_image_path: null as string | null,
        tags: [] as string[] | null,
        view_count: 0 as number | null,
        updated_at: (post as { created_at: string }).created_at,
      };

  // EPIC-070: 서로 독립적인 5개 쿼리(조회수 증가/글 번호/댓글/좋아요 여부/
  // 북마크 여부)를 병렬화 — 전부 postId/board_id/normalizedPost만 있으면
  // 되고 서로의 결과를 필요로 하지 않는다.
  const [, { count: postNumber }, { data: comments }, likedByMe, bookmarkedByMe] =
    await Promise.all([
      // 조회수 증가 — view_count 컬럼이 없으면(마이그레이션 전) 조용히 무시.
      usedRichFields
        ? client
            .from("posts")
            .update({ view_count: (normalizedPost.view_count ?? 0) + 1 })
            .eq("id", postId)
        : Promise.resolve(null),
      // EPIC-046: "글 번호(No.)" — 별도 시퀀스 컬럼이 없어, 같은 게시판에서
      // 이 글보다 먼저(또는 동시에) 작성된 글의 개수로 파생 계산한다(1부터 시작).
      client
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("board_id", id)
        .lte("created_at", normalizedPost.created_at),
      definition.comments
        ? client
            .from("comments")
            .select("id, body, author_id, created_at")
            .eq("post_id", postId)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as { id: string; body: string; author_id: string; created_at: string }[] }),
      requester && definition.likes
        ? requester.scopedClient
            .from("likes")
            .select("id")
            .eq("post_id", postId)
            .eq("member_id", requester.member.id)
            .maybeSingle()
            .then(({ data }) => !!data)
        : Promise.resolve(false),
      // post_bookmarks가 라이브 DB에 아직 없을 수 있어(마이그레이션 전) 에러는
      // 무시하고 기본값 false로 둔다.
      requester && definition.bookmarks
        ? requester.scopedClient
            .from("post_bookmarks")
            .select("id")
            .eq("post_id", postId)
            .eq("member_id", requester.member.id)
            .maybeSingle()
            .then(({ data }) => !!data)
        : Promise.resolve(false),
    ]);

  const authorIds = [
    ...new Set([
      normalizedPost.author_id,
      ...(comments ?? []).map((c) => c.author_id),
    ]),
  ];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", authorIds);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  return NextResponse.json({
    board,
    post: {
      ...normalizedPost,
      view_count: usedRichFields ? (normalizedPost.view_count ?? 0) + 1 : 0,
      tags: definition.tags ? (normalizedPost.tags ?? []) : [],
      author_name: nameById.get(normalizedPost.author_id) ?? "알 수 없음",
      post_number: postNumber ?? null,
    },
    comments: (comments ?? []).map((c) => ({
      ...c,
      author_name: nameById.get(c.author_id) ?? "알 수 없음",
    })),
    likedByMe,
    bookmarkedByMe,
  });
}

// EPIC-053.1: 게시글 수정 — 본인 작성 글만(관리자는 예외) 수정 가능.
// body_json(정본)을 받아 서버가 HTML을 다시 계산해 저장하고, 이전 본문에서
// 빠진 이미지는 즉시 삭제하지 않고 image_cleanup_queue에 적재한다(Storage
// Garbage Collection — src/lib/imageGc.ts).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { id, postId } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: existing, error: existingError } = await requester.scopedClient
    .from("posts")
    .select("id, author_id, body_json")
    .eq("id", postId)
    .eq("board_id", id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "게시글을 찾을 수 없어요." }, { status: 404 });
  }

  if (existing.author_id !== requester.member.id && !requester.member.is_admin) {
    return NextResponse.json({ error: "본인이 작성한 글만 수정할 수 있어요." }, { status: 403 });
  }

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, name, category, board_type")
    .eq("id", id)
    .single();

  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const definition = resolveBoardDefinition(board);

  const body = await request.json();
  const title = body?.title as string | undefined;
  const bodyJson = body?.bodyJson as JSONContent | undefined;
  const isDocentPost = Boolean(body?.isDocentPost);
  const featuredImageUrl = (body?.featuredImageUrl as string | null | undefined) ?? null;
  const featuredImagePath = (body?.featuredImagePath as string | null | undefined) ?? null;
  const tags =
    definition.tags && Array.isArray(body?.tags)
      ? (body.tags as unknown[])
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => t.trim())
      : [];

  if (!title || !bodyJson) {
    return NextResponse.json({ error: "제목과 내용을 모두 입력해주세요." }, { status: 400 });
  }

  let sanitizedBody: string;
  try {
    sanitizedBody = renderPostHtml(bodyJson);
  } catch {
    return NextResponse.json({ error: "본문 형식이 올바르지 않아요." }, { status: 400 });
  }

  if (sanitizedBody.replace(/<[^>]*>/g, "").trim().length === 0) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }

  let { data: updated, error: updateError } = await requester.scopedClient
    .from("posts")
    .update({
      title,
      body: sanitizedBody,
      body_json: bodyJson,
      featured_image_url: featuredImageUrl,
      featured_image_path: featuredImagePath,
      is_docent_post: isDocentPost,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .select()
    .single();

  // 신규 컬럼이 라이브 DB에 아직 없으면(42703) 레거시 컬럼만으로 재시도.
  if (updateError) {
    ({ data: updated, error: updateError } = await requester.scopedClient
      .from("posts")
      .update({ title, body: sanitizedBody, is_docent_post: isDocentPost })
      .eq("id", postId)
      .select()
      .single());
  }

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "글 수정에 실패했어요.", detail: updateError?.message },
      { status: 500 },
    );
  }

  await enqueueOrphanedImages(requester.scopedClient, postId, existing.body_json as JSONContent | null, bodyJson);

  return NextResponse.json(updated);
}
