"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchAllPagesForAdmin,
  isPageBuilderTableMissing,
  type PageBuilderRow,
} from "@/lib/pageBuilder";
import { AdminDomainTabs, useAdminDomainFilter } from "@/components/admin/AdminDomainTabs";
import {
  ADMIN_DOMAIN_LABELS,
  ADMIN_DOMAIN_ORDER,
  classifyPageSlug,
  type AdminDomain,
} from "@/lib/adminDomainGrouping";

// EPIC-060: Page Builder 관리자 목록 — 페이지 목록/새 페이지/삭제/수정
// 진입/공개-비공개 전환. is_admin 가드는 src/app/admin/layout.tsx가 이미
// 처리한다(이 페이지가 렌더링됐다는 것 자체가 이미 관리자로 확인됐다는 뜻).
// EPIC-072: 도메인 필터 탭이 useSearchParams를 쓰므로 Suspense로 감싼다
// (Navbar.tsx/docent page와 동일한 이 저장소의 기존 관례).
export default function AdminPagesListPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full" />}>
      <AdminPagesListContent />
    </Suspense>
  );
}

function AdminPagesListContent() {
  const domainFilter = useAdminDomainFilter();
  const [pages, setPages] = useState<PageBuilderRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setFetching(true);
    const missing = await isPageBuilderTableMissing();
    if (missing) {
      setTableMissing(true);
      setFetching(false);
      return;
    }
    setTableMissing(false);
    const data = await fetchAllPagesForAdmin();
    if (data === null) {
      setError("페이지 목록을 불러오지 못했어요.");
    } else {
      setError(null);
      setPages(data);
    }
    setFetching(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newSlug.trim() || !newTitle.trim()) return;
    setCreating(true);
    const { error: insertError } = await supabase.from("page_builder").insert({
      slug: newSlug.trim(),
      title: newTitle.trim(),
      status: "draft",
    });
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewSlug("");
    setNewTitle("");
    await load();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 페이지와 그 안의 모든 모듈을 삭제할까요?`)) return;
    const { error: deleteError } = await supabase.from("page_builder").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  async function handleToggleStatus(page: PageBuilderRow) {
    const nextStatus = page.status === "published" ? "draft" : "published";
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", page.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  const pagesWithDomain = useMemo(
    () => pages.map((page) => ({ page, domain: classifyPageSlug(page.slug) })),
    [pages],
  );

  const counts = useMemo(() => {
    const c: Partial<Record<AdminDomain | "all", number>> = { all: pagesWithDomain.length };
    for (const { domain } of pagesWithDomain) c[domain] = (c[domain] ?? 0) + 1;
    return c;
  }, [pagesWithDomain]);

  // "전체" 선택 시에는 도메인별로 묶어서(브랜치 정렬처럼) 보여주고, 특정
  // 도메인을 고르면 그 목록만 평평하게 보여준다.
  const groupedSections = useMemo(() => {
    const domains = domainFilter === "all" ? ADMIN_DOMAIN_ORDER : [domainFilter];
    return domains
      .map((domain) => ({
        domain,
        items: pagesWithDomain.filter((p) => p.domain === domain).map((p) => p.page),
      }))
      .filter((section) => section.items.length > 0);
  }, [pagesWithDomain, domainFilter]);

  if (tableMissing) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">아직 page_builder 테이블이 없어요.</p>
          <p>
            <code className="bg-white/60 px-1 rounded">docs/sql/EPIC-060-page-builder.sql</code>을
            Supabase SQL Editor(또는 Management API)에서 먼저 실행해야 이 화면을 쓸 수 있어요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">페이지 관리</h1>
        <p className="text-sm text-gray-500">
          Page → Module → Board → Post 구조로 각 Hub Page의 구성을 코드 수정 없이 관리합니다.
        </p>
      </div>

      <AdminDomainTabs counts={counts} />

      <section className="rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">새 페이지</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug (예: community)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="제목 (예: Community)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newSlug.trim() || !newTitle.trim()}
            className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {creating ? "생성 중..." : "생성"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      ) : groupedSections.length === 0 ? (
        <p className="text-gray-400 text-sm">등록된 페이지가 없어요.</p>
      ) : (
        <div className="space-y-6">
          {groupedSections.map((section) => (
            <div key={section.domain}>
              {domainFilter === "all" && (
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {ADMIN_DOMAIN_LABELS[section.domain]} ({section.items.length})
                </h2>
              )}
              <ul className="space-y-2">
                {section.items.map((page) => (
                  <li
                    key={page.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{page.title}</p>
                      <p className="text-xs text-gray-400">/{page.slug}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        page.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {page.status === "published" ? "공개" : "비공개"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(page)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      {page.status === "published" ? "비공개로 전환" : "공개로 전환"}
                    </button>
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      수정
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(page.id, page.title)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
