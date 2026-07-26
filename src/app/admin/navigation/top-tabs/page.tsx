"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CategoryRowEditor,
  DOMAIN_OPTIONS,
  NavNodeEditor,
  TARGET_TYPE_OPTIONS,
  inputClass,
  primaryButtonClass,
  type CategoryDomain,
  type CategoryRow,
  type NavRow,
  type TargetType,
} from "../shared";

// EPIC-025: 기존 /admin/navigation 한 페이지에 몰려 있던 코드 중
// target_type이 'tab'/'dropdown'인 최상위 항목 + site_categories 관리 부분만
// 이 페이지로 분리했다. 별도 API Route 없이 브라우저에서 anon key + RLS
// (admin bypass)로 직접 CUD하는 방식은 EPIC-023 그대로 유지.
const TOP_TAB_TYPES: TargetType[] = ["tab", "dropdown"];

export default function AdminTopTabsPage() {
  const [navRows, setNavRows] = useState<NavRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<CategoryDomain>("shop");

  async function loadAll() {
    setFetching(true);
    const [{ data: nav, error: navErr }, { data: cat, error: catErr }] =
      await Promise.all([
        supabase
          .from("site_navigations")
          .select(
            "id, key, title, href, parent_id, target_type, sort_order, is_active",
          )
          .order("sort_order", { ascending: true }),
        supabase
          .from("site_categories")
          .select("id, domain, parent_id, name, slug, sort_order, is_active")
          .order("sort_order", { ascending: true }),
      ]);

    if (navErr || catErr) {
      setError(
        navErr?.message ?? catErr?.message ?? "데이터를 불러오지 못했어요.",
      );
    } else {
      setError(null);
    }
    setNavRows((nav ?? []) as NavRow[]);
    setCategoryRows((cat ?? []) as CategoryRow[]);
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

  async function handleAddTopLevelTab(e: FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const key = String(data.get("key") ?? "").trim();
    const title = String(data.get("title") ?? "").trim();
    const href = String(data.get("href") ?? "").trim();
    const targetType = String(data.get("target_type") ?? "tab") as TargetType;

    if (!key || !title) {
      setError("key와 title은 필수예요.");
      return;
    }

    const topCount = navRows.filter((r) => r.parent_id === null).length;
    const { error: insertError } = await supabase
      .from("site_navigations")
      .insert({
        key,
        title,
        href: href || null,
        target_type: targetType,
        sort_order: topCount + 1,
      });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    form.reset();
    await loadAll();
  }

  async function updateCategory(
    id: string,
    patch: Partial<CategoryRow>,
  ): Promise<boolean> {
    const { error: updateError } = await supabase
      .from("site_categories")
      .update(patch)
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setError(null);
    setCategoryRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
    return true;
  }

  async function deleteCategory(id: string) {
    if (!confirm("이 카테고리를 삭제할까요?")) return;
    const { error: deleteError } = await supabase
      .from("site_categories")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadAll();
  }

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const slug = String(data.get("slug") ?? "").trim();
    const parentId = String(data.get("parent_id") ?? "") || null;

    if (!name || !slug) {
      setError("name과 slug는 필수예요.");
      return;
    }

    const siblingCount = categoryRows.filter(
      (r) => r.domain === activeDomain,
    ).length;
    const { error: insertError } = await supabase
      .from("site_categories")
      .insert({
        domain: activeDomain,
        parent_id: parentId,
        name,
        slug,
        sort_order: siblingCount + 1,
      });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    form.reset();
    await loadAll();
  }

  const topNavRows = navRows.filter(
    (r) => r.parent_id === null && TOP_TAB_TYPES.includes(r.target_type),
  );
  const domainCategories = categoryRows.filter((r) => r.domain === activeDomain);

  return (
    <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-3">
            상단 탭 (단일 링크 / 드롭다운)
          </h2>

          <div className="space-y-4 mb-6">
            {topNavRows.map((top) => (
              <NavNodeEditor
                key={top.id}
                node={top}
                depth={0}
                allRows={navRows}
                onUpdate={updateNavRow}
                onDelete={deleteNavRow}
                onAddChild={addNavRow}
              />
            ))}
          </div>

          <form
            onSubmit={handleAddTopLevelTab}
            className="rounded-lg border border-gray-200 p-4 mb-10 space-y-2"
          >
            <p className="text-sm font-semibold text-gray-500 mb-1">
              새 최상위 탭 추가
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input name="key" placeholder="key (예: silostore)" className={inputClass} />
              <input name="title" placeholder="제목" className={inputClass} />
              <input name="href" placeholder="href (선택, tab 타입일 때만)" className={inputClass} />
              <select name="target_type" className={inputClass} defaultValue="tab">
                {TARGET_TYPE_OPTIONS.filter((o) =>
                  TOP_TAB_TYPES.includes(o.value),
                ).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={primaryButtonClass}>
              추가
            </button>
          </form>

          <h2 className="text-lg font-semibold mb-3">카테고리 관리</h2>

          <div className="flex gap-2 mb-4">
            {DOMAIN_OPTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setActiveDomain(d.value)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  activeDomain === d.value
                    ? "bg-gray-800 text-white border-gray-800"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            {domainCategories.length === 0 ? (
              <p className="text-gray-500">아직 등록된 카테고리가 없어요.</p>
            ) : (
              domainCategories.map((cat) => (
                <CategoryRowEditor
                  key={cat.id}
                  category={cat}
                  siblingOptions={domainCategories.filter((c) => c.id !== cat.id)}
                  onUpdate={updateCategory}
                  onDelete={deleteCategory}
                />
              ))
            )}
          </div>

          <form
            onSubmit={handleAddCategory}
            className="rounded-lg border border-gray-200 p-4 space-y-2"
          >
            <p className="text-sm font-semibold text-gray-500 mb-1">
              {DOMAIN_OPTIONS.find((d) => d.value === activeDomain)?.label} 카테고리
              추가
            </p>
            <div className="grid grid-cols-3 gap-2">
              <input name="name" placeholder="이름" className={inputClass} />
              <input name="slug" placeholder="slug" className={inputClass} />
              <select name="parent_id" className={inputClass} defaultValue="">
                <option value="">최상위</option>
                {domainCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={primaryButtonClass}>
              추가
            </button>
          </form>
        </>
      )}
    </main>
  );
}
