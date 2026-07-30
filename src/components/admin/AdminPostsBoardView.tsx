"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ADMIN_DOMAIN_LABELS, classifyBoardCategory, type AdminDomain } from "@/lib/adminDomainGrouping";

// EPIC-028의 "[살롱데상] 카테고리별 글 관리"를 EPIC-072에서 도메인
// 매개변수화해 일반화한 버전 — `posts`(+`boards`) 테이블을 최신순 데이터
// 테이블로 조회/관리하되, 이제 board_type이 아니라 "이 게시판이 어느
// 도메인(사일로상점/살롱데상/스튜디오/마이페이지)에 속하는가"로 먼저
// 걸러서 각 도메인 탭이 실제로 그 도메인의 게시글만 보여준다.
//
// boards에 도메인 컬럼이 없어 이 게시판들이 어느 도메인인지 서버 쿼리
// 하나로 걸러낼 수 없다 — 먼저 boards 전체(수십 개 수준)를 가져와
// classifyBoardCategory로 분류한 뒤, 그 도메인에 속하는 board_id 목록으로
// posts를 필터링하는 2단계 조회를 쓴다.

type BoardType =
  | "topic"
  | "group"
  | "patron"
  | "artist_promo"
  | "adoption_story"
  | "archive"
  | "qna";

type PostRow = {
  id: string;
  title: string | null;
  body: string | null;
  author_id: string;
  authorName: string;
  board_name: string;
  board_type: BoardType;
  like_count: number;
  is_hidden: boolean;
  created_at: string;
};

const BOARD_TYPE_OPTIONS: { value: BoardType; label: string }[] = [
  { value: "topic", label: "주제별 게시판" },
  { value: "group", label: "클럽 모임방" },
  { value: "patron", label: "패트론 라운지" },
  { value: "artist_promo", label: "아티스트 홍보" },
  { value: "adoption_story", label: "After Adoption" },
  { value: "archive", label: "자료게시판" },
  { value: "qna", label: "질문과 답변" },
];

const PAGE_SIZE = 20;

export function AdminPostsBoardView({ domain }: { domain: AdminDomain }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardTypeFilter, setBoardTypeFilter] = useState<BoardType | "all">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noBoardsInDomain, setNoBoardsInDomain] = useState(false);

  async function load() {
    setFetching(true);

    const { data: allBoards, error: boardsError } = await supabase
      .from("boards")
      .select("id, category, group_key");

    if (boardsError) {
      setError(boardsError.message);
      setFetching(false);
      return;
    }

    const domainBoardIds = (allBoards ?? [])
      .filter((b) => classifyBoardCategory(b.category, b.group_key) === domain)
      .map((b) => b.id);

    if (domainBoardIds.length === 0) {
      setNoBoardsInDomain(true);
      setPosts([]);
      setTotalCount(0);
      setFetching(false);
      return;
    }
    setNoBoardsInDomain(false);

    // board_type으로도 필터링할 때는 boards!inner로 join해야 embedded 테이블
    // 컬럼 기준 .eq()가 동작한다(그냥 boards(...)는 left join이라 필터 무시됨).
    const boardsSelect =
      boardTypeFilter === "all" ? "boards(name, board_type)" : "boards!inner(name, board_type)";

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("posts")
      .select(`id, title, body, author_id, like_count, is_hidden, created_at, ${boardsSelect}`, {
        count: "exact",
      })
      .in("board_id", domainBoardIds)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (boardTypeFilter !== "all") {
      query = query.eq("boards.board_type", boardTypeFilter);
    }

    const { data, error: fetchError, count } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setFetching(false);
      return;
    }

    setTotalCount(count ?? 0);

    const rows = (data ?? []) as unknown as {
      id: string;
      title: string | null;
      body: string | null;
      author_id: string;
      like_count: number;
      is_hidden: boolean;
      created_at: string;
      boards: { name: string; board_type: BoardType } | null;
    }[];

    const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
    const { data: profiles, error: profileError } =
      authorIds.length > 0
        ? await supabase.from("public_profiles").select("id, name").in("id", authorIds)
        : { data: [] as { id: string; name: string }[], error: null };

    if (profileError) {
      setError(profileError.message);
      setFetching(false);
      return;
    }

    const nameById = new Map(
      ((profiles ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
    );

    setError(null);
    setPosts(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        author_id: r.author_id,
        authorName: nameById.get(r.author_id) ?? "알 수 없음",
        board_name: r.boards?.name ?? "-",
        board_type: r.boards?.board_type ?? "topic",
        like_count: r.like_count,
        is_hidden: r.is_hidden,
        created_at: r.created_at,
      })),
    );
    setFetching(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, boardTypeFilter, page]);

  function selectBoardTypeFilter(next: BoardType | "all") {
    setBoardTypeFilter(next);
    setPage(1);
  }

  async function toggleHidden(post: PostRow) {
    setProcessingId(post.id);
    const nextHidden = !post.is_hidden;
    const { error: updateError } = await supabase
      .from("posts")
      .update({ is_hidden: nextHidden })
      .eq("id", post.id);
    setProcessingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPosts((rows) => rows.map((r) => (r.id === post.id ? { ...r, is_hidden: nextHidden } : r)));
  }

  async function handleDelete(post: PostRow) {
    if (!confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setProcessingId(post.id);
    const { error: deleteError } = await supabase.from("posts").delete().eq("id", post.id);
    setProcessingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPosts((rows) => rows.filter((r) => r.id !== post.id));
  }

  if (noBoardsInDomain && !fetching) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
        <p className="text-gray-400 text-sm">
          {ADMIN_DOMAIN_LABELS[domain]} 도메인에 속한 게시판이 아직 없어요.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => selectBoardTypeFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            boardTypeFilter === "all"
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          전체
        </button>
        {BOARD_TYPE_OPTIONS.map((bt) => (
          <button
            key={bt.value}
            type="button"
            onClick={() => selectBoardTypeFilter(bt.value)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              boardTypeFilter === bt.value
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {bt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-4">{error}</div>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">표시할 글이 없어요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">게시판</th>
                <th className="py-2 pr-3">제목/내용</th>
                <th className="py-2 pr-3">작성자</th>
                <th className="py-2 pr-3">좋아요</th>
                <th className="py-2 pr-3">작성일</th>
                <th className="py-2 pr-3">공개 여부</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 whitespace-nowrap">{post.board_name}</td>
                  <td className="py-2 pr-3 max-w-xs truncate">
                    {post.title || post.body || "(내용 없음)"}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{post.authorName}</td>
                  <td className="py-2 pr-3">{post.like_count}</td>
                  <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(post.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">
                    {post.is_hidden ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                        숨김
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                        공개
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHidden(post)}
                        disabled={processingId === post.id}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                      >
                        {post.is_hidden ? "숨김 해제" : "숨기기"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post)}
                        disabled={processingId === post.id}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
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

      {totalCount > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            {totalCount}건 중 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || fetching}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-xs">
              {page} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => (p * PAGE_SIZE < totalCount ? p + 1 : p))}
              disabled={page * PAGE_SIZE >= totalCount || fetching}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
