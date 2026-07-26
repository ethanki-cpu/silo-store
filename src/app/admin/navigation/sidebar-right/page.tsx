"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { NavNodeEditor, type NavRow, type TargetType } from "../shared";

// EPIC-025: target_type='sidebar_right'인 최상위 탭(살롱데상)과 그 하위
// 그룹/항목만 관리하는 페이지. sidebar-left/page.tsx와 구조 동일, 대상
// target_type만 다르다.
export default function AdminSidebarRightPage() {
  const [navRows, setNavRows] = useState<NavRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setFetching(true);
    const { data, error: fetchError } = await supabase
      .from("site_navigations")
      .select(
        "id, key, title, href, parent_id, target_type, sort_order, is_active",
      )
      .order("sort_order", { ascending: true });

    setError(fetchError?.message ?? null);
    setNavRows((data ?? []) as NavRow[]);
    setFetching(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateNavRow(
    id: string,
    patch: Partial<NavRow>,
  ): Promise<boolean> {
    const { error: updateError } = await supabase
      .from("site_navigations")
      .update(patch)
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setError(null);
    setNavRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
    return true;
  }

  async function deleteNavRow(id: string) {
    if (!confirm("이 항목과 하위 항목을 모두 삭제할까요?")) return;
    const { error: deleteError } = await supabase
      .from("site_navigations")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadAll();
  }

  async function addNavRow(parentId: string, targetType: TargetType) {
    const siblingCount = navRows.filter((r) => r.parent_id === parentId).length;
    const { error: insertError } = await supabase
      .from("site_navigations")
      .insert({
        parent_id: parentId,
        title: "새 항목",
        target_type: targetType,
        sort_order: siblingCount + 1,
      });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await loadAll();
  }

  const topNavRows = navRows.filter(
    (r) => r.parent_id === null && r.target_type === "sidebar_right",
  );

  return (
    <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : topNavRows.length === 0 ? (
        <p className="text-gray-500">
          아직 등록된 오른쪽 사이드바 탭이 없어요. &ldquo;상단 탭 / 카테고리 관리&rdquo;에서
          target_type을 sidebar_right로 하는 최상위 탭을 먼저 만들어주세요.
        </p>
      ) : (
        <div className="space-y-4">
          {topNavRows.map((top) => (
            <NavNodeEditor
              key={top.id}
              node={top}
              depth={0}
              allRows={navRows}
              onUpdate={updateNavRow}
              onDelete={deleteNavRow}
              onAddChild={addNavRow}
              showTypeSelect={false}
            />
          ))}
        </div>
      )}
    </main>
  );
}
