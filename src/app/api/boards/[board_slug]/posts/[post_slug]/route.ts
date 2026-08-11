import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier, canReadBoard, RANK_LABELS } from "@/lib/serverAuth";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { renderPostHtml, type JSONContent } from "@/lib/blockEditorCore";
import { resolveFallbackEmbedThumbnail } from "@/lib/embedThumbnail";
import { enqueueOrphanedImages, enqueueAllImages } from "@/lib/imageGc";
import { fetchBoard } from "@/lib/boardFetch";
import { slugify } from "@/lib/slugify";
import { fetchAdditionalBoardSlugs, syncPostBoards } from "@/lib/postBoards";

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
            .select("id, body, author_id, created_at, parent_id")
            .eq("post_id", postId)
            .order("created_at", { ascending: true })
        : Promise.resolve({
            data: [] as { id: string; body: string; author_id: string; created_at: string; parent_id: string | null }[],
          }),
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
  const commentIds = (comments ?? []).map((c) => c.id);

  // EPIC-089: 댓글 좋아요 — comment_likes를 group by 없이 그냥 전부 읽어와
  // 클라이언트 계산과 동일하게 서버에서 카운트/내 좋아요 여부를 만든다
  // (댓글 수가 페이지당 게시글 하나 단위라 규모가 작아 group by count 대신
  // 이 방식으로도 충분 — posts.like_count 같은 캐시 컬럼을 새로 만들지
  // 않은 이유와 동일).
  const [{ data: profiles }, { data: commentLikes }] = await Promise.all([
    supabase.from("public_profiles").select("id, name, avatar_url").in("id", authorIds),
    commentIds.length > 0
      ? supabase.from("comment_likes").select("comment_id, member_id").in("comment_id", commentIds)
      : Promise.resolve({ data: [] as { comment_id: string; member_id: string }[] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const avatarById = new Map((profiles ?? []).map((p) => [p.id, (p as { avatar_url?: string | null }).avatar_url ?? null]));

  const likeCountByComment = new Map<string, number>();
  const likedCommentIds = new Set<string>();
  for (const like of commentLikes ?? []) {
    likeCountByComment.set(like.comment_id, (likeCountByComment.get(like.comment_id) ?? 0) + 1);
    if (requester && like.member_id === requester.member.id) likedCommentIds.add(like.comment_id);
  }

  // HOTFIX-093-B(요구사항 1.2): 수정 화면이 기존에 골라둔 "추가 게시판"
  // 체크박스를 프리필할 수 있도록 함께 내려준다.
  const additionalBoardSlugs = await fetchAdditionalBoardSlugs(client, postId);

  return NextResponse.json({
    board,
    post: {
      ...normalizedPost,
      view_count: usedRichFields ? (normalizedPost.view_count ?? 0) + 1 : 0,
      tags: definition.tags ? (normalizedPost.tags ?? []) : [],
      author_name: nameById.get(normalizedPost.author_id) ?? "알 수 없음",
      post_number: postNumber ?? null,
      additionalBoardSlugs,
    },
    comments: (comments ?? []).map((c) => ({
      ...c,
      author_name: nameById.get(c.author_id) ?? "알 수 없음",
      author_avatar_url: avatarById.get(c.author_id) ?? null,
      like_count: likeCountByComment.get(c.id) ?? 0,
      liked_by_me: likedCommentIds.has(c.id),
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

  const body = await request.json();
  // HOTFIX-091: 지금까지 이 라우트는 게시글을 (slug, URL의 board_id) 조합
  // 으로만 찾았다 — 이 글이 방금(같은 세션에서 이전 요청으로) 다른
  // 게시판으로 이미 옮겨진 뒤라면, 페이지가 아직 이동하지 않은 상태에서
  // 다시 저장을 시도하거나(더블클릭, 뒤로가기 후 재제출 등) URL의
  // board_slug가 더 이상 실제 소속 게시판과 안 맞아 조회가 실패하고
  // "게시글을 찾을 수 없어요"를 잘못 반환했다. 클라이언트가 이미 알고
  // 있는 진짜 PK(`postId`, edit 페이지가 최초 GET 응답에서 받아둔 값)가
  // 오면 그것 하나만으로 찾는다 — board_id가 그 사이 뭘로 바뀌었든 항상
  // 정확히 그 글을 찾는다. postId가 없는 요청(구버전 클라이언트 등)만
  // 기존 slug+URL board_id 방식으로 폴백한다.
  const requestedPostId = body?.postId as string | undefined;

  let existing: { id: string; author_id: string; body_json: JSONContent | null; slug: string; board_id: string } | null =
    null;
  if (requestedPostId) {
    const { data } = await requester.scopedClient
      .from("posts")
      .select("id, author_id, body_json, slug, board_id")
      .eq("id", requestedPostId)
      .maybeSingle();
    existing = data;
  } else {
    const { board: urlBoard, boardError: urlBoardError } = await fetchBoard(boardSlug);
    if (urlBoardError || !urlBoard) {
      return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
    }
    const { data } = await requester.scopedClient
      .from("posts")
      .select("id, author_id, body_json, slug, board_id")
      .eq("slug", postSlug)
      .eq("board_id", (urlBoard as { id: string }).id)
      .maybeSingle();
    existing = data;
  }

  if (!existing) {
    return NextResponse.json({ error: "게시글을 찾을 수 없어요." }, { status: 404 });
  }

  if (existing.author_id !== requester.member.id && !requester.member.is_admin) {
    return NextResponse.json({ error: "본인이 작성한 글만 수정할 수 있어요." }, { status: 403 });
  }

  const postId = existing.id;

  // definition(카테고리/태그 등)은 이 글이 지금 실제로 속한 게시판 기준으로
  // 계산해야 한다 — URL의 board가 위 이유로 이미 stale할 수 있어 URL 대신
  // existing.board_id로 다시 조회한다(fetchBoard는 UUID도 그대로 받는다).
  const { board, boardError } = await fetchBoard(existing.board_id);
  if (boardError || !board) {
    return NextResponse.json({ error: "게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const definition = resolveBoardDefinition(board);

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

  // EPIC-092(요구사항 1): 관리자만 게시글 "등록 날짜/시간"(created_at)을
  // 직접 덮어쓸 수 있다 — 클라이언트의 is_admin 표시는 UI 게이팅일 뿐이라
  // 여기서 requester.member.is_admin(서버 조회값)을 다시 확인하지 않으면
  // 위조된 요청으로 아무나 created_at을 바꿀 수 있다. 값이 없거나 관리자가
  // 아니면 조용히 무시(에러로 취급하지 않음).
  const requestedCreatedAt = body?.createdAt as string | undefined;
  const createdAtOverride =
    requester.member.is_admin && requestedCreatedAt && !isNaN(new Date(requestedCreatedAt).getTime())
      ? new Date(requestedCreatedAt).toISOString()
      : null;

  if (!title || !bodyJson) {
    return NextResponse.json({ error: "제목과 내용을 모두 입력해주세요." }, { status: 400 });
  }

  // EPIC-079-PHASE-4: "게시될 페이지 선택"에서 다른 게시판을 골랐으면 이
  // 글을 그 게시판으로 옮긴다 — 원래 게시판과 같으면(대부분의 경우) 아무
  // 일도 하지 않는다.
  // HOTFIX-091: "옮기는 중인가"는 URL의 board_slug 문자열이 아니라
  // existing.board_id(이 글이 지금 실제로 속한 게시판)와 비교해서
  // 판정해야 한다 — 같은 게시판을 가리키는 slug와 UUID 두 형태(레거시
  // 링크)가 섞이면 문자열 비교만으론 "다른 게시판"으로 오판해 실제로는
  // 이동이 아닌데도 slug 재발급 로직이 불필요하게 돌 수 있었다.
  // EPIC-089: posts에는 (board_id, slug) 복합 UNIQUE 인덱스
  // (posts_board_slug_unique_idx, epic-079-phase-2-slug.sql)가 있는데, 위
  // targetBoardId 로직은 지금까지 slug를 그대로 들고 옮겼다 — 목적지
  // 게시판에 우연히 같은 slug(짧은 영문 제목이면 흔함, 예: "notice"/
  // "공지")를 가진 글이 이미 있으면 이 UPDATE가 unique violation으로
  // 그대로 실패해 "저장이 전혀 안 되는" 리포트로 이어졌다. 목적지 게시판
  // 안에서만 유일하면 되므로, 충돌할 때만 /api/admin/boards의 slug 재발급
  // 로직과 동일하게 -2, -3 접미사를 붙여 재시도한다(같은 게시판 안에
  // 머무르는 절대다수 케이스는 slug를 전혀 건드리지 않음).
  let targetBoardId: string | null = null;
  let targetSlug: string | null = null;
  if (targetBoardSlug) {
    const { board: targetBoard, boardError: targetBoardError } = await fetchBoard(targetBoardSlug);
    if (targetBoardError || !targetBoard) {
      return NextResponse.json({ error: "옮길 게시판을 찾을 수 없어요." }, { status: 404 });
    }
    const resolvedTargetBoardId = (targetBoard as { id: string }).id;
    if (resolvedTargetBoardId === existing.board_id) {
      // 실제로는 지금 있는 게시판과 같은 곳(문자열만 다른 legacy UUID
      // 링크 등) — 이동이 아니므로 아래 slug 재발급 로직을 건너뛴다.
      targetBoardId = null;
    } else {
      targetBoardId = resolvedTargetBoardId;
    }
  }

  if (targetBoardId) {
    const baseSlug = (existing.slug as string | null) || slugify(title) || postId.slice(0, 8);
    let candidateSlug = baseSlug;
    let suffix = 2;
    while (true) {
      const { data: clash } = await requester.scopedClient
        .from("posts")
        .select("id")
        .eq("board_id", targetBoardId)
        .eq("slug", candidateSlug)
        .maybeSingle();
      if (!clash) break;
      candidateSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    targetSlug = candidateSlug;
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
      ...(targetBoardId ? { board_id: targetBoardId, slug: targetSlug } : {}),
      ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
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
        ...(targetBoardId ? { board_id: targetBoardId, slug: targetSlug } : {}),
        ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
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

  // HOTFIX-093-B(요구사항 1.2): additionalBoardSlugs가 요청에 실려 있으면
  // (빈 배열 포함) 그 값으로 post_boards를 통째로 다시 채운다 — 필드
  // 자체가 없는 요청(구버전 클라이언트 등)은 기존 연결을 건드리지 않는다.
  if (Array.isArray(body?.additionalBoardSlugs)) {
    const additionalBoardSlugs = (body.additionalBoardSlugs as unknown[]).filter(
      (s): s is string => typeof s === "string",
    );
    const primaryBoardId = targetBoardId ?? existing.board_id;
    await syncPostBoards(requester.scopedClient, postId, primaryBoardId, additionalBoardSlugs);
  }

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
