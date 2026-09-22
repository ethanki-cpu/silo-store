"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-161 Phase 2: "제안" 수신함 — 무거운 워크플로 엔진 없이 목록 + 상태
// 변경(대기/반영완료/보류)만 하는 v1. 실제 반영(글쓰기 허용/카테고리 추가/
// 게시글 삭제)은 관리자가 각자의 기존 화면(사이트 구성 관리 등)에서 수동으로.

type Proposal = {
  id: string;
  board_id: string;
  board_name: string;
  member_id: string;
  member_name: string;
  post_id: string | null;
  kind: "write" | "category" | "delete_post" | "other";
  body: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
};

const KIND_LABELS: Record<Proposal["kind"], string> = {
  write: "글쓰기 제안",
  category: "카테고리 제안",
  delete_post: "게시글 삭제 제안",
  other: "기타",
};

export default function BoardProposalsPage() {
  const { session, member, loading, memberLoading } = useAuth();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  function load() {
    if (!session) return;
    fetch("/api/admin/board-proposals", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data: Proposal[]) => setProposals(data))
      .catch(() => setError("제안 목록을 불러오지 못했어요."));
  }

  useEffect(() => {
    if (loading || memberLoading || !session || !member?.is_admin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, member, loading, memberLoading]);

  async function updateStatus(id: string, status: Proposal["status"]) {
    if (!session) return;
    setUpdating(id);
    const res = await fetch(`/api/admin/board-proposals/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    if (!res.ok) {
      setError("처리에 실패했어요.");
      return;
    }
    load();
  }

  if (loading || memberLoading) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (!session || !member?.is_admin) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">관리자만 접근할 수 있어요.</p>
      </main>
    );
  }

  const visible = (proposals ?? []).filter((p) => showResolved || p.status === "pending");

  return (
    <main className="flex-1 p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-1">게시판 제안함</h1>
      <p className="text-sm text-gray-500 mb-4">
        Lautrec 등급 등에서 제출한 글쓰기/카테고리/게시글 삭제 제안입니다. 실제 반영(권한 조정, 카테고리 추가, 글 삭제)은 각 관리
        화면에서 직접 처리한 뒤 여기서 상태만 바꿔주세요.
      </p>

      <label className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
        처리된 제안도 보기
      </label>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!proposals ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">대기 중인 제안이 없어요.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((p) => (
            <li key={p.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {p.board_name} · {p.member_name} · {KIND_LABELS[p.kind]}
                </span>
                <span>{new Date(p.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{p.body}</p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    p.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : p.status === "resolved"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.status === "pending" ? "대기" : p.status === "resolved" ? "반영완료" : "보류"}
                </span>
                {p.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateStatus(p.id, "resolved")}
                      disabled={updating === p.id}
                      className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white disabled:opacity-40"
                    >
                      반영완료로 표시
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(p.id, "dismissed")}
                      disabled={updating === p.id}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 disabled:opacity-40"
                    >
                      보류
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
