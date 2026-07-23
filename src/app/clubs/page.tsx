import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

const WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const WEEKDAY_LABEL: Record<string, string> = {
  mon: "월요일",
  tue: "화요일",
  wed: "수요일",
  thu: "목요일",
  fri: "금요일",
  sat: "토요일",
  sun: "일요일",
};

type Club = {
  id: string | number;
  weekday: string;
  name: string;
  description: string | null;
  base_price: number;
};

export default async function ClubsPage() {
  const { data, error } = await supabase
    .from("clubs")
    .select("id, weekday, name, description, base_price");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">클럽 목록</h1>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">데이터를 불러오지 못했어요.</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-500">등록된 클럽이 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data as Club[])
            .slice()
            .sort(
              (a, b) =>
                WEEKDAY_ORDER.indexOf(
                  a.weekday as (typeof WEEKDAY_ORDER)[number],
                ) -
                WEEKDAY_ORDER.indexOf(
                  b.weekday as (typeof WEEKDAY_ORDER)[number],
                ),
            )
            .map((club) => (
              <Link
                key={club.id}
                href={`/clubs/${club.id}`}
                className="block rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-medium text-blue-600">
                  {WEEKDAY_LABEL[club.weekday] ?? club.weekday}
                </p>
                <h2 className="text-lg font-semibold mt-1">{club.name}</h2>
                <p className="text-sm text-gray-600 mt-2">
                  참여비: {club.base_price?.toLocaleString()}원
                </p>
              </Link>
            ))}
        </div>
      )}
    </main>
  );
}
