"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PageEditButton } from "@/components/admin/PageEditButton";

type Category = "silostore" | "salon";

type Content = {
  id: string;
  title: string;
  keywords: string | null;
  is_free: boolean;
  price: number;
  cover_image: string | null;
  category: Category;
  figure_name: string | null;
};

const CATEGORY_LABEL: Record<Category, string> = {
  silostore: "사일로상점",
  salon: "살롱데상",
};

function DocentListContent() {
  const searchParams = useSearchParams();
  const category: Category =
    searchParams.get("category") === "salon" ? "salon" : "silostore";

  const [contents, setContents] = useState<Content[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "byFigure">("all");

  useEffect(() => {
    async function load() {
      setFetching(true);
      const { data, error } = await supabase
        .from("docent_contents")
        .select(
          "id, title, keywords, is_free, price, cover_image, category, figure_name",
        )
        .eq("category", category)
        .order("created_at");

      if (error) {
        setError(error.message);
      } else {
        setContents(data ?? []);
      }
      setFetching(false);
    }

    load();
  }, [category]);

  const byFigure = new Map<string, Content[]>();
  for (const c of contents) {
    if (!c.figure_name) continue;
    const list = byFigure.get(c.figure_name) ?? [];
    list.push(c);
    byFigure.set(c.figure_name, list);
  }

  function renderCard(c: Content) {
    return (
      <Link
        key={c.id}
        href={`/docent/${c.id}`}
        className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
      >
        {c.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.cover_image}
            alt={c.title}
            className="w-full aspect-video object-cover"
          />
        )}
        <div className="p-3">
          <h2 className="font-semibold">{c.title}</h2>
          {c.keywords && (
            <p className="text-xs text-gray-500 mt-1">{c.keywords}</p>
          )}
          <p className="text-sm mt-2">
            {c.is_free ? (
              <span className="text-green-600 font-medium">무료</span>
            ) : (
              <span className="text-gray-700">
                {c.price.toLocaleString()}원
              </span>
            )}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">
        온라인 도슨트 · {CATEGORY_LABEL[category]}
      </h1>

      {!fetching && !error && contents.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode("all")}
            className={`rounded-full px-3 py-1.5 text-sm border ${
              viewMode === "all"
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setViewMode("byFigure")}
            className={`rounded-full px-3 py-1.5 text-sm border ${
              viewMode === "byFigure"
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            인물로 보기
          </button>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">데이터를 불러오지 못했어요.</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : contents.length === 0 ? (
        <p className="text-gray-500">등록된 콘텐츠가 없어요.</p>
      ) : viewMode === "all" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {contents.map(renderCard)}
        </div>
      ) : byFigure.size === 0 ? (
        <p className="text-gray-500">
          인물별로 정리된 콘텐츠가 아직 없어요.
        </p>
      ) : (
        <div className="space-y-8">
          {Array.from(byFigure.entries()).map(([figureName, list]) => (
            <div key={figureName}>
              <h2 className="text-lg font-semibold mb-3">{figureName}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {list.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// EPIC-060: /docent는 boards가 아니라 docent_contents 전용 테이블을 쓰는
// 독립 기능(카테고리 전환, 인물별 보기)이라 Page Builder 모듈(Hero+Board)로
// 대체하지 않는다 — page_builder에는 메타데이터 행만 등록해(EPIC-060 SQL
// seed) /admin/pages 목록에 보이게 하고, "페이지 수정" 버튼만 추가한다.
export default function DocentListPage() {
  return (
    <>
      <PageEditButton slug="docent" />
      <Suspense fallback={<main className="flex-1 p-8">불러오는 중...</main>}>
        <DocentListContent />
      </Suspense>
    </>
  );
}
