"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { BlockEditor } from "@/components/editor/BlockEditor";

type ConfirmedOrder = {
  id: string;
  item_name: string;
  item_photo_url: string | null;
};

export default function WritePostPage() {
  const { id } = useParams<{ id: string }>();
  const { session, member } = useAuth();
  const router = useRouter();

  const [boardType, setBoardType] = useState<string | null>(null);
  const [boardCategory, setBoardCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isDocentPost, setIsDocentPost] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("boards")
      .select("board_type, category")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setBoardType(data?.board_type ?? null);
        setBoardCategory(data?.category ?? null);
      });
  }, [id]);

  // Board Definition System(EPIC-047): 태그 입력 노출 여부/글쓰기 허용
  // 여부는 이 정의 하나로 결정한다(board_type별 하드코딩 분기 없음).
  const definition = boardType
    ? resolveBoardDefinition({ board_type: boardType, category: boardCategory })
    : null;

  useEffect(() => {
    if (boardType !== "adoption_story" || !member) return;

    supabase
      .from("orders")
      .select("id, payment_status, items(name, photo_url)")
      .eq("member_id", member.id)
      .eq("payment_status", "confirmed")
      .then(({ data }) => {
        const orders = (data ?? []) as unknown as {
          id: string;
          items: { name: string; photo_url: string | null } | null;
        }[];
        setConfirmedOrders(
          orders.map((o) => ({
            id: o.id,
            item_name: o.items?.name ?? "알 수 없는 물품",
            item_photo_url: o.items?.photo_url ?? null,
          })),
        );
      });
  }, [boardType, member]);

  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);

  // EPIC-053: 자동 저장 — localStorage에 임시 저장 (브라우저 닫기 복구용)
  const handleAutoSave = useCallback((html: string) => {
    if (!id) return;
    const draft = {
      title,
      body: html,
      boardId: id,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`draft-${id}`, JSON.stringify(draft));
    setAutoSavedAt(draft.savedAt);
  }, [id, title]);

  // EPIC-053: 페이지 로드 시 임시 저장본 복구 확인
  useEffect(() => {
    const saved = localStorage.getItem(`draft-${id}`);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.boardId === id) {
          const savedDate = new Date(draft.savedAt);
          const hourAgo = Date.now() - 60 * 60 * 1000;
          if (savedDate.getTime() > hourAgo) {
            if (window.confirm(`${savedDate.toLocaleString()}에 임시 저장된 글이 있습니다. 복구하시겠습니까?`)) {
              /* eslint-disable react-hooks/set-state-in-effect */
              setTitle(draft.title || "");
              setBody(draft.body || "");
              /* eslint-enable react-hooks/set-state-in-effect */
            } else {
              localStorage.removeItem(`draft-${id}`);
            }
          }
        }
      } catch {
        // Invalid draft, ignore
      }
    }
  }, [id]);

  // Tiptap 에디터가 비어 있으면 "<p></p>"류의 빈 태그만 남긴다 — 네이티브
  // <textarea required>처럼 브라우저가 검증해주지 않아 직접 확인한다.
  const isBodyEmpty = body.replace(/<[^>]*>/g, "").trim().length === 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isBodyEmpty) {
      setError("내용을 입력해주세요.");
      return;
    }

    if (boardType === "adoption_story" && !orderId) {
      setError("어떤 물품을 구매하셨는지 선택해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/boards/${id}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        title,
        body,
        isDocentPost,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        ...(boardType === "adoption_story" ? { orderId } : {}),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    // EPIC-053: 게시 완료 시 임시 저장본 삭제
    localStorage.removeItem(`draft-${id}`);
    router.push(`/boards/${id}/${data.id}`);
  }

  // EPIC-053: 임시 저장 복구 여부 확인용 상태 (제목만 따로 추적)

  if (definition && !definition.allowPosting) {
    return (
      <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-2xl font-bold mb-6">글쓰기</h1>
        <p className="text-gray-500">이 게시판에는 글을 쓸 수 없어요.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-2xl font-bold mb-6">글쓰기</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {boardType === "adoption_story" && (
          <div>
            <label className="block text-sm mb-1">
              어떤 물품을 구매하셨나요?
            </label>
            {confirmedOrders.length === 0 ? (
              <p className="text-sm text-gray-500">
                구매 확정된 물품이 없어요. 물품을 구매하고 입금 확인이
                완료된 후 다시 시도해주세요.
              </p>
            ) : (
              <select
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">선택해주세요</option>
                {confirmedOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.item_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">제목</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">내용</label>
        {/* EPIC-053: Block Editor — 자동 저장 + 이미지 Drag&Drop/붙여넣기 */}
          <BlockEditor value={body} onChange={setBody} onAutoSave={handleAutoSave} />
        </div>

        {definition?.tags && (
          <div>
            <label className="block text-sm mb-1">태그 (쉼표로 구분, 선택)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="예: 여행, 후기, 사진"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        )}

        {boardType !== "adoption_story" && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isDocentPost}
              onChange={(e) => setIsDocentPost(e.target.checked)}
            />
            도슨트 성격의 심층 글로 작성 (Great Gatsby 등급부터 가능)
          </label>
        )}

        {autoSavedAt && (
          <p className="text-xs text-gray-400">
            💾 {new Date(autoSavedAt).toLocaleString()}에 자동 저장됨
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-800 text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? "등록 중..." : "등록"}
        </button>
      </form>
    </main>
  );
}
