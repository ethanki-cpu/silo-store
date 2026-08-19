import { NextRequest, NextResponse } from "next/server";

// EPIC-133: 인스타그램 원본 미디어 URL을 <img>/<video> src에 직접 노출하면
// (1) 서명 만료(HOTFIX-134에서 확인된 403) 전까지만 잠깐 뜨거나,
// (2) 애드블락/CORS로 아예 안 뜨는 경우가 많다 — 우리 서버가 대신
// 다운로드해 릴레이(reverse proxy)하면 두 문제 모두 회피된다.
//
// 이 엔드포인트는 <img src="/api/proxy-ig?url=...">처럼 브라우저가 직접
// 불러오므로 Authorization 헤더를 못 보낸다 — 로그인 여부로 막을 수 없는
// 대신, 인스타그램이 실제로 소유한 CDN 호스트만 허용하는 화이트리스트가
// 유일한 SSRF 방어선이다(src/app/api/embed-thumbnail/route.ts의
// ALLOWED_HOSTS와 동일한 패턴).
const ALLOWED_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com|fbsbx\.com)$/i;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") ?? "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL 형식이 올바르지 않아요." }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOST.test(parsed.hostname)) {
    return NextResponse.json({ error: "허용되지 않은 호스트예요." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Referer: "https://www.instagram.com/",
      },
    });
  } catch {
    return NextResponse.json({ error: "미디어를 가져오지 못했어요." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "미디어를 가져오지 못했어요." }, { status: upstream.status || 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      // 위 모듈 주석대로 원본 URL 자체가 만료되므로, 우리 캐시도 그보다
      // 짧게 잡아 만료된 원본을 계속 릴레이하는 일이 없게 한다.
      "Cache-Control": "public, max-age=1800",
    },
  });
}
