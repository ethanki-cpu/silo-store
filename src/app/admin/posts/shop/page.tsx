"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// EPIC-028: "[사일로 상점] 카테고리별 글 관리" 실 구현. `items` 테이블
// (docs/database-schema.sql §2)을 데이터 테이블 형태로 조회/관리한다.
// 별도 API Route 없이 브라우저에서 anon key + RLS(admin bypass)로 직접
// CUD하는 방식은 EPIC-023 이후 admin CMS 화면들과 동일한 관례를 따른다.

type ItemStatus = "available" | "rented" | "sold" | "archived";

type ItemCategory =
  | "renaissance"
  | "baroque"
  | "rococo"
  | "neoclassic"
  | "empire"
  | "victorian"
  | "art_nouveau"
  | "art_deco";

type ItemRow = {
  id: string;
  name: string;
  photo_url: string | null;
  price: number;
  category: ItemCategory | null;
  status: ItemStatus;
  created_at: string;
};

const ERA_OPTIONS: { value: ItemCategory; label: string }[] = [
  { value: "renaissance", label: "르네상스" },
  { value: "baroque", label: "바로크" },
  { value: "rococo", label: "로코코" },
  { value: "neoclassic", label: "신고전주의" },
  { value: "empire", label: "리전시(제국·섭정)" },
  { value: "victorian", label: "빅토리아" },
  { value: "art_nouveau", label: "아르누보" },
  { value: "art_deco", label: "아르데코" },
];

const STATUS_LABEL: Record<ItemStatus, string> = {
  available: "판매중",
  rented: "대여중",
  sold: "판매완료",
  archived: "비활성",
};

const STATUS_BADGE_CLASS: Record<ItemStatus, string> = {
  available: "bg-green-100 text-green-700",
  rented: "bg-blue-100 text-blue-700",
  sold: "bg-gray-100 text-gray-600",
  archived: "bg-amber-100 text-amber-700",
};

export default function AdminPostsShopPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<ItemCategory | "all">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    setFetching(true);
    let query = supabase
      .from("items")
      .select("id, name, photo_url, price, category, status, created_at")
      .order("created_at", { ascending: false });

    if (eraFilter !== "all") {
      query = query.eq("category", eraFilter);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
    }
    setItems((data ?? []) as ItemRow[]);
    setFetching(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eraFilter]);

  async function toggleActive(item: ItemRow) {
    setProcessingId(item.id);
    const nextStatus: ItemStatus =
      item.status === "archived" ? "available" : "archived";
    const { error: updateError } = await supabase
      .from("items")
      .update({ status: nextStatus })
      .eq("id", item.id);
    setProcessingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((rows) =>
      rows.map((r) => (r.id === item.id ? { ...r, status: nextStatus } : r)),
    );
  }

  async function handleDelete(item: ItemRow) {
    if (!confirm(`"${item.name}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setProcessingId(item.id);
    const { error: deleteError } = await supabase
      .from("items")
      .delete()
      .eq("id", item.id);
    setProcessingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((rows) => rows.filter((r) => r.id !== item.id));
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setEraFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            eraFilter === "all"
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          전체
        </button>
        {ERA_OPTIONS.map((era) => (
          <button
            key={era.value}
            type="button"
            onClick={() => setEraFilter(era.value)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              eraFilter === era.value
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {era.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-4">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">표시할 물품이 없어요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3">이름</th>
                <th className="py-2 pr-3">시대</th>
                <th className="py-2 pr-3">가격</th>
                <th className="py-2 pr-3">등록일</th>
                <th className="py-2 pr-3">상태</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3">
                    {item.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photo_url}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100" />
                    )}
                  </td>
                  <td className="py-2 pr-3">{item.name}</td>
                  <td className="py-2 pr-3">
                    {ERA_OPTIONS.find((e) => e.value === item.category)?.label ??
                      "-"}
                  </td>
                  <td className="py-2 pr-3">{item.price.toLocaleString()}원</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE_CLASS[item.status]}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        disabled={processingId === item.id}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                      >
                        {item.status === "archived" ? "활성화" : "비활성화"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={processingId === item.id}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
