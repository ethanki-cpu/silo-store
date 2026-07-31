import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { fetchPublishedPageBySlug } from "@/lib/pageBuilder";

// EPIC-032: admin/navigation/settings("홈페이지 설정 관리")가 저장한
// site_settings.hero_slideshow를 조회해 최상단 히어로 배너를 렌더링한다.
// Server Component에서 직접 조회 — 클라이언트 쪽 깜빡임 없이 첫 렌더부터
// 완성된 화면을 내려준다. 테이블이 아직 라이브에 없거나(EPIC-026 후속)
// 슬라이드가 비어 있으면 기본 히어로 UI로 대체된다.
//
// EPIC-078 후속 3차: EPIC-041의 "홈 큐레이션"(site_settings.home_curation,
// <HomeCurationSlider>) 섹션을 완전히 삭제 — 홈페이지는 이제 Page Builder
// 위젯(아래 PageBuilderRenderer)으로 직접 관리되어 더 이상 필요 없다는
// 요청. 위젯이 히어로 슬라이드쇼 바로 다음에 오도록 순서도 그대로 유지.

type SlideItem = { imageUrl: string; title: string; description: string };
type HeroSlideshowSetting = {
  slides?: SlideItem[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
  /** @deprecated EPIC-039: wallpaperUrls(배열)로 대체. 구버전 데이터 호환용. */
  wallpaperUrl?: string;
  wallpaperUrls?: string[];
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
  // EPIC-039: 구버전 단일 wallpaperUrl을 배열로 1회 이전(DB 마이그레이션 없이
  // 읽기 시점에만 대체).
  const wallpaperUrls =
    setting?.wallpaperUrls && setting.wallpaperUrls.length > 0
      ? setting.wallpaperUrls
      : setting?.wallpaperUrl
        ? [setting.wallpaperUrl]
        : [];

  // EPIC-067: page_builder(slug="home")의 published 모듈을 히어로 슬라이드쇼
  // 바로 다음에 이어서 렌더링 — PageEditButton은 있었지만 PageBuilderRenderer가
  // 없어 관리자가 위젯을 구성해도 화면에 반영되지 않던 결함(EPIC-066 발견)을
  // 수정. 기존 히어로 콘텐츠는 그대로 유지하고 그 아래에 배치한다.
  const homePage = await fetchPublishedPageBySlug("home");

  return (
    <>
      <PageEditButton slug="home" />
      <div className="flex-1">
      {slides.length > 0 ? (
        <HeroSlideshow
          slides={slides}
          autoAdvanceSeconds={setting?.autoAdvanceSeconds}
          objectFit={setting?.objectFit}
          wallpaperUrls={wallpaperUrls}
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

      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <PageBuilderRenderer modules={homePage?.modules ?? []} />
      </div>
      </div>
    </>
  );
}
