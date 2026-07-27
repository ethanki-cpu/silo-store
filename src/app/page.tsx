import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { HeroSlideshow } from "@/components/HeroSlideshow";

// EPIC-032: admin/navigation/settings("홈페이지 설정 관리")가 저장한
// site_settings.hero_slideshow를 조회해 최상단 히어로 배너를 렌더링한다.
// Server Component에서 직접 조회 — 클라이언트 쪽 깜빡임 없이 첫 렌더부터
// 완성된 화면을 내려준다. 테이블이 아직 라이브에 없거나(EPIC-026 후속)
// 슬라이드가 비어 있으면 기본 히어로 UI로 대체된다.

type SlideItem = { imageUrl: string; title: string; description: string };
type HeroSlideshowSetting = {
  slides?: SlideItem[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
};

export default async function Home() {
  const { data } = await supabase
    .from("site_settings")
    .select("setting_value")
    .eq("setting_key", "hero_slideshow")
    .maybeSingle();

  const setting = data?.setting_value as HeroSlideshowSetting | null;
  const slides = (setting?.slides ?? []).filter(
    (s) => s.imageUrl || s.title || s.description,
  );

  return (
    <div className="flex-1">
      {slides.length > 0 ? (
        <HeroSlideshow
          slides={slides}
          autoAdvanceSeconds={setting?.autoAdvanceSeconds}
          objectFit={setting?.objectFit}
        />
      ) : (
        <section className="flex flex-col items-center justify-center text-center py-32 px-8">
          <h1 className="text-3xl font-bold mb-4">사일로 스토어</h1>
          <p className="max-w-md text-gray-500 mb-8">
            물건과 사람, 취향이 오가는 멤버십 커뮤니티.
          </p>
          <Link
            href="/shop"
            className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm"
          >
            사일로상점 둘러보기
          </Link>
        </section>
      )}
    </div>
  );
}
