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

const STATUS_BADGE_CLASS: Record<ItemStatus, string> = {
  available: "bg-green-100 text-green-700",
  rented: "bg-blue-100 text-blue-700",
  sold: "bg-gray-100 text-gray-600",
  archived: "bg-amber-100 text-amber-700",
};

// EPIC-096(요구사항 1.1): 정렬 가능한 컬럼. 클릭 시 오름/내림차순을
// 토글하고, 다른 컬럼을 클릭하면 그 컬럼이 새 기준이 된다(진짜 "다중
// 정렬"은 이 화면 규모(items 테이블 하나, 수십~수백 행)에는 과한 UI라 —
// 클릭 한 번으로 바로 바뀌는 단일 기준 정렬 + 매 컬럼 지원으로 실질적인
// 요구(즉각적인 정렬)를 충족한다.
type SortKey = "name" | "category" | "price" | "created_at" | "status";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "available", label: "판매중" },
  { value: "rented", label: "대여중" },
  { value: "sold", label: "판매완료" },
  { value: "archived", label: "비활성" },
];

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (column: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <th className="py-2 pr-3">
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`flex items-center gap-1 hover:text-gray-800 ${active ? "text-gray-900 font-medium" : ""}`}
      >
        {label}
        <span className="text-[10px] text-gray-400">{active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
      </button>
    </th>
  );
}

export default function AdminPostsShopPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<ItemCategory | "all">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(column: SortKey) {
    if (column === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDir("asc");
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "price") cmp = a.price - b.price;
    else if (sortKey === "created_at") cmp = a.created_at.localeCompare(b.created_at);
    else if (sortKey === "category") cmp = (a.category ?? "").localeCompare(b.category ?? "");
    else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
    else cmp = a.name.localeCompare(b.name);
    return sortDir === "asc" ? cmp : -cmp;
  });

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

  // EPIC-096(요구사항 1.1): "카테고리 이동/수정 시 데이터가 연동되지 않는다"는
  // 신고 — 지금까지는 활성/비활성 토글 버튼 하나뿐이라 실제 상태(대여중/
  // 판매완료 등)나 시대(카테고리) 자체는 이 화면에서 아예 바꿀 방법이
  // 없었다. 행 안에서 바로 select로 바꾸고 즉시 저장(관리 속도 극대화 —
  // 별도 모달/저장 버튼 없음)한다.
  async function updateCategory(item: ItemRow, category: ItemCategory) {
    setProcessingId(item.id);
    const { error: updateError } = await supabase
      .from("items")
      .update({ category })
      .eq("id", item.id);
    setProcessingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((rows) => rows.map((r) => (r.id === item.id ? { ...r, category } : r)));
  }

  async function updateStatus(item: ItemRow, status: ItemStatus) {
    setProcessingId(item.id);
    const { error: updateError } = await supabase
      .from("items")
      .update({ status })
      .eq("id", item.id);
    setProcessingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((rows) => rows.map((r) => (r.id === item.id ? { ...r, status } : r)));
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
    <main className="flex-1 px-8 pb-8 max-w-6xl mx-auto w-full">
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
                <SortHeader label="이름" column="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="시대" column="category" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="가격" column="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="등록일" column="created_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="상태" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
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
                    <select
                      value={item.category ?? ""}
                      disabled={processingId === item.id}
                      onChange={(e) => updateCategory(item, e.target.value as ItemCategory)}
                      className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs disabled:opacity-50"
                    >
                      {ERA_OPTIONS.map((era) => (
                        <option key={era.value} value={era.value}>
                          {era.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">{item.price.toLocaleString()}원</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={item.status}
                      disabled={processingId === item.id}
                      onChange={(e) => updateStatus(item, e.target.value as ItemStatus)}
                      className={`rounded px-1.5 py-1 text-xs border-0 disabled:opacity-50 ${STATUS_BADGE_CLASS[item.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
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
