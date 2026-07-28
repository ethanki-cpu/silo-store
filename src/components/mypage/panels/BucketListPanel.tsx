"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "@/components/modules/EmptyState";

type BucketItem = {
  id: string;
  year: number;
  title: string;
  is_done: boolean;
  created_at: string;
};

// EPIC-052: 버킷리스트 — 연도별 체크리스트 + 완료율/진행률. member_bucket_list
// 신규 테이블(own-row 전용, wishlists/member_collections와 동일 RLS 패턴)을
// 사용 — 라이브 DB에는 아직 미적용(NEXT_TASK.md 참고).
export function BucketListPanel({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [title, setTitle] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);

    supabase
      .from("member_bucket_list")
      .select("id, year, title, is_done, created_at")
      .eq("member_id", memberId)
      .order("year", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data ?? []) as BucketItem[]);
        setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberId, reloadKey]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from("member_bucket_list").insert({
      member_id: memberId,
      year,
      title: title.trim(),
    });

    if (!error) {
      setTitle("");
      setReloadKey((k) => k + 1);
    }
  }

  async function handleToggle(item: BucketItem) {
    const { error } = await supabase
      .from("member_bucket_list")
      .update({ is_done: !item.is_done })
      .eq("id", item.id)
      .eq("member_id", memberId);

    if (!error) setReloadKey((k) => k + 1);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 항목을 삭제할까요?")) return;

    const { error } = await supabase
      .from("member_bucket_list")
      .delete()
      .eq("id", id)
      .eq("member_id", memberId);

    if (!error) setReloadKey((k) => k + 1);
  }

  const byYear = new Map<number, BucketItem[]>();
  for (const item of items) {
    if (!byYear.has(item.year)) byYear.set(item.year, []);
    byYear.get(item.year)!.push(item);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const totalDone = items.filter((i) => i.is_done).length;
  const overallRate =
    items.length > 0 ? Math.round((totalDone / items.length) * 100) : 0;

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="새 버킷리스트 항목"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-800 text-white px-3 py-2 text-sm"
        >
          추가
        </button>
      </form>

      {loadingData ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <EmptyState title="아직 등록한 버킷리스트가 없어요." />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            전체 진행률 {overallRate}% ({totalDone}/{items.length})
          </p>
          <div className="space-y-8">
            {years.map((y) => {
              const yearItems = byYear.get(y)!;
              const yearDone = yearItems.filter((i) => i.is_done).length;
              const yearRate = Math.round((yearDone / yearItems.length) * 100);

              return (
                <section key={y}>
                  <h2 className="font-serif text-lg font-semibold text-gray-900 mb-2">
                    {y}년{" "}
                    <span className="text-sm text-gray-400 font-sans">
                      ({yearRate}% 완료)
                    </span>
                  </h2>
                  <div className="space-y-2">
                    {yearItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 p-3"
                      >
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={() => handleToggle(item)}
                        />
                        <span
                          className={`flex-1 text-sm ${
                            item.is_done
                              ? "line-through text-gray-400"
                              : "text-gray-800"
                          }`}
                        >
                          {item.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-gray-400 hover:text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
