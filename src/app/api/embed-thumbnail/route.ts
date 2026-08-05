import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { resolveEmbedThumbnailUrl } from "@/lib/embedThumbnail";
import { EMBED_THUMBNAIL_PROVIDERS } from "@/lib/blockEditorCore";

// EPIC-079-HOTFIX-3: 에디터의 "★ 대표 이미지로 지정" 버튼이 youtube/vimeo/
// instagram 임베드의 실제 썸네일을 조회할 때 쓰는 라우트 — vimeo(oEmbed)/
// instagram(og:image 스크래핑)은 브라우저에서 직접 fetch하면 CORS로
// 막히므로 서버가 대신 요청한다. 클라이언트가 임의 URL을 넘겨 우리 서버가
// 그 URL로 요청을 보내게 되는 구조(SSRF 위험)라, provider별로 허용된
// 도메인(vimeo.com/instagram.com)인지 반드시 먼저 검증한다.
const ALLOWED_HOSTS: Record<string, RegExp> = {
  vimeo: /(^|\.)vimeo\.com$/i,
  instagram: /(^|\.)instagram\.com$/i,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/i,
};

export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider") ?? "";
  const url = searchParams.get("url") ?? "";

  if (!(EMBED_THUMBNAIL_PROVIDERS as readonly string[]).includes(provider) || !url) {
    return NextResponse.json({ error: "지원하지 않는 provider예요." }, { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "URL 형식이 올바르지 않아요." }, { status: 400 });
  }

  const allowedHost = ALLOWED_HOSTS[provider];
  if (!allowedHost || !allowedHost.test(hostname)) {
    return NextResponse.json({ error: "URL이 provider와 일치하지 않아요." }, { status: 400 });
  }

  const thumbnailUrl = await resolveEmbedThumbnailUrl(provider, url);

  if (!thumbnailUrl) {
    return NextResponse.json(
      { error: "썸네일을 찾지 못했어요. 이 게시물/영상은 대표 이미지로 지정할 수 없을 수 있어요." },
      { status: 404 },
    );
  }

  return NextResponse.json({ thumbnailUrl });
}
