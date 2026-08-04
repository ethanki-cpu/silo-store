"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { resolveBoardDefinition, getPostCategories } from "@/lib/boardLayout";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PostForm, type ConfirmedOrder, type PostFormSubmitPayload } from "@/components/boards/PostForm";

// EPIC-079-PHASE-2: URL이 board id(UUID) 대신 board slug를 쓰도록
// 바뀌었다 — boards 테이블 직접 조회도 slug로 바꾼다(API 라우트가 아니라
// 클라이언트가 직접 Supabase를 호출하는 경로라 boardFetch.ts의 fallback
// 로직을 재사용할 수 없어, 여기서도 동일한 "slug 우선" 조회를 해준다).
export default function WritePostPage() {
  const { board_slug: boardSlug } = useParams<{ board_slug: string }>();
  const { session, member } = useAuth();
  const router = useRouter();

  const [boardType, setBoardType] = useState<string | null>(null);
  const [boardCategory, setBoardCategory] = useState<string | null>(null);
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("boards")
      .select("board_type, category")
      .eq("slug", boardSlug)
      .single()
      .then(({ data }) => {
        setBoardType(data?.board_type ?? null);
        setBoardCategory(data?.category ?? null);
      });
  }, [boardSlug]);

  const definition = boardType
    ? resolveBoardDefinition({ board_type: boardType, category: boardCategory })
    : null;

  // EPIC-079: "기존 태그 선택" 칩 — 이 게시판에서 이미 쓰인 태그 목록을
  // 가볍게 재사용(게시글 목록 API가 이미 availableTags를 계산해 돌려준다,
  // 별도 엔드포인트 신설 없음).
  useEffect(() => {
    fetch(`/api/boards/${boardSlug}/posts?pageSize=1`)
      .then((res) => res.json())
      .then((data) => setExistingTags(data.availableTags ?? []))
      .catch(() => {});
  }, [boardSlug]);

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

    const res = await fetch(`/api/boards/${boardSlug}/posts`, {
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
        thumbnailVisible: payload.thumbnailVisible,
        category: payload.category,
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

    router.push(`/boards/${boardSlug}/${data.slug ?? data.id}`);
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
        boardId={boardSlug}
        boardType={boardType}
        showTags={Boolean(definition?.tags)}
        confirmedOrders={confirmedOrders}
        categories={definition ? getPostCategories(definition) : undefined}
        existingTags={existingTags}
        draftStorageKey={`draft-${boardSlug}`}
        submitLabel="등록"
        onSubmit={handleSubmit}
        submitting={loading}
        error={error}
      />
      </main>
    </>
  );
}
