"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Category = "silostore" | "salon";

type LibraryItem = {
  id: string;
  price_charged: number;
  purchased_at: string;
  docent_contents: {
    id: string;
    title: string;
    cover_image: string | null;
    category: Category;
  } | null;
};

const TABS: { key: Category; label: string }[] = [
  { key: "silostore", label: "사일로상점" },
  { key: "salon", label: "살롱데상" },
];

export default function DocentLibraryPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [tab, setTab] = useState<Category>("silostore");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session) return;

    async function load() {
      setFetching(true);
      const { data } = await supabase
        .from("docent_purchases")
        .select(
          "id, price_charged, purchased_at, docent_contents(id, title, cover_image, category)",
        )
        .eq("payment_status", "confirmed")
        .order("purchased_at", { ascending: false });

      setItems((data as unknown as LibraryItem[]) ?? []);
      setFetching(false);
    }

    load();
  }, [session]);

  if (authLoading || !session) return null;

  const filtered = items.filter(
    (item) => item.docent_contents?.category === tab,
  );

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">내 서재</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {TABS.map((t) => {
          const count = items.filter(
            (item) => item.docent_contents?.category === t.key,
          ).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                tab === t.key
                  ? "border-gray-800 text-gray-900 font-medium"
                  : "border-transparent text-gray-500"
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">아직 구매한 콘텐츠가 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/docent/${item.docent_contents?.id}`}
              className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {item.docent_contents?.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.docent_contents.cover_image}
                  alt={item.docent_contents.title}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-3">
                <h2 className="font-semibold">
                  {item.docent_contents?.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(item.purchased_at).toLocaleDateString()} 구매
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
