import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { renderPostHtml, type JSONContent } from "@/lib/blockEditorCore";
import { resolveFallbackEmbedThumbnail } from "@/lib/embedThumbnail";
import { enqueueOrphanedImages, enqueueAllImages } from "@/lib/imageGc";
import { fetchBoard } from "@/lib/boardFetch";

const richFields =
  "id, board_id, slug, title, body, body_json, featured_image_url, featured_image_path, thumbnail_visible, category, is_docent_post, like_count, is_best, photo_url, tags, view_count, updated_at, author_id, created_at";
const legacyFields =
  "id, board_id, title, body, is_docent_post, like_count, is_best, photo_url, author_id, created_at";

// EPIC-079-PHASE-2: UUID 라우팅(/boards/[id]/[postId])에서 slug 라우팅
// (/boards/[board_slug]/[post_slug])으로 바뀌면서 게시글 조회 키도
// slug(같은 board_id 안에서 UNIQUE)로 바뀐다 — legacy select엔 slug
// 컬럼이 없을 수 있어(마이그레이션 전) 그 경우 id로 한 번 더 시도한다
// (fetchBoard의 UUID 폴백과 동일한 패턴, 이 프로젝트에서 post_slug 자체가
// UUID처럼 보일 일은 거의 없지만 방어적으로 남겨둔다).
async function fetchPost(client: typeof supabase, boardId: string, postSlug: string) {
  let usedRichFields = true;
  let { data: post, error: postError } = await client
    .from("posts")
    .select(richFields)
    .eq("slug", postSlug)
    .eq("board_id", boardId)
    .single();

  if (postError) {
    usedRichFields = false;
    ({ data: post, error: postError } = await client
      .from("posts")
      .select(legacyFields)
      .eq("id", postSlug)
      .eq("board_id", boardId)
      .single());
  }

  return { post, postError, usedRichFields };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string; post_slug: string }> },
) {
  const { board_slug: boardSlug, post_slug: postSlug } = await params;

  // EPIC-070: 서로 의존관계 없는 쿼리를 순차 await 대신 Promise.all로
  // 병렬화 — Vercel 서버리스에서 Supabase 왕복 지연이 그대로 누적되는 게
  // 페이지 로딩이 느린 핵심 원인이었다(posts/route.ts와 동일한 배경).
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

  const definition = resolveBoardDefinition(board);
  const client = requester ? requester.scopedClient : supabase;
  const boardId = (board as { id: string }).id;

  // 게시글 조회 자체는 권한 판정과 무관하게 시작할 수 있어 tier 조회와
  // 동시에 진행하고, 거부 판정이면 아래에서 결과를 버리고 403을 반환한다.
  const [tier, { post, postError, usedRichFields }] = await Promise.all([
    requester ? getTier(requester.member.membership_rank) : Promise.resolve(null),
    fetchPost(client, boardId, postSlug),
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
        slug: string;
        title: string | null;
        body: string | null;
        body_json: JSONContent | null;
        featured_image_url: string | null;
        featured_image_path: string | null;
        thumbnail_visible: boolean | null;
        category: string | null;
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
        slug: (post as { id: string }).id,
        body_json: null as JSONContent | null,
        featured_image_url: null as string | null,
        featured_image_path: null as string | null,
        thumbnail_visible: true as boolean | null,
        category: null as string | null,
        tags: [] as string[] | null,
        view_count: 0 as number | null,
        updated_at: (post as { created_at: string }).created_at,
      };

  const postId = normalizedPost.id;

  // EPIC-070: 서로 독립적인 4개 쿼리(조회수 증가/글 번호/댓글/좋아요 여부)를
  // 병렬화 — 전부 postId/boardId/normalizedPost만 있으면 되고 서로의 결과를
  // 필요로 하지 않는다. EPIC-085: 북마크 여부는 이제 이 응답에 안 담는다 —
  // ScrapButton(user_scraps)이 자기 상태를 스스로 GET /api/scraps/[postId]로
  // 조회하는 자기완결형 컴포넌트로 바뀌어서다(post_bookmarks는 죽은 기능이라 삭제).
  const [, { count: postNumber }, { data: comments }, likedByMe] =
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
        .eq("board_id", boardId)
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
  });
}

// EPIC-053.1: 게시글 수정 — 본인 작성 글만(관리자는 예외) 수정 가능.
// body_json(정본)을 받아 서버가 HTML을 다시 계산해 저장하고, 이전 본문에서
// 빠진 이미지는 즉시 삭제하지 않고 image_cleanup_queue에 적재한다(Storage
// Garbage Collection — src/lib/imageGc.ts).
// EPIC-079-PHASE-2: slug는 URL 안정성을 위해 수정 시 건드리지 않는다(제목이
// 바뀌어도 기존 링크가 계속 살아있어야 함).
// EPIC-079-PHASE-4: 글 수정 폼이 "게시될 페이지 선택" 드롭다운으로 다른
// 게시판을 고를 수 있게 되면서, body.targetBoardSlug가 현재 게시판과 다르면
// posts.board_id를 그 게시판으로 옮긴다(slug 자체는 그대로 유지 — 새
// 게시판 안에서 uniqueness가 다시 검사될 뿐).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string; post_slug: string }> },
) {
  const { board_slug: boardSlug, post_slug: postSlug } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { board, boardError } = await fetchBoard(boardSlug);

  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const boardId = (board as { id: string }).id;

  const { data: existing, error: existingError } = await requester.scopedClient
    .from("posts")
    .select("id, author_id, body_json")
    .eq("slug", postSlug)
    .eq("board_id", boardId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "게시글을 찾을 수 없어요." }, { status: 404 });
  }

  if (existing.author_id !== requester.member.id && !requester.member.is_admin) {
    return NextResponse.json({ error: "본인이 작성한 글만 수정할 수 있어요." }, { status: 403 });
  }

  const postId = existing.id as string;

  const definition = resolveBoardDefinition(board);

  const body = await request.json();
  const title = body?.title as string | undefined;
  const bodyJson = body?.bodyJson as JSONContent | undefined;
  const isDocentPost = Boolean(body?.isDocentPost);
  // EPIC-079-PHASE-5/HOTFIX-3: 사용자가 대표 이미지를 아예 지정하지
  // 않았고(직접 업로드도, 이미지/임베드 ★ 지정도 없음) 본문에 임베드가
  // 있으면 그 썸네일을 대표 이미지로 폴백한다 — findFeaturedImage/
  // findFirstImage(클라이언트, PostForm.tsx)가 이미지/★지정 임베드는 먼저
  // 채워주므로 여기 도달하는 건 그마저도 전혀 없는 글뿐이다.
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
  const targetBoardSlug = body?.targetBoardSlug as string | undefined;

  if (!title || !bodyJson) {
    return NextResponse.json({ error: "제목과 내용을 모두 입력해주세요." }, { status: 400 });
  }

  // EPIC-079-PHASE-4: "게시될 페이지 선택"에서 다른 게시판을 골랐으면 이
  // 글을 그 게시판으로 옮긴다 — 원래 게시판과 같으면(대부분의 경우) 아무
  // 일도 하지 않는다.
  let targetBoardId: string | null = null;
  if (targetBoardSlug && targetBoardSlug !== boardSlug) {
    const { board: targetBoard, boardError: targetBoardError } = await fetchBoard(targetBoardSlug);
    if (targetBoardError || !targetBoard) {
      return NextResponse.json({ error: "옮길 게시판을 찾을 수 없어요." }, { status: 404 });
    }
    targetBoardId = (targetBoard as { id: string }).id;
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
      thumbnail_visible: thumbnailVisible,
      category,
      is_docent_post: isDocentPost,
      tags,
      updated_at: new Date().toISOString(),
      ...(targetBoardId ? { board_id: targetBoardId } : {}),
    })
    .eq("id", postId)
    .select()
    .single();

  // 신규 컬럼이 라이브 DB에 아직 없으면(42703) 레거시 컬럼만으로 재시도.
  if (updateError) {
    ({ data: updated, error: updateError } = await requester.scopedClient
      .from("posts")
      .update({
        title,
        body: sanitizedBody,
        is_docent_post: isDocentPost,
        ...(targetBoardId ? { board_id: targetBoardId } : {}),
      })
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

// EPIC-079: 게시글 삭제 — 본인 작성 글만(관리자는 예외) 삭제 가능.
// comments/likes는 FK ON DELETE CASCADE로 함께 삭제된다(docs/sql/
// epic-079-phase-1.sql에서 확인). 본문 이미지는 즉시 삭제하지 않고
// image_cleanup_queue에 적재한다(수정과 동일한 GC 패턴).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ board_slug: string; post_slug: string }> },
) {
  const { board_slug: boardSlug, post_slug: postSlug } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { board, boardError } = await fetchBoard(boardSlug);

  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const boardId = (board as { id: string }).id;

  const { data: existing, error: existingError } = await requester.scopedClient
    .from("posts")
    .select("id, author_id, body_json")
    .eq("slug", postSlug)
    .eq("board_id", boardId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "게시글을 찾을 수 없어요." }, { status: 404 });
  }

  if (existing.author_id !== requester.member.id && !requester.member.is_admin) {
    return NextResponse.json({ error: "본인이 작성한 글만 삭제할 수 있어요." }, { status: 403 });
  }

  const postId = existing.id as string;

  await enqueueAllImages(requester.scopedClient, postId, existing.body_json as JSONContent | null);

  const { error: deleteError } = await requester.scopedClient
    .from("posts")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    return NextResponse.json(
      { error: "글 삭제에 실패했어요.", detail: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
