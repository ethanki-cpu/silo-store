import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PageEditButton } from "@/components/admin/PageEditButton";

export const dynamic = "force-dynamic";

const ERA_LABELS: Record<string, string> = {
  renaissance: "Renaissance",
  baroque: "Baroque",
  rococo: "Rococo",
  neoclassic: "NeoClassicism",
  empire: "Regency",
  victorian: "Victoria",
  art_nouveau: "Art Nouveau",
  art_deco: "Art Deco",
  beat_generation: "Beat Generation",
  counter_culture: "CounterCulture",
  digital: "Digital",
};

const ERA_ORDER = Object.keys(ERA_LABELS);

type Content = {
  id: string;
  title: string;
  cover_image: string | null;
  is_free: boolean;
  price: number;
  era: string | null;
  created_at: string;
};

function ContentCard({ content }: { content: Content }) {
  return (
    <Link
      href={`/docent/${content.id}`}
      className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow block"
    >
      {content.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.cover_image}
          alt={content.title}
          className="w-full aspect-video object-cover"
        />
      )}
      <div className="p-3">
        <h3 className="font-medium text-sm">{content.title}</h3>
        <p className="text-xs mt-1">
          {content.is_free ? (
            <span className="text-green-600 font-medium">무료</span>
          ) : (
            <span className="text-gray-600">{content.price.toLocaleString()}원</span>
          )}
        </p>
      </div>
    </Link>
  );
}

export default async function DocentCollectionsPage() {
  const { data: contents, error } = await supabase
    .from("docent_contents")
    .select("id, title, cover_image, is_free, price, era, created_at")
    .not("era", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <p className="text-red-600">데이터를 불러오지 못했어요.</p>
      </main>
    );
  }

  const items = (contents ?? []) as Content[];

  if (items.length === 0) {
    return (
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-4">온라인 도슨트 라이브러리</h1>
        <p className="text-gray-500">
          아직 시대(era)가 지정된 콘텐츠가 없어요. 곧 채워질 예정이에요.
        </p>
      </main>
    );
  }

  const contentIds = items.map((c) => c.id);
  const { data: popularity } = await supabase
    .from("docent_content_popularity")
    .select("content_id, purchase_count")
    .in("content_id", contentIds);

  const purchaseCountById = new Map(
    (popularity ?? []).map((p) => [p.content_id, p.purchase_count as number]),
  );

  function sortByPopularity(list: Content[]) {
    return [...list].sort(
      (a, b) =>
        (purchaseCountById.get(b.id) ?? 0) - (purchaseCountById.get(a.id) ?? 0),
    );
  }

  const latest = items[0];
  const popularOverall = sortByPopularity(items).slice(0, 5);

  const byEra = new Map<string, Content[]>();
  for (const item of items) {
    if (!item.era) continue;
    const list = byEra.get(item.era) ?? [];
    list.push(item);
    byEra.set(item.era, list);
  }

  return (
    <>
      <PageEditButton slug="docent-collections" />
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">온라인 도슨트 라이브러리</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">최신글</h2>
        <div className="max-w-sm">
          <ContentCard content={latest} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">전체 인기글</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {popularOverall.map((c) => (
            <ContentCard key={c.id} content={c} />
          ))}
        </div>
      </section>

      <h2 className="text-lg font-semibold mb-3">하위 게시판</h2>
      <div className="space-y-8">
        {ERA_ORDER.map((era) => {
          const eraItems = byEra.get(era);
          return (
            <section key={era} id={`era-${era}`}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                {ERA_LABELS[era]}
              </h3>
              {!eraItems || eraItems.length === 0 ? (
                <p className="text-xs text-gray-400">
                  아직 등록된 콘텐츠가 없어요.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {sortByPopularity(eraItems)
                    .slice(0, 3)
                    .map((c) => (
                      <ContentCard key={c.id} content={c} />
                    ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      </main>
    </>
  );
}
