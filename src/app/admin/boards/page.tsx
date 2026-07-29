"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { GROUP_OPTIONS, RENDER_TYPE_OPTIONS } from "@/components/admin/BoardForm";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

type BoardRow = {
  id: string;
  name: string;
  category: string | null;
  is_public?: boolean;
  group_key?: string | null;
  render_type?: string | null;
};

const GROUP_LABEL = Object.fromEntries(GROUP_OPTIONS.map((o) => [o.value, o.label]));
const RENDER_TYPE_LABEL = Object.fromEntries(RENDER_TYPE_OPTIONS.map((o) => [o.value, o.label]));

// EPIC-066: 게시판 관리 목록 — is_admin 가드는 src/app/admin/layout.tsx가
// 이미 처리한다. 게시판 수가 ~90개 수준이라(요구사항 ⑬) 검색/필터는 서버
// 라운드트립 없이 클라이언트에서 처리한다.
export default function AdminBoardsPage() {
  const { session } = useAuth();

  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!session) return;
    setFetching(true);
    const res = await fetch("/api/admin/boards", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "게시판 목록을 불러오지 못했어요.");
      setFetching(false);
      return;
    }
    setError(null);
    setBoards(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return boards.filter((b) => {
      if (groupFilter !== "all" && (b.group_key ?? "") !== groupFilter) return false;
      if (typeFilter !== "all" && (b.render_type ?? "") !== typeFilter) return false;
      if (!query) return true;
      return (
        b.name.toLowerCase().includes(query) ||
        (b.category ?? "").toLowerCase().includes(query)
      );
    });
  }, [boards, q, groupFilter, typeFilter]);

  async function handleDuplicate(board: BoardRow) {
    if (!session) return;
    setDuplicatingId(board.id);
    const res = await fetch(`/api/admin/boards/${board.id}/duplicate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setDuplicatingId(null);
    if (!res.ok) {
      setError(data.error ?? "복제에 실패했어요.");
      return;
    }
    await load();
  }

  async function handleDelete() {
    if (!session || !deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/boards/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setError(data.error ?? "삭제에 실패했어요.");
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    setBoards((rows) => rows.filter((r) => r.id !== deleteTarget.id));
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-2xl font-bold">게시판 관리</h1>
        <Link
          href="/admin/boards/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          + 새 게시판
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목 또는 슬러그 검색"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-64"
        />
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">전체 Category</option>
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">전체 Board Type</option>
          {RENDER_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">표시할 게시판이 없어요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">제목</th>
                <th className="py-2 pr-3">슬러그</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Board Type</th>
                <th className="py-2 pr-3">공개 여부</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((board) => (
                <tr key={board.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3">
                    <Link href={`/admin/boards/${board.id}`} className="hover:underline font-medium">
                      {board.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-gray-500">{board.category ?? "-"}</td>
                  <td className="py-2 pr-3 text-gray-500">
                    {board.group_key ? GROUP_LABEL[board.group_key] ?? board.group_key : "-"}
                  </td>
                  <td className="py-2 pr-3 text-gray-500">
                    {board.render_type ? RENDER_TYPE_LABEL[board.render_type] ?? board.render_type : "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {board.is_public === false ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                        비공개
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                        공개
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/boards/${board.id}`}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(board)}
                        disabled={duplicatingId === board.id}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                      >
                        복제
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(board)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
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

      <ConfirmModal
        open={!!deleteTarget}
        title="게시판 삭제"
        message={`"${deleteTarget?.name ?? ""}" 게시판을 정말 삭제하시겠습니까?`}
        confirmLabel={deleting ? "삭제 중..." : "삭제"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
