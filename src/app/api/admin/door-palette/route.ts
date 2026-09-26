import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-166(사용자 지시 — "각 문의 색깔에 맞춰 클릭했을 때 나오는 ambient 색(칼라 팔레트)"): 문 이미지에서 대표 색을 뽑는다.
// R2 이미지에는 CORS 헤더가 없어 브라우저 canvas로는 픽셀을 읽을 수 없으므로(오염된 canvas) 서버가 대신 받아 계산한다. 결과는 위젯 설정에 저장돼
// 방문자는 다시 계산하지 않는다(추가 트래픽 없음). SSRF 방지: 관리자만, 우리 R2/Supabase 공개 호스트의 https 주소만.
const MAX_URLS = 12;
const MAX_BYTES = 12 * 1024 * 1024;

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

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// 반환: [주색(가장 인상적인 색), 보조색, 포인트색, 아주 어두운 배경색] — 문이 투명 PNG면 투명 픽셀은 무시한다.
async function paletteOf(url: string): Promise<string[] | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) return null;
  const { data, info } = await sharp(buf).resize(64, 64, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  type Bin = { n: number; r: number; g: number; b: number; w: number };
  const bins = new Map<number, Bin>();
  let opaque = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3];
    if (a < 128) continue;
    opaque++;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [, s, l] = rgbToHsl(r, g, b);
    // 너무 어둡거나 밝거나 무채색인 점은 팔레트에서 약하게 — 문 사진의 그림자·하이라이트가 주색이 되지 않게
    const w = (0.25 + s) * (l < 0.1 ? 0.15 : l > 0.94 ? 0.2 : 1) * (s < 0.12 ? 0.35 : 1);
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0, w: 0 };
    bin.n++;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bin.w += w;
    bins.set(key, bin);
  }
  if (opaque === 0 || bins.size === 0) return null;
  const ranked = [...bins.values()]
    .map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, score: b.w }))
    .sort((x, y) => y.score - x.score);
  const picks: { r: number; g: number; b: number }[] = [];
  for (const c of ranked) {
    if (picks.every((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) > 70)) picks.push(c);
    if (picks.length === 3) break;
  }
  // 색이 모자라면(단색에 가까운 문) 주색의 색상을 기울여 보조색/포인트색을 만든다.
  const main = picks[0];
  const [h0, s0, l0] = rgbToHsl(main.r, main.g, main.b);
  while (picks.length < 3) {
    const shift = picks.length === 1 ? 24 : -30;
    const [r, g, b] = hslToRgb((h0 + shift + 360) % 360, Math.min(1, s0 + 0.05), Math.min(0.7, Math.max(0.3, l0 + (picks.length === 1 ? 0.08 : -0.08))));
    picks.push({ r, g, b });
  }
  const [dr, dg, db] = hslToRgb(h0, Math.min(0.6, Math.max(0.2, s0 * 0.7)), 0.09);
  return [...picks.map((p) => hex(p.r, p.g, p.b)), hex(dr, dg, db)];
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
  const palettes: Record<string, string[] | null> = {};
  await Promise.all(
    urls.map(async (u) => {
      try {
        const parsed = new URL(u);
        palettes[u] = parsed.protocol === "https:" && hosts.includes(parsed.host) ? await paletteOf(u) : null;
      } catch {
        palettes[u] = null;
      }
    }),
  );
  return NextResponse.json({ palettes });
}
