import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import {
  BOARD_RICH_FIELDS_EXT,
  BOARD_RICH_FIELDS,
  BOARD_LEGACY_FIELDS,
  type BoardRow,
} from "@/lib/boardLayout";

// EPIC-066: 관리자 게시판 관리 — 목록(전체, 비공개 포함)/생성.
// 공개용 /api/boards(GET)와 달리 인증+is_admin 필수(payments 라우트와 동일
// 패턴), scopedClient로 읽고 쓴다.
export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  let boards: BoardRow[] | null;
  let error: { message: string } | null;

  // EPIC-075: sort_order로 정렬해야 관리자 트리 화면의 드래그앤드롭 순서가
  // 실제로 반영된다 — 마이그레이션(docs/sql/EPIC-075-tree-sort-order.sql) 전
  // 라이브 DB에는 이 컬럼이 없을 수 있어(42703), 그 경우 기존 name 정렬
  // 레거시 경로로 조용히 폴백한다.
  // EPIC-077: topic/thumbnail_url까지 포함한 EXT를 먼저 시도하고, 그 컬럼만
  // 없으면(EPIC-077 마이그레이션 미실행) EPIC-066 필드는 그대로 유지한 채
  // RICH로, 그마저 없으면 LEGACY로 3단 폴백한다.
  ({ data: boards, error } = await requester.scopedClient
    .from("boards")
    .select(BOARD_RICH_FIELDS_EXT)
    .order("sort_order", { ascending: true }));

  if (error) {
    ({ data: boards, error } = await requester.scopedClient
      .from("boards")
      .select(BOARD_RICH_FIELDS)
      .order("sort_order", { ascending: true }));
  }

  if (error) {
    ({ data: boards, error } = await requester.scopedClient
      .from("boards")
      .select(BOARD_LEGACY_FIELDS)
      .order("name"));
  }

  if (error || !boards) {
    return NextResponse.json(
      { error: "게시판 목록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json(boards);
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  const body = await request.json();
  const name = (body?.name as string | undefined)?.trim();
  const category = (body?.category as string | undefined)?.trim();

  if (!name || !category) {
    return NextResponse.json({ error: "제목과 슬러그는 필수예요." }, { status: 400 });
  }

  const { data: existing } = await requester.scopedClient
    .from("boards")
    .select("id")
    .eq("category", category)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 슬러그예요." }, { status: 409 });
  }

  // EPIC-066: 관리자 UI는 "Board Type"(render_type, 레이아웃)만 다루고
  // boards.board_type(등급/쓰기 권한 축, src/lib/serverAuth.ts)은 노출하지
  // 않는다 — 신규 게시판은 가장 보편적인 'topic'(전체 등급 글쓰기 허용,
  // 기존 자유게시판류와 동일)으로 생성한다. patron/artist_promo처럼 특수
  // 권한이 필요한 게시판은 여전히 DB에서 직접 지정해야 한다(NEXT_TASK.md 참고).
  const { data: board, error: insertError } = await requester.scopedClient
    .from("boards")
    .insert({
      name,
      category,
      board_type: "topic",
      min_rank_to_write: 0,
      is_public: body?.is_public ?? true,
      group_key: body?.group_key ?? null,
      render_type: body?.render_type ?? null,
      default_card_type: body?.default_card_type ?? null,
      use_search: body?.use_search ?? true,
      use_like: body?.use_like ?? true,
      use_comment: body?.use_comment ?? true,
      use_view_count: body?.use_view_count ?? true,
      default_page_size: body?.default_page_size ?? 24,
      default_sort: body?.default_sort ?? "latest",
      description: body?.description ?? null,
      widget_settings: body?.widget_settings ?? {},
    })
    .select()
    .single();

  if (insertError || !board) {
    return NextResponse.json(
      { error: "게시판 생성에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(board);
}
