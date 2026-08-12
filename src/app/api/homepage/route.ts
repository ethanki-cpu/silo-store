// EPIC-094(요구사항 1.1): Headless 홈페이지 API — 향후 네이티브 앱 전환을
// 대비해 웹 프론트엔드(page.tsx)가 쓰는 것과 같은 site_settings.hero_slideshow
// (이미 EPIC-092에서 { pc, mobile } 구조로 분리돼 있다 — src/lib/heroSlideshow.ts)
// 데이터를 REST로도 노출한다.
//
// - device 파라미터 없음(웹): pc_config/mobile_config를 한 번에 내려준다 —
//   기기 판별로 캐시가 쪼개지지 않도록(같은 URL, 같은 응답을 모든 기기가
//   공유) 클라이언트가 CSS(Media Query) 단위로 화면을 나눠 쓰는 걸 전제로 한다.
// - device=app: 순수 mobile_config만(+ 홈 Page Builder 모듈) 가볍게 반환 —
//   네이티브 앱은 PC 레이아웃을 렌더링할 일이 없으므로 페이로드에서 아예 뺀다.
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { normalizeHeroSlideshow } from "@/lib/heroSlideshow";
import { fetchPublishedPageBySlug } from "@/lib/pageBuilder";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const device = request.nextUrl.searchParams.get("device");

  const { data, error } = await supabase
    .from("site_settings")
    .select("setting_value")
    .eq("setting_key", "hero_slideshow")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { pc, mobile } = normalizeHeroSlideshow(data?.setting_value ?? null);
  const homePage = await fetchPublishedPageBySlug("home");
  const modules = homePage?.modules ?? [];

  if (device === "app") {
    return NextResponse.json({ mobile_config: mobile, modules });
  }

  return NextResponse.json({ pc_config: pc, mobile_config: mobile, modules });
}
