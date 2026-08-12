import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: content, error } = await supabase
    .from("docent_contents")
    .select("id, title, keywords, is_free, price, body_url, cover_image, era, figure_name")
    .eq("id", id)
    .single();

  if (error || !content) {
    return NextResponse.json(
      { error: "콘텐츠를 찾을 수 없어요." },
      { status: 404 },
    );
  }

  if (content.is_free) {
    return NextResponse.json({ ...content, purchased: true });
  }

  const requester = await getRequestMember(request);

  let purchased = false;
  if (requester) {
    const { data: purchase } = await requester.scopedClient
      .from("docent_purchases")
      .select("id")
      .eq("content_id", id)
      .eq("member_id", requester.member.id)
      .eq("payment_status", "confirmed")
      .maybeSingle();
    purchased = !!purchase;
  }

  if (purchased) {
    return NextResponse.json({ ...content, purchased: true });
  }

  return NextResponse.json({
    id: content.id,
    title: content.title,
    keywords: content.keywords,
    is_free: content.is_free,
    price: content.price,
    cover_image: content.cover_image,
    era: content.era,
    figure_name: content.figure_name,
    body_url: null,
    purchased: false,
  });
}
