"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ADMIN_DOMAIN_LABELS, type AdminDomain } from "@/lib/adminDomainGrouping";
import {
  fetchNavBranches,
  fetchBoardBranchMap,
  buildAdminTree,
  type NavBranchNode,
} from "@/lib/adminTreeGrouping";

// EPIC-028의 "[살롱데상] 카테고리별 글 관리"를 EPIC-072에서 도메인
// 매개변수화해 일반화한 버전 — `posts`(+`boards`) 테이블을 최신순 데이터
// 테이블로 조회/관리하되, 이제 board_type이 아니라 "이 게시판이 어느
// 도메인(사일로상점/살롱데상/스튜디오/마이페이지)에 속하는가"로 먼저
// 걸러서 각 도메인 탭이 실제로 그 도메인의 게시글만 보여준다.
//
// boards에 도메인 컬럼이 없어 이 게시판들이 어느 도메인인지 서버 쿼리
// 하나로 걸러낼 수 없다 — 먼저 boards 전체(수십 개 수준)를 가져와
// adminTreeGrouping.ts의 실제 site_navigations 트리 매칭(어느 페이지가
// 이 게시판을 위젯으로 연결했는지 → 그 페이지가 어느 nav 브랜치인지)으로
// 도메인을 정확히 판별한 뒤, 그 도메인에 속하는 board_id 목록으로 posts를
// 필터링하는 2단계 조회를 쓴다(EPIC-072B, 키워드 추정 대신 실제 구조 매칭).
// 화면 자체도 평면 표가 아니라 그 트리 그대로 들여쓰기된 목록으로 그린다 —
// 단, 페이지네이션은 기존처럼 도메인 전체를 최신순으로 20건씩 자르므로,
// 한 페이지 안의 트리는 그 페이지에 걸린 게시글의 브랜치만 보여준다(모든
// 브랜치를 항상 완전하게 보여주는 것은 아님).

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
  board_id: string;
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

// EPIC-096(요구사항 1.1): "즉각적인 필터링 및 다중 정렬" — 이 화면은
// board_type 칩 필터에 더해 정렬 기준을 하나 더 고를 수 있게 한다(진짜
// 다중 컬럼 정렬은 이 규모(도메인별 20건 페이지네이션)엔 과한 UI라, 클릭
// 한 번으로 즉시 바뀌는 단일 정렬 기준 + 기존 board_type 필터의 조합으로
// 실질적 요구를 충족한다).
type SortOption = "latest" | "oldest" | "likes";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "likes", label: "좋아요순" },
];

export function AdminPostsBoardView({ domain }: { domain: AdminDomain }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());
  const [allBoardOptions, setAllBoardOptions] = useState<{ id: string; name: string }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardTypeFilter, setBoardTypeFilter] = useState<BoardType | "all">("all");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noBoardsInDomain, setNoBoardsInDomain] = useState(false);
  // EPIC-087-PHASE-A: 다중 선택 + 일괄 작업. 페이지/필터가 바뀌면 이전 선택은
  // 화면에 없는 글을 가리키게 되므로 load() 성공 시 함께 비운다.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  async function load() {
    setFetching(true);

    const [{ data: allBoards, error: boardsError }, navBranches] = await Promise.all([
      supabase.from("boards").select("id, name, category, group_key"),
      fetchNavBranches(),
    ]);

    if (boardsError) {
      setError(boardsError.message);
      setFetching(false);
      return;
    }

    const branchMap = await fetchBoardBranchMap(navBranches);
    const branchById = new Map(navBranches.map((b) => [b.id, b]));
    setBranches(navBranches);
    setBoardBranchMap(branchMap);
    // EPIC-096(요구사항 1.1): 인라인 "카테고리(게시판) 이동" select용 —
    // 도메인 제한 없이 전체 게시판 목록에서 고를 수 있게 한다(다른 도메인
    // 게시판으로 옮기는 것도 유효한 관리 작업이라 이 화면의 domain 필터로
    // 좁히지 않는다).
    setAllBoardOptions(
      (allBoards ?? [])
        .map((b) => ({ id: b.id, name: (b as { name?: string }).name ?? "(이름 없음)" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );

    // 사이트 내비게이션 트리에서 이 도메인(4대 탭 중 하나)에 속하는 것으로
    // 매칭된 게시판만 이 화면에 노출한다 — 어디에도 매칭 안 되는 게시판은
    // 이 도메인 탭이 아니라 "공통/기타" 탭(domain==="common")에서만 보인다.
    const domainBoardIds = (allBoards ?? [])
      .filter((b) => {
        const branchId = branchMap.get(b.id);
        const boardDomain = branchId ? (branchById.get(branchId)?.domain ?? "common") : "common";
        return boardDomain === domain;
      })
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
      .select(`id, title, body, author_id, board_id, like_count, is_hidden, created_at, ${boardsSelect}`, {
        count: "exact",
      })
      .in("board_id", domainBoardIds)
      .order(
        sortOption === "likes" ? "like_count" : "created_at",
        { ascending: sortOption === "oldest" },
      )
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
      board_id: string;
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
    setSelectedIds(new Set());
    setPosts(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        author_id: r.author_id,
        authorName: nameById.get(r.author_id) ?? "알 수 없음",
        board_id: r.board_id,
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
  }, [domain, boardTypeFilter, sortOption, page]);

  function selectBoardTypeFilter(next: BoardType | "all") {
    setBoardTypeFilter(next);
    setPage(1);
  }

  function selectSortOption(next: SortOption) {
    setSortOption(next);
    setPage(1);
  }

  // EPIC-096(요구사항 1.1): "카테고리 이동" — 인라인 select로 게시글의
  // 소속 게시판(board_id)을 바로 바꾼다. 이동 후에는 이 도메인에 안 속할
  // 수도 있어(다른 도메인 게시판으로 옮긴 경우) 목록을 다시 불러와
  // 자연스럽게 사라지게/유지되게 한다 — 로컬 state만 패치하면 도메인
  // 경계를 넘어간 이동이 화면에 그대로 남아 실제 상태와 어긋난다.
  async function moveToBoard(post: PostRow, boardId: string) {
    if (boardId === post.board_id) return;
    setProcessingId(post.id);
    const { error: updateError } = await supabase.from("posts").update({ board_id: boardId }).eq("id", post.id);
    setProcessingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id))));
  }

  // EPIC-087-PHASE-A: 단건 toggleHidden/handleDelete와 동일하게 direct
  // supabase 호출을 선택 집합에 대해 Promise.all로 반복한다 — 새 API
  // 라우트를 추가하지 않고 기존 관례를 그대로 확장.
  async function bulkSetHidden(hidden: boolean) {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    const { error: updateError } = await supabase.from("posts").update({ is_hidden: hidden }).in("id", ids);
    setBulkProcessing(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPosts((rows) => rows.map((r) => (selectedIds.has(r.id) ? { ...r, is_hidden: hidden } : r)));
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 글을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    const { error: deleteError } = await supabase.from("posts").delete().in("id", ids);
    setBulkProcessing(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPosts((rows) => rows.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  }

  // 사이트 내비게이션 트리 그대로 들여쓰기된 행 목록 — 게시글은 자기 자신이
  // 아니라 소속 게시판의 브랜치를 그대로 물려받는다.
  const treeRows = useMemo(
    () => buildAdminTree(posts, (p) => boardBranchMap.get(p.board_id) ?? null, branches, domain),
    [posts, boardBranchMap, branches, domain],
  );

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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
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
        <select
          value={sortOption}
          onChange={(e) => selectSortOption(e.target.value as SortOption)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-4">{error}</div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
          <span>{selectedIds.size}개 선택됨</span>
          <button
            type="button"
            onClick={() => bulkSetHidden(true)}
            disabled={bulkProcessing}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
          >
            일괄 숨기기
          </button>
          <button
            type="button"
            onClick={() => bulkSetHidden(false)}
            disabled={bulkProcessing}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
          >
            일괄 숨김 해제
          </button>
          <button
            type="button"
            onClick={bulkDelete}
            disabled={bulkProcessing}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            일괄 삭제
          </button>
        </div>
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
                <th className="py-2 pr-3 w-8">
                  <input
                    type="checkbox"
                    checked={posts.length > 0 && selectedIds.size === posts.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < posts.length;
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-2 pr-3">게시판</th>
                <th className="py-2 pr-3">제목/내용</th>
                <th className="py-2 pr-3">작성자</th>
                <th className="py-2 pr-3">좋아요</th>
                <th className="py-2 pr-3">작성일</th>
                <th className="py-2 pr-3">공개 여부</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            {/* EPIC-075: 이 화면에는 드래그앤드롭 순서 변경을 추가하지 않았다 —
                게시글은 본질적으로 시간순 콘텐츠라(정렬 기준 자체가 "최신순"),
                자유롭게 수동 순서를 매기는 대신 상단 필터/정렬로 다루는 게
                맞다고 판단했다. 브랜치(📂 카테고리) 순서 변경은 이미
                /admin/navigation(CategoryTreeManager)이 site_navigations를
                직접 편집해 처리하므로, 여기 별도로 다시 구현하지 않았다(같은
                site_navigations 데이터를 보여주는 파생 화면이라 그쪽에서
                바꾸면 여기도 새로고침 시 그대로 반영된다) — admin/pages·
                admin/boards의 항목(📄) 드래그앤드롭만 새로 추가함. */}
            <tbody>
              {treeRows.map((row) =>
                row.kind === "branch" ? (
                  <tr key={`branch-${row.id}`}>
                    <td
                      colSpan={8}
                      style={{ paddingLeft: row.depth * 20 }}
                      className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400"
                    >
                      📂 {row.title}
                    </td>
                  </tr>
                ) : (
                  <tr key={row.item.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.item.id)}
                        onChange={() => toggleSelect(row.item.id)}
                      />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap" style={{ paddingLeft: row.depth * 20 }}>
                      <select
                        value={row.item.board_id}
                        disabled={processingId === row.item.id}
                        onChange={(e) => moveToBoard(row.item, e.target.value)}
                        className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs disabled:opacity-50"
                      >
                        {!allBoardOptions.some((b) => b.id === row.item.board_id) && (
                          <option value={row.item.board_id}>{row.item.board_name}</option>
                        )}
                        {allBoardOptions.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 max-w-xs truncate">
                      {row.item.title || row.item.body || "(내용 없음)"}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{row.item.authorName}</td>
                    <td className="py-2 pr-3">{row.item.like_count}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(row.item.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {row.item.is_hidden ? (
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
                          onClick={() => toggleHidden(row.item)}
                          disabled={processingId === row.item.id}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                        >
                          {row.item.is_hidden ? "숨김 해제" : "숨기기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.item)}
                          disabled={processingId === row.item.id}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
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
