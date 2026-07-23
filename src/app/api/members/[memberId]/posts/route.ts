import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, name")
    .eq("id", memberId)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "회원을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const { data: posts, error } = await requester.scopedClient
    .from("posts")
    .select("id, body, photo_url, visibility, like_count, created_at")
    .is("board_id", null)
    .eq("author_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "글을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    profile,
    posts,
    isOwner: memberId === requester.member.id,
  });
}
