import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import {
  HomeCurationSlider,
  type HomeCurationSliderItem,
} from "@/components/HomeCurationSlider";
import type { CategoryDomain } from "@/app/admin/navigation/shared";
import { PageEditButton } from "@/components/admin/PageEditButton";

// EPIC-032: admin/navigation/settings("홈페이지 설정 관리")가 저장한
// site_settings.hero_slideshow를 조회해 최상단 히어로 배너를 렌더링한다.
// Server Component에서 직접 조회 — 클라이언트 쪽 깜빡임 없이 첫 렌더부터
// 완성된 화면을 내려준다. 테이블이 아직 라이브에 없거나(EPIC-026 후속)
// 슬라이드가 비어 있으면 기본 히어로 UI로 대체된다.
//
// EPIC-041: site_settings.home_curation(블록 배열)을 조회해 저장된 순서대로
// <HomeCurationSlider> 섹션을 렌더링한다. domain="shop" 블록은 items 테이블을
// 실제로 조회하고, 그 외 도메인(salon/collection/docent)은 아직 각 화면의
// 실제 조회 로직을 이 페이지에 옮기지 않아 UI 확인용 더미 데이터로 대체한다
// (schema를 추측해 잘못 조회하지 않기 위함 — NEXT_TASK.md 참고).

type SlideItem = { imageUrl: string; title: string; description: string };
type HeroSlideshowSetting = {
  slides?: SlideItem[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
  /** @deprecated EPIC-039: wallpaperUrls(배열)로 대체. 구버전 데이터 호환용. */
  wallpaperUrl?: string;
  wallpaperUrls?: string[];
};

type HomeCurationBlock = {
  id: string;
  title: string;
  domain: CategoryDomain;
  slugs: string[];
  sortBy: "latest" | "popular";
};
type HomeCurationSetting = {
  blocks?: HomeCurationBlock[];
  /** @deprecated EPIC-041: blocks(배열)로 대체. 구버전 단일 객체 호환용. */
  domain?: CategoryDomain;
  /** @deprecated EPIC-041 */
  slugs?: string[];
  /** @deprecated EPIC-041 */
  sortBy?: "latest" | "popular";
};

function makeDummyCurationItems(title: string): HomeCurationSliderItem[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `dummy-${title}-${i}`,
    title: `${title} 더미 상품 ${i + 1}`,
    href: "#",
  }));
}

async function fetchCurationItems(
  block: HomeCurationBlock,
): Promise<HomeCurationSliderItem[]> {
  if (block.domain === "shop") {
    let query = supabase
      .from("items")
      .select("id, name, photo_url, category")
      .eq("status", "available")
      .limit(10);
    if (block.slugs.length > 0) {
      query = query.in("category", block.slugs);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return makeDummyCurationItems(block.title || "상점");
    }
    return data.map((item) => ({
      id: item.id,
      title: item.name,
      imageUrl: item.photo_url ?? undefined,
      href: `/shop/${item.id}`,
    }));
  }

  // EPIC-041 후속: salon/collection/docent 도메인의 실제 조회는 각 화면의
  // 스키마를 확인한 뒤 별도로 연결해야 한다 — 지금은 더미로 대체.
  return makeDummyCurationItems(block.title || block.domain);
}

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

  const { data: curationRow } = await supabase
    .from("site_settings")
    .select("setting_value")
    .eq("setting_key", "home_curation")
    .maybeSingle();

  const curationSetting = curationRow?.setting_value as HomeCurationSetting | null;
  // EPIC-041: 구버전 단일 객체({ domain, slugs, sortBy })는 블록 1개로 취급.
  const curationBlocks: HomeCurationBlock[] =
    curationSetting?.blocks && curationSetting.blocks.length > 0
      ? curationSetting.blocks
      : curationSetting?.domain
        ? [
            {
              id: "legacy",
              title: "홈 큐레이션",
              domain: curationSetting.domain,
              slugs: curationSetting.slugs ?? [],
              sortBy: curationSetting.sortBy ?? "latest",
            },
          ]
        : [];

  const curationSections = await Promise.all(
    curationBlocks.map(async (block) => ({
      block,
      items: await fetchCurationItems(block),
    })),
  );

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

      {curationSections.map(({ block, items }) => (
        <HomeCurationSlider
          key={block.id}
          title={block.title || "큐레이션"}
          items={items}
        />
      ))}
      </div>
    </>
  );
}
