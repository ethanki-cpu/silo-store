import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// 홈페이지 설정 — 등록된 아이콘 파일 용량 표시용. 브라우저에서 R2/Supabase로 직접 HEAD를 보내면 CORS로
// 막힐 수 있어 서버가 대신 조회한다. SSRF를 막기 위해 우리 R2 공개 주소/Supabase 호스트만 허용한다.
const MAX_URLS = 150;

function allowedHosts(): string[] {
  const hosts: string[] = [];
  for (const v of [process.env.R2_PUBLIC_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    try {
      if (v) hosts.push(new URL(v).host);
    } catch {
      /* 무시 */
    }
  }
  return hosts;
}

async function sizeOf(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    const len = Number(head.headers.get("content-length"));
    if (head.ok && Number.isFinite(len) && len > 0) return len;
    const ranged = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(8000) });
    const total = /\/(\d+)$/.exec(ranged.headers.get("content-range") ?? "")?.[1];
    if (total) return Number(total);
    const full = Number(ranged.headers.get("content-length"));
    return ranged.ok && Number.isFinite(full) && full > 1 ? full : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester?.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  let body: { urls?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }
  const urls = Array.isArray(body.urls) ? [...new Set(body.urls.filter((u): u is string => typeof u === "string" && u.length > 0))] : [];
  if (urls.length === 0 || urls.length > MAX_URLS) {
    return NextResponse.json({ error: `urls는 1~${MAX_URLS}개여야 해요.` }, { status: 400 });
  }

  const hosts = allowedHosts();
  const sizes: Record<string, number | null> = {};
  await Promise.all(
    urls.map(async (u) => {
      try {
        const parsed = new URL(u);
        sizes[u] = parsed.protocol === "https:" && hosts.includes(parsed.host) ? await sizeOf(u) : null;
      } catch {
        sizes[u] = null;
      }
    }),
  );
  return NextResponse.json({ sizes });
}
