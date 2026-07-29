import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { WishlistButton } from "@/components/WishlistButton";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { fetchPublishedPageBySlug } from "@/lib/pageBuilder";

export const dynamic = "force-dynamic";

const ERA_LABELS: Record<string, string> = {
  renaissance: "르네상스",
  baroque: "바로크",
  rococo: "로코코",
  neoclassic: "신고전주의",
  empire: "리전시(제국·섭정)",
  victorian: "빅토리아",
  art_nouveau: "아르누보",
  art_deco: "아르데코",
};

const ERA_ORDER = Object.keys(ERA_LABELS);

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ era?: string }>;
}) {
  const { era: eraParam } = await searchParams;
  const era = eraParam && ERA_LABELS[eraParam] ? eraParam : null;

  let query = supabase
    .from("items")
    .select("id, name, photo_url, price, category")
    .eq("status", "available");

  if (era) {
    query = query.eq("category", era);
  }

  const { data, error } = await query;

  // EPIC-067: page_builder(slug="shop") 위젯을 물품 목록 아래에 이어서
  // 렌더링(EPIC-066이 발견한 PageEditButton-only 결함 수정, Phase 1).
  const shopPage = await fetchPublishedPageBySlug("shop");

  return (
    <>
      <PageEditButton slug="shop" />
      <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">사일로상점</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/shop"
          className={`rounded-full px-3 py-1.5 text-sm border ${
            !era
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          전체
        </Link>
        {ERA_ORDER.map((key) => (
          <Link
            key={key}
            href={`/shop?era=${key}`}
            className={`rounded-full px-3 py-1.5 text-sm border ${
              era === key
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {ERA_LABELS[key]}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">데이터를 불러오지 못했어요.</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-500">등록된 물품이 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item) => (
            <Link
              key={item.id}
              href={`/shop/${item.id}`}
              className="relative block rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="absolute top-2 right-2 z-10 rounded-full bg-white/90 w-8 h-8 flex items-center justify-center shadow">
                <WishlistButton itemId={item.id} />
              </span>
              {item.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photo_url}
                  alt={item.name}
                  className="w-full aspect-square object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-lg font-semibold">{item.name}</h2>
                {item.category && ERA_LABELS[item.category] && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    {ERA_LABELS[item.category]}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {item.price.toLocaleString()}원
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 pt-12 border-t border-gray-200">
        <PageBuilderRenderer modules={shopPage?.modules ?? []} />
      </div>
      </main>
    </>
  );
}
