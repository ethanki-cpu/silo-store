"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";

type MemberRow = {
  id: string;
  name: string;
  email: string | null;
  membership_rank: number;
  is_admin: boolean;
  joined_at: string;
  membership_started_at: string | null;
};

const RANK_OPTIONS: { rank: number; label: string }[] = [
  { rank: 0, label: "Silo Angel" },
  { rank: 1, label: "Alice" },
  { rank: 2, label: "Great Gatsby" },
  { rank: 3, label: "Patron" },
  { rank: 4, label: "Lautrec" },
  { rank: 99, label: "Artist" },
];

export default function AdminMembersPage() {
  // is_admin 인증 가드는 src/app/admin/layout.tsx가 공통으로 처리한다.
  const { session, member: currentMember } = useAuth();

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; membership_rank: number; is_admin: boolean }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    setFetching(true);
    setError(null);
    const params = new URLSearchParams(q ? { q } : {});
    const res = await fetch(`/api/admin/members?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "회원 목록을 불러오지 못했어요.");
      setFetching(false);
      return;
    }
    const list = Array.isArray(data) ? (data as MemberRow[]) : [];
    setRows(list);
    setDrafts(
      Object.fromEntries(
        list.map((m) => [
          m.id,
          { name: m.name, membership_rank: m.membership_rank, is_admin: m.is_admin },
        ]),
      ),
    );
    setFetching(false);
  }

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function updateDraft(id: string, patch: Partial<{ name: string; membership_rank: number; is_admin: boolean }>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function isDirty(row: MemberRow): boolean {
    const draft = drafts[row.id];
    if (!draft) return false;
    return (
      draft.name !== row.name ||
      draft.membership_rank !== row.membership_rank ||
      draft.is_admin !== row.is_admin
    );
  }

  async function handleSave(row: MemberRow) {
    const draft = drafts[row.id];
    if (!draft) return;

    if (
      row.is_admin &&
      !draft.is_admin &&
      currentMember?.id === row.id &&
      !window.confirm("본인의 관리자 권한을 해제하시겠어요?")
    ) {
      return;
    }

    setSavingId(row.id);
    setError(null);

    const res = await fetch(`/api/admin/members/${row.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify(draft),
    });

    const data = await res.json();
    setSavingId(null);

    if (!res.ok) {
      setError(data.error ?? "저장에 실패했어요.");
      return;
    }

    await load();
  }

  return (
    <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">회원 관리</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="이름 또는 이메일로 검색"
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={load}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          검색
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">표시할 회원이 없어요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">이름</th>
                <th className="py-2 pr-3">이메일</th>
                <th className="py-2 pr-3">등급</th>
                <th className="py-2 pr-3">관리자</th>
                <th className="py-2 pr-3">가입일</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const draft = drafts[row.id] ?? {
                  name: row.name,
                  membership_rank: row.membership_rank,
                  is_admin: row.is_admin,
                };
                const dirty = isDirty(row);
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => updateDraft(row.id, { name: e.target.value })}
                        className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{row.email ?? "-"}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={draft.membership_rank}
                        onChange={(e) =>
                          updateDraft(row.id, { membership_rank: Number(e.target.value) })
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        {RANK_OPTIONS.map((o) => (
                          <option key={o.rank} value={o.rank}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={draft.is_admin}
                        onChange={(e) => updateDraft(row.id, { is_admin: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-500">
                      {new Date(row.joined_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => handleSave(row)}
                        disabled={!dirty || savingId === row.id}
                        className="rounded-md bg-gray-800 text-white px-3 py-1 text-xs disabled:opacity-40"
                      >
                        {savingId === row.id ? "저장 중..." : "저장"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
