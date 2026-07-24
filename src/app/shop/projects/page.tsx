import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

const INDUSTRY_LABELS: Record<string, string> = {
  photo_studio: "사진스튜디오",
  perfume_shop: "퍼스널 컬러 샵/향수 소품샵",
  doll_shop: "봉제인형샵",
  pizza_shop: "화덕 피자식당",
  other: "기타",
};

const INDUSTRY_ORDER = Object.keys(INDUSTRY_LABELS);

export default async function StylingProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string }>;
}) {
  const { industry: industryParam } = await searchParams;
  const industry =
    industryParam && INDUSTRY_LABELS[industryParam] ? industryParam : null;

  let query = supabase
    .from("styling_projects")
    .select("id, client_name, industry, concept, cover_image, created_at")
    .order("created_at", { ascending: false });

  if (industry) {
    query = query.eq("industry", industry);
  }

  const { data, error } = await query;

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">공간 스타일링 포트폴리오</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/shop/projects"
          className={`rounded-full px-3 py-1.5 text-sm border ${
            !industry
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          전체
        </Link>
        {INDUSTRY_ORDER.map((key) => (
          <Link
            key={key}
            href={`/shop/projects?industry=${key}`}
            className={`rounded-full px-3 py-1.5 text-sm border ${
              industry === key
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {INDUSTRY_LABELS[key]}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">데이터를 불러오지 못했어요.</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-500">등록된 프로젝트가 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((project) => (
            <Link
              key={project.id}
              href={`/shop/projects/${project.id}`}
              className="rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {project.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.cover_image}
                  alt={project.client_name}
                  className="w-full aspect-square object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-lg font-semibold">
                  {project.client_name}
                </h2>
                <p className="text-xs text-blue-600 mt-0.5">
                  {INDUSTRY_LABELS[project.industry] ?? project.industry}
                </p>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {project.concept}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
