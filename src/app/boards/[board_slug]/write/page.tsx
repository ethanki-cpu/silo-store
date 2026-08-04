"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PostForm, type ConfirmedOrder, type PostFormSubmitPayload } from "@/components/boards/PostForm";

// EPIC-079-PHASE-2: URL이 board id(UUID) 대신 board slug를 쓰도록
// 바뀌었다 — boards 테이블 직접 조회도 slug로 바꾼다(API 라우트가 아니라
// 클라이언트가 직접 Supabase를 호출하는 경로라 boardFetch.ts의 fallback
// 로직을 재사용할 수 없어, 여기서도 동일한 "slug 우선" 조회를 해준다).
//
// EPIC-079-PHASE-3: "카테고리(공지/자유/질문...)" 하드코딩 드롭다운을
// 완전히 제거하고, 대신 "게시될 페이지 선택" 드롭다운을 추가했다 — DB의
// 모든 게시판을 fetch해 사용자가 직접 어느 게시판에 올릴지 고를 수 있다.
// URL의 board_slug는 "처음에 어떤 게시판에서 글쓰기 진입했는지"를 나타내는
// 초기값일 뿐이고, 실제 게시 대상은 이 드롭다운의 선택(selectedBoardSlug)이
// 최종 결정한다 — 게시판 목록/글쓰기 진입점 등 기존 링크는 전부
// /boards/[board_slug]/write 그대로라 손댈 필요가 없다.
type BoardOption = {
  id: string;
  slug?: string | null;
  name: string;
  board_type: string;
  category: string | null;
  locked?: boolean;
};

export default function WritePostPage() {
  const { board_slug: initialBoardSlug } = useParams<{ board_slug: string }>();
  const { session, member } = useAuth();
  const router = useRouter();

  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [selectedBoardSlug, setSelectedBoardSlug] = useState(initialBoardSlug);
  const [boardType, setBoardType] = useState<string | null>(null);
  const [boardCategory, setBoardCategory] = useState<string | null>(null);
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 글쓰기 화면 마운트 시 DB의 모든 게시판 목록을 가져와 "게시될 페이지
  // 선택" 드롭다운을 채운다 — 잠긴(locked, 등급 미달) 게시판은 애초에 이
  // 사용자가 쓸 수 없는 곳이라 선택지에서 제외한다(실제 쓰기 권한은
  // 서버가 제출 시점에 다시 한번 최종 검증 — 아래 handleSubmit 참고).
  useEffect(() => {
    fetch("/api/boards", {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : []) as BoardOption[];
        setBoards(list.filter((b) => !b.locked));
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    supabase
      .from("boards")
      .select("board_type, category")
      .eq("slug", selectedBoardSlug)
      .single()
      .then(({ data }) => {
        setBoardType(data?.board_type ?? null);
        setBoardCategory(data?.category ?? null);
      });
  }, [selectedBoardSlug]);

  const definition = boardType
    ? resolveBoardDefinition({ board_type: boardType, category: boardCategory })
    : null;

  // EPIC-079: "기존 태그 선택" 칩 — 이 게시판에서 이미 쓰인 태그 목록을
  // 가볍게 재사용(게시글 목록 API가 이미 availableTags를 계산해 돌려준다,
  // 별도 엔드포인트 신설 없음).
  useEffect(() => {
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
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
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
        <select
          value={selectedBoardSlug}
          onChange={(e) => setSelectedBoardSlug(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {/* 아직 목록을 못 받아온 사이(로딩 중)에도 현재 게시판이 선택된
              상태로 보이도록, 목록에 없으면 임시 옵션을 하나 끼워 넣는다 —
              아래 실제 옵션과 동일하게 slug 우선/id 폴백으로 비교해야
              "이미 로딩은 끝났는데 계속 불러오는 중으로 보이는" 불일치가
              없다(예: boards.sort_order 컬럼이 라이브 DB에 없어 /api/boards가
              rich→legacy 폴백하면 slug가 안 내려와 id로만 비교돼야 함). */}
          {!boards.some((b) => (b.slug ?? b.id) === selectedBoardSlug) && (
            <option value={selectedBoardSlug}>불러오는 중...</option>
          )}
          {boards.map((b) => (
            <option key={b.id} value={b.slug ?? b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <PostForm
        mode="create"
        boardId={selectedBoardSlug}
        boardType={boardType}
        showTags={Boolean(definition?.tags)}
        confirmedOrders={confirmedOrders}
        existingTags={existingTags}
        draftStorageKey={`draft-${selectedBoardSlug}`}
        submitLabel="등록"
        onSubmit={handleSubmit}
        submitting={loading}
        error={error}
      />
      </main>
    </>
  );
}
