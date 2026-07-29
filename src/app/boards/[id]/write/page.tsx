"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PostForm, type ConfirmedOrder, type PostFormSubmitPayload } from "@/components/boards/PostForm";

export default function WritePostPage() {
  const { id } = useParams<{ id: string }>();
  const { session, member } = useAuth();
  const router = useRouter();

  const [boardType, setBoardType] = useState<string | null>(null);
  const [boardCategory, setBoardCategory] = useState<string | null>(null);
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

  async function handleSubmit(payload: PostFormSubmitPayload) {
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/boards/${id}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        title: payload.title,
        bodyJson: payload.bodyJson,
        bodyHtml: payload.bodyHtml,
        featuredImageUrl: payload.featuredImageUrl,
        featuredImagePath: payload.featuredImagePath,
        isDocentPost: payload.isDocentPost,
        tags: payload.tags,
        ...(boardType === "adoption_story" ? { orderId: payload.orderId } : {}),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push(`/boards/${id}/${data.id}`);
  }

  if (definition && !definition.allowPosting) {
    return (
      <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-2xl font-bold mb-6">글쓰기</h1>
        <p className="text-gray-500">이 게시판에는 글을 쓸 수 없어요.</p>
      </main>
    );
  }

  return (
    <>
      <PageEditButton slug="boards-id-write" />
      <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-2xl font-bold mb-6">글쓰기</h1>
      <PostForm
        mode="create"
        boardId={id}
        boardType={boardType}
        showTags={Boolean(definition?.tags)}
        confirmedOrders={confirmedOrders}
        draftStorageKey={`draft-${id}`}
        submitLabel="등록"
        onSubmit={handleSubmit}
        submitting={loading}
        error={error}
      />
      </main>
    </>
  );
}
