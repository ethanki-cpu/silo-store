import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { fetchPublishedPageBySlug } from "@/lib/pageBuilder";

export const dynamic = "force-dynamic";

const FLOOR_LABEL: Record<string, string> = {
  "1f_silostore": "1층 사일로상점",
  "2f_salon": "2층 살롱데상",
};

const SHOOT_TYPE_LABEL: Record<string, string> = {
  photo: "사진촬영",
  video: "영상촬영",
};

export default async function RentalPage({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string }>;
}) {
  const { floor: floorParam } = await searchParams;
  const floor = floorParam === "2f_salon" ? "2f_salon" : "1f_silostore";

  const { data: rentalTypes, error } = await supabase
    .from("rental_types")
    .select(
      "id, floor, shoot_type, weekday_price, weekend_price, base_headcount, extra_person_hourly_fee",
    )
    .eq("floor", floor)
    .order("shoot_type");

  // EPIC-067: page_builder(slug="rental") 위젯을 대관 종류 목록 아래에 이어서 렌더링.
  const rentalPage = await fetchPublishedPageBySlug("rental");

  return (
    <>
      <PageEditButton slug="rental" />
      <main className="min-h-screen p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">
        공간 대관 · {FLOOR_LABEL[floor]}
      </h1>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">데이터를 불러오지 못했어요.</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(rentalTypes ?? []).map((rt) => (
            <Link
              key={rt.id}
              href={`/rental/${rt.id}`}
              className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-medium text-blue-600">
                {FLOOR_LABEL[rt.floor] ?? rt.floor}
              </p>
              <h2 className="text-lg font-semibold mt-1">
                {SHOOT_TYPE_LABEL[rt.shoot_type] ?? rt.shoot_type}
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                평일 {rt.weekday_price.toLocaleString()}원 · 주말{" "}
                {rt.weekend_price.toLocaleString()}원 (1시간 기준)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                기준 인원 {rt.base_headcount}명, 초과 시 1인당{" "}
                {rt.extra_person_hourly_fee.toLocaleString()}원/시간
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 pt-12 border-t border-gray-200">
        <PageBuilderRenderer modules={rentalPage?.modules ?? []} />
      </div>
      </main>
    </>
  );
}
