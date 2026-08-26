import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { GRAPH_API_VERSION } from "@/lib/instagramGraph";

// HOTFIX-147.9-진단(사용자 재신고 — "아직도 첫번째가 영상이 아니다", 여러
// 게시물에서 반복됨): HOTFIX-147.4의 "children을 bare edge로 요청하면
// 순서가 보존된다"는 가설을 실제 Graph API 응답으로 검증한 적이 없었다
// (그 커밋 자체가 "로컬에 토큰이 없어 미검증"이라고 인정) — 이 라우트는
// DB에 아무것도 쓰지 않고, 같은 미디어의 children을 bare/nested 두 방식
// 모두로 조회해 실제로 순서가 다른지, VIDEO가 어디 있는지를 그대로
// 돌려준다. 진단 전용 — 원인 확인 후 삭제 예정.
export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 실행할 수 있어요." }, { status: 403 });
  }

  const accessToken = process.env.IG_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "IG_ACCESS_TOKEN이 설정되지 않았어요." }, { status: 500 });
  }

  const igMediaId = request.nextUrl.searchParams.get("igMediaId");
  if (!igMediaId) {
    return NextResponse.json({ error: "igMediaId 쿼리 파라미터가 필요해요." }, { status: 400 });
  }

  const [bareRes, nestedRes, timestampRes] = await Promise.all([
    fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${igMediaId}?fields=children&access_token=${accessToken}`).then((r) => r.json()),
    fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${igMediaId}?fields=children{id,media_type,media_url,timestamp}&access_token=${accessToken}`).then((r) => r.json()),
    fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${igMediaId}?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${accessToken}`).then((r) => r.json()),
  ]);

  return NextResponse.json({ bare: bareRes, nested: nestedRes, parent: timestampRes });
}
