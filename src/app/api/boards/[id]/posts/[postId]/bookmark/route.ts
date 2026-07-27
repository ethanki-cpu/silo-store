import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// Board Engine(EPIC-047): 북마크 토글 — likes/route.ts와 동일한 own-row
// 토글 패턴이지만 like_count 동기화나 포인트 적립이 없어 더 단순하다.
// post_bookmarks가 라이브 DB에 아직 없으면(마이그레이션 전) 502 대신
// 사용자에게 안내 메시지를 보여준다.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { postId } = await params;

  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data: existing, error: selectError } = await requester.scopedClient
    .from("post_bookmarks")
    .select("id")
    .eq("post_id", postId)
    .eq("member_id", requester.member.id)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json(
      { error: "북마크 기능을 아직 사용할 수 없어요." },
      { status: 503 },
    );
  }

  if (existing) {
    await requester.scopedClient
      .from("post_bookmarks")
      .delete()
      .eq("id", existing.id);

    return NextResponse.json({ bookmarked: false });
  }

  await requester.scopedClient
    .from("post_bookmarks")
    .insert({ post_id: postId, member_id: requester.member.id });

  return NextResponse.json({ bookmarked: true });
}
