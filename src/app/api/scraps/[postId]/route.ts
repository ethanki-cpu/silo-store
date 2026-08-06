import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-085: Frictionless Archiving — 원클릭 스크랩 토글/조회. own-row RLS가
// 이미 auth.uid() = user_id로 강제하므로(docs/sql/EPIC-085-user-scraps.sql),
// 여기서는 scopedClient로 그 위임을 그대로 받는다(다른 own-row API들과
// 동일한 패턴 — serverAuth.ts getRequestMember 참고).

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const requester = await getRequestMember(request);
  // 비로그인 사용자도 이 게시글을 볼 수 있어야 하므로(스크랩 안 된 상태로
  // 버튼만 보임), 401 대신 scraped:false로 응답한다.
  if (!requester) {
    return NextResponse.json({ scraped: false });
  }

  const { data, error } = await requester.scopedClient
    .from("user_scraps")
    .select("id")
    .eq("user_id", requester.userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "스크랩 상태를 확인하지 못했어요." }, { status: 500 });
  }

  return NextResponse.json({ scraped: Boolean(data) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: existing, error: selectError } = await requester.scopedClient
    .from("user_scraps")
    .select("id")
    .eq("user_id", requester.userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json({ error: "스크랩 처리에 실패했어요." }, { status: 500 });
  }

  if (existing) {
    const { error: deleteError } = await requester.scopedClient
      .from("user_scraps")
      .delete()
      .eq("id", existing.id);
    if (deleteError) {
      return NextResponse.json({ error: "스크랩 취소에 실패했어요." }, { status: 500 });
    }
    return NextResponse.json({ scraped: false });
  }

  const { error: insertError } = await requester.scopedClient
    .from("user_scraps")
    .insert({ user_id: requester.userId, post_id: postId });
  if (insertError) {
    return NextResponse.json({ error: "스크랩에 실패했어요." }, { status: 500 });
  }
  return NextResponse.json({ scraped: true });
}
