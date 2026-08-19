import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { scrapeInstagramPost } from "@/lib/instagramScraper";

// EPIC-133: 인스타그램 permalink를 받아 서버가 대신 스크래핑한 뒤 미디어
// 배열(JSON)만 돌려준다 — src/app/api/embed-thumbnail/route.ts와 동일하게
// 클라이언트가 임의 URL을 넘겨 우리 서버가 요청을 대신 보내는 구조라
// (SSRF 위험) instagram.com 게시물 URL인지 먼저 검증하고, 익명 요청으로
// 우리 서버가 오픈 스크래퍼처럼 남용되지 않도록 로그인을 요구한다
// (embed-thumbnail과 동일한 보호 수준).
const POST_URL_PATTERN = /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/i;

export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url") ?? "";
  if (!POST_URL_PATTERN.test(url)) {
    return NextResponse.json({ error: "인스타그램 게시물 URL이 아니에요." }, { status: 400 });
  }

  const items = await scrapeInstagramPost(url);
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "미디어를 찾지 못했어요. 비공개 게시물이거나 인스타그램이 일시적으로 차단했을 수 있어요." },
      { status: 404 },
    );
  }

  return NextResponse.json({ items });
}
