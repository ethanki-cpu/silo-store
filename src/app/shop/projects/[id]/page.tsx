import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PageEditButton } from "@/components/admin/PageEditButton";

export const dynamic = "force-dynamic";

const INDUSTRY_LABELS: Record<string, string> = {
  photo_studio: "사진스튜디오",
  perfume_shop: "퍼스널 컬러 샵/향수 소품샵",
  doll_shop: "봉제인형샵",
  pizza_shop: "화덕 피자식당",
  other: "기타",
};

export default async function StylingProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("styling_projects")
    .select(
      "id, client_name, industry, industry_other_label, concept, location, cover_image, project_date",
    )
    .eq("id", id)
    .single();

  if (error || !project) {
    return (
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <p className="text-red-600">프로젝트를 찾을 수 없어요.</p>
      </main>
    );
  }

  const [{ data: media }, { data: linkedItems }] = await Promise.all([
    supabase
      .from("styling_project_media")
      .select("id, media_type, media_url, caption, sort_order")
      .eq("project_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("styling_project_items")
      .select("id, items(id, name, photo_url, price)")
      .eq("project_id", id),
  ]);

  const photos = (media ?? []).filter((m) => m.media_type === "photo");
  const videos = (media ?? []).filter((m) => m.media_type === "video");

  const items = (
    (linkedItems ?? []) as unknown as {
      id: string;
      items: { id: string; name: string; photo_url: string | null; price: number } | null;
    }[]
  ).filter((li) => li.items !== null);

  const industryLabel =
    project.industry === "other"
      ? project.industry_other_label ?? "기타"
      : (INDUSTRY_LABELS[project.industry] ?? project.industry);

  return (
    <>
      <PageEditButton slug="shop-projects-id" />
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
      {project.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.cover_image}
          alt={project.client_name}
          className="w-full aspect-video object-cover rounded-lg mb-4"
        />
      )}

      <p className="text-xs font-medium text-blue-600">{industryLabel}</p>
      <h1 className="text-2xl font-bold mt-1">{project.client_name}</h1>
      <p className="text-sm text-gray-500 mt-1">
        {[project.location, project.project_date]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="mt-4 mb-8 rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-500 mb-2">컨셉</p>
        <p className="text-gray-800 whitespace-pre-wrap">{project.concept}</p>
      </div>

      {photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">사진</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.media_url}
                  alt={p.caption ?? ""}
                  className="w-full aspect-square object-cover"
                />
                {p.caption && (
                  <p className="text-xs text-gray-500 mt-1">{p.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">영상</h2>
          <div className="space-y-4">
            {videos.map((v) => (
              <div key={v.id}>
                <video
                  src={v.media_url}
                  controls
                  className="w-full rounded-lg bg-black"
                />
                {v.caption && (
                  <p className="text-xs text-gray-500 mt-1">{v.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">사용 물품</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((li) => (
              <Link
                key={li.id}
                href={`/shop/${li.items!.id}`}
                className="rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {li.items!.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={li.items!.photo_url}
                    alt={li.items!.name}
                    className="w-full aspect-square object-cover"
                  />
                )}
                <div className="p-3">
                  <p className="text-sm font-medium">{li.items!.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {li.items!.price.toLocaleString()}원
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      </main>
    </>
  );
}
