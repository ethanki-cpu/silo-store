"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PostForm, type ConfirmedOrder, type PostFormSubmitPayload } from "@/components/boards/PostForm";
import { CategoryBoardPicker } from "@/components/common/CategoryBoardPicker";
import { useBoardOptions, useSelectedBoardTypeAndCategory } from "@/lib/useBoardOptions";

// EPIC-084: /boards/[board_slug]/write(경로로 게시판을 지정) 하나뿐이던
// 글쓰기 화면 로직을 그대로 뽑아, 게시판이 URL 경로가 아니라 아직 없을 수도
// 있는(홈페이지 등에서 눌렀을 때) Contextual Write 진입점(/write?boardId=)에서도
// 재사용한다. 동작은 기존 /boards/[board_slug]/write와 100% 동일 — 다만
// initialBoardSlug가 빈 문자열이면 CategoryBoardPicker가 "선택 안 됨" 상태로
// 시작해 사용자가 직접 게시판을 골라야 한다.
// EPIC-084-REVISED: 단일 <select>(UUID 노출 가능성 + 긴 들여쓰기 나열)를
// 3열 Miller Columns 선택기(CategoryBoardPicker)로 교체.
export function WriteBoardForm({
  initialBoardSlug,
  initialCreatedAtDate,
}: {
  initialBoardSlug: string;
  /** EPIC-092(요구사항 5): 캘린더 "+ 글 등록"이 넘기는 "YYYY-MM-DD" — PostForm의 관리자 전용 등록 날짜 필드 초기값. */
  initialCreatedAtDate?: string;
}) {
  const { session, member } = useAuth();
  const router = useRouter();

  const {
    boards: boardOptions,
    branches: boardBranches,
    boardBranchMap,
    loading: boardsLoading,
  } = useBoardOptions(session);
  const [selectedBoardSlug, setSelectedBoardSlug] = useState(initialBoardSlug);
  const { boardType, boardCategory } = useSelectedBoardTypeAndCategory(selectedBoardSlug);
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const definition = boardType
    ? resolveBoardDefinition({ board_type: boardType, category: boardCategory })
    : null;

  useEffect(() => {
    if (!selectedBoardSlug) return;
    fetch(`/api/boards/${selectedBoardSlug}/posts?pageSize=1`)
      .then((res) => res.json())
      .then((data) => setExistingTags(data.availableTags ?? []))
      .catch(() => {});
  }, [selectedBoardSlug]);

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
    if (!selectedBoardSlug) {
      setError("게시될 페이지를 먼저 선택해주세요.");
      return;
    }
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/boards/${selectedBoardSlug}/posts`, {
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
        ...(payload.createdAt ? { createdAt: payload.createdAt } : {}),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      // EPIC-092 후속: 서버가 detail(실제 DB 에러)도 함께 내려주면 이어
      // 붙여 원인을 바로 보여준다(수정 화면과 동일한 처리).
      setError(data.detail ? `${data.error} (${data.detail})` : data.error);
      return;
    }

    router.push(`/boards/${selectedBoardSlug}/${data.slug ?? data.id}`);
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

        <div className="mb-4">
          <label className="block text-sm mb-1">게시될 페이지 선택</label>
          <CategoryBoardPicker
            branches={boardBranches}
            boardBranchMap={boardBranchMap}
            boards={boardOptions}
            value={selectedBoardSlug}
            onChange={setSelectedBoardSlug}
            loading={boardsLoading}
          />
        </div>

        {selectedBoardSlug ? (
          <PostForm
            mode="create"
            boardId={selectedBoardSlug}
            boardType={boardType}
            showTags={Boolean(definition?.tags)}
            confirmedOrders={confirmedOrders}
            existingTags={existingTags}
            initialCreatedAt={initialCreatedAtDate}
            draftStorageKey={`draft-${selectedBoardSlug}`}
            submitLabel="등록"
            onSubmit={handleSubmit}
            submitting={loading}
            error={error}
          />
        ) : (
          <p className="text-gray-500 text-sm">
            {boardsLoading ? "게시판 목록을 불러오는 중..." : "위에서 글을 쓸 게시판을 먼저 선택해주세요."}
          </p>
        )}
      </main>
    </>
  );
}
