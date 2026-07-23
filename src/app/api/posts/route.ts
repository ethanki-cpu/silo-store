import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

const VALID_VISIBILITY = ["public", "private", "friends"];

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const postBody = body?.body as string | undefined;
  const photoUrl = (body?.photoUrl as string | undefined) || null;
  const visibility = body?.visibility as string | undefined;

  if (!postBody || !visibility || !VALID_VISIBILITY.includes(visibility)) {
    return NextResponse.json(
      { error: "내용과 공개 범위를 올바르게 입력해주세요." },
      { status: 400 },
    );
  }

  const { data: post, error: insertError } = await requester.scopedClient
    .from("posts")
    .insert({
      board_id: null,
      author_id: requester.member.id,
      body: postBody,
      photo_url: photoUrl,
      visibility,
    })
    .select()
    .single();

  if (insertError || !post) {
    return NextResponse.json(
      { error: "글 작성에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  await requester.scopedClient.from("points_ledger").insert({
    member_id: requester.member.id,
    reason: "post",
    points: 5,
    related_id: post.id,
  });

  return NextResponse.json(post);
}
