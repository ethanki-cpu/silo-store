import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { BOARD_RICH_FIELDS, BOARD_LEGACY_FIELDS } from "@/lib/boardLayout";

// EPIC-066: 게시판 복제 — 제목/슬러그/설명/설정/권한/Widget 설정/기본
// 옵션 전부를 원본 그대로 복사하고, slug(=category)만 유니크하게 자동
// 생성한다(요구사항 ①).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  let { data: source, error: sourceError } = await requester.scopedClient
    .from("boards")
    .select(BOARD_RICH_FIELDS)
    .eq("id", id)
    .single();

  if (sourceError) {
    ({ data: source, error: sourceError } = await requester.scopedClient
      .from("boards")
      .select(BOARD_LEGACY_FIELDS)
      .eq("id", id)
      .single());
  }

  if (sourceError || !source) {
    return NextResponse.json({ error: "원본 게시판을 찾을 수 없어요." }, { status: 404 });
  }

  const baseSlug = `${source.category ?? source.id}-copy`;
  let candidateSlug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data: taken } = await requester.scopedClient
      .from("boards")
      .select("id")
      .eq("category", candidateSlug)
      .maybeSingle();

    if (!taken) break;
    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const rest = { ...(source as Record<string, unknown>) };
  delete rest.id;

  const { data: copy, error: insertError } = await requester.scopedClient
    .from("boards")
    .insert({
      ...rest,
      name: `${source.name} 사본`,
      category: candidateSlug,
    })
    .select()
    .single();

  if (insertError || !copy) {
    return NextResponse.json(
      { error: "게시판 복제에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(copy);
}
