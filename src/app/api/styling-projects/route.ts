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

export async function GET() {
  const { data, error } = await supabase
    .from("styling_projects")
    .select(
      "id, client_name, industry, industry_other_label, concept, location, cover_image, project_date, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "포트폴리오 목록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  if (!requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 등록할 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const clientName = body?.clientName as string | undefined;
  const industry = body?.industry as string | undefined;
  const industryOtherLabel = body?.industryOtherLabel as string | undefined;
  const concept = body?.concept as string | undefined;
  const location = body?.location as string | undefined;
  const coverImage = body?.coverImage as string | undefined;
  const projectDate = body?.projectDate as string | undefined;
  const media = body?.media as
    | { mediaType: string; mediaUrl: string; caption?: string }[]
    | undefined;
  const itemIds = body?.itemIds as string[] | undefined;

  if (!clientName || !industry || !concept) {
    return NextResponse.json(
      { error: "client_name, industry, concept은 필수예요." },
      { status: 400 },
    );
  }

  if (!VALID_INDUSTRIES.includes(industry)) {
    return NextResponse.json(
      { error: "유효하지 않은 industry 값이에요." },
      { status: 400 },
    );
  }

  if (industry === "other" && !industryOtherLabel) {
    return NextResponse.json(
      { error: "industry가 other일 때는 industry_other_label이 필요해요." },
      { status: 400 },
    );
  }

  const validMedia = (media ?? []).filter(
    (m) => m.mediaUrl && (m.mediaType === "photo" || m.mediaType === "video"),
  );
  const firstPhoto = validMedia.find((m) => m.mediaType === "photo");

  const { data: project, error: insertError } = await requester.scopedClient
    .from("styling_projects")
    .insert({
      client_name: clientName,
      industry,
      industry_other_label: industry === "other" ? industryOtherLabel : null,
      concept,
      location: location || null,
      cover_image: coverImage || firstPhoto?.mediaUrl || null,
      project_date: projectDate || null,
    })
    .select()
    .single();

  if (insertError || !project) {
    return NextResponse.json(
      { error: "등록에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  if (validMedia.length > 0) {
    const { error: mediaError } = await requester.scopedClient
      .from("styling_project_media")
      .insert(
        validMedia.map((m, idx) => ({
          project_id: project.id,
          media_type: m.mediaType,
          media_url: m.mediaUrl,
          caption: m.caption || null,
          sort_order: idx,
        })),
      );

    if (mediaError) {
      return NextResponse.json(
        {
          error: "프로젝트는 등록됐지만 사진/영상 저장에 실패했어요.",
          detail: mediaError.message,
          project,
        },
        { status: 500 },
      );
    }
  }

  const validItemIds = [...new Set((itemIds ?? []).filter(Boolean))];
  if (validItemIds.length > 0) {
    const { error: itemsError } = await requester.scopedClient
      .from("styling_project_items")
      .insert(
        validItemIds.map((itemId) => ({
          project_id: project.id,
          item_id: itemId,
        })),
      );

    if (itemsError) {
      return NextResponse.json(
        {
          error: "프로젝트는 등록됐지만 사용 물품 연결에 실패했어요.",
          detail: itemsError.message,
          project,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(project);
}
