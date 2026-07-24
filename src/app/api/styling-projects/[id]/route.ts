import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";

const VALID_INDUSTRIES = [
  "photo_studio",
  "perfume_shop",
  "doll_shop",
  "pizza_shop",
  "other",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("styling_projects")
    .select(
      "id, client_name, industry, industry_other_label, concept, location, cover_image, project_date, created_at",
    )
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const [{ data: media }, { data: items }] = await Promise.all([
    supabase
      .from("styling_project_media")
      .select("id, media_type, media_url, caption, sort_order")
      .eq("project_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("styling_project_items")
      .select("id, item_id, items(name, photo_url)")
      .eq("project_id", id),
  ]);

  return NextResponse.json({
    ...project,
    media: media ?? [],
    items: items ?? [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  if (!requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 수정할 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body?.clientName !== undefined) update.client_name = body.clientName;
  if (body?.industry !== undefined) {
    if (!VALID_INDUSTRIES.includes(body.industry)) {
      return NextResponse.json(
        { error: "유효하지 않은 industry 값이에요." },
        { status: 400 },
      );
    }
    update.industry = body.industry;
  }
  if (body?.industryOtherLabel !== undefined)
    update.industry_other_label = body.industryOtherLabel || null;
  if (body?.concept !== undefined) update.concept = body.concept;
  if (body?.location !== undefined) update.location = body.location || null;
  if (body?.coverImage !== undefined)
    update.cover_image = body.coverImage || null;
  if (body?.projectDate !== undefined)
    update.project_date = body.projectDate || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "수정할 내용이 없어요." },
      { status: 400 },
    );
  }

  const { data: project, error: updateError } = await requester.scopedClient
    .from("styling_projects")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (updateError || !project) {
    return NextResponse.json(
      { error: "수정에 실패했어요.", detail: updateError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(project);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  if (!requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 삭제할 수 있어요." },
      { status: 403 },
    );
  }

  await requester.scopedClient
    .from("styling_project_media")
    .delete()
    .eq("project_id", id);

  await requester.scopedClient
    .from("styling_project_items")
    .delete()
    .eq("project_id", id);

  const { error: deleteError } = await requester.scopedClient
    .from("styling_projects")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "삭제에 실패했어요.", detail: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
