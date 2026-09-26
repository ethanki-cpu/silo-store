"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { uploadImage } from "@/lib/adminImageUpload";
import { hrefToSlug } from "@/lib/pageTemplates";
import {
  fetchNavBranches,
  fetchBoardBranchMap,
  buildAdminTree,
  type NavBranchNode,
} from "@/lib/adminTreeGrouping";

// EPIC-161: 게시판별 멤버십 권한 매트릭스 — 행=게시판, 열=등급, 셀=태그(열람/
// 게시글열람/댓글/좋아요/북마크/글쓰기). 데이터는 boards의 min_rank_to_* 컬럼
// 6개(전부 "이 등급부터 가능" 단일 임계값, membership_tiers(rank) 참조, null=
// 게이트 없음)이고 기존 /api/admin/boards(GET)/[id](PATCH)를 그대로 쓴다 —
// EDITABLE_FIELDS에 신규 5개 컬럼만 추가했다(src/app/api/admin/boards/[id]/route.ts).
// "등급은 누적형"이라 특정 등급에서 켜면 그 등급 이상 전체에 자동 적용된다(min_rank_to_write
// 등 기존 컬럼과 동일한 모델) — 중간 등급만 끄고 위 등급은 유지하는 건 표현할 수 없다.

type BoardRow = {
  id: string;
  name: string;
  category: string | null;
  min_rank_to_read: number | null;
  min_rank_to_view_post: number | null;
  min_rank_to_comment: number | null;
  min_rank_to_like: number | null;
  min_rank_to_bookmark: number | null;
  min_rank_to_write: number | null;
  min_rank_to_propose: number | null;
  badge_min_rank: number | null;
  daily_view_limits: Record<string, number> | null;
};

type RankFieldKey =
  | "min_rank_to_read"
  | "min_rank_to_view_post"
  | "min_rank_to_comment"
  | "min_rank_to_like"
  | "min_rank_to_bookmark"
  | "min_rank_to_write"
  | "min_rank_to_propose";

const CAPS: { key: RankFieldKey; label: string }[] = [
  { key: "min_rank_to_read", label: "열람" },
  { key: "min_rank_to_view_post", label: "게시글열람" },
  { key: "min_rank_to_comment", label: "댓글" },
  { key: "min_rank_to_like", label: "좋아요" },
  { key: "min_rank_to_bookmark", label: "북마크" },
  { key: "min_rank_to_write", label: "글쓰기" },
  { key: "min_rank_to_propose", label: "제안" },
];

// 비회원은 저장값 null로 표현(다른 min_rank_to_* 컬럼과 동일 컨벤션) — "다음
// 등급"은 이 배열의 다음 rank, Lautrec(4) 다음은 membership_tiers에 실존하는
// 랭크 중 일반 5등급 사다리 밖인 99(Artist)를 "사실상 아무도 없음"으로 쓴다.
const TIERS: { rank: number | null; label: string }[] = [
  { rank: null, label: "비회원" },
  { rank: 0, label: "Silo Angel" },
  { rank: 1, label: "Alice" },
  { rank: 2, label: "Great Gatsby" },
  { rank: 3, label: "Patron" },
  { rank: 4, label: "Lautrec" },
];

function isGranted(minRank: number | null, tierRank: number | null): boolean {
  if (minRank == null) return true;
  if (tierRank == null) return false; // 비회원은 minRank가 null일 때만 통과
  return tierRank >= minRank;
}

function nextThreshold(tierRank: number | null): number | null {
  if (tierRank == null) return 0; // 비회원 다음 = Silo Angel
  if (tierRank === 4) return 99; // Lautrec 다음 = "사실상 아무도 없음"
  return tierRank + 1;
}

function toggle(minRank: number | null, tierRank: number | null): number | null {
  const granted = isGranted(minRank, tierRank);
  return granted ? nextThreshold(tierRank) : tierRank;
}

const BADGE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "없음" },
  { value: 0, label: "Silo Angel부터" },
  { value: 1, label: "Alice부터" },
  { value: 2, label: "Great Gatsby부터" },
  { value: 3, label: "Patron부터" },
  { value: 4, label: "Lautrec부터" },
];

// HOTFIX-161.6(사용자 신고 — "여전히 내가 원하는 스크린샷의 상위 카테고리와
// 그 아래 하위 카테고리가 아니야"): EPIC-161 Phase 4가 만든 트리는
// boardLayout.ts의 INDIVIDUAL_BOARD_DEFINITIONS(코드에 하드코딩된 parent/
// title_ko)를 근거로 삼았는데, 이건 "/admin/site-structure"(사이트 메뉴,
// 사용자가 원하는 실제 기준 화면)가 보여주는 실제 site_navigations 트리와
// 다른 별개의 분류 체계였다 — 그래서 상위/하위 카테고리가 실제 사이트
// 메뉴와 안 맞았다. adminTreeGrouping.ts(fetchNavBranches/fetchBoardBranchMap/
// buildAdminTree)가 이미 "전체 글 관리"(AdminPostsBoardView.tsx)에서 같은
// 문제(게시글을 실제 site_navigations 트리 기준으로 보여주기)를 정확히
// 풀어둔 공용 유틸이다 — 새로 만들지 않고 그대로 재사용한다: 게시판의
// "진짜 소속"은 그 게시판을 board 위젯으로 연결한 페이지가 site_navigations
// 트리의 어느 가지에 있는지로 정확히 계산되고(카테고리 문자열 매칭이
// 아니라 실제 연결 관계), 매칭 안 되는 게시판은 "기타 / 미분류" 버킷으로
// (buildAdminTree가 자동으로) 모인다.

type MergedRow =
  | { kind: "branch"; id: string; title: string; href: string | null; depth: number; ownBoard: BoardRow | null }
  | { kind: "item"; depth: number; item: BoardRow };

export default function BoardPermissionsPage() {
  const { session, member, loading, memberLoading } = useAuth();
  const [boards, setBoards] = useState<BoardRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, BoardRow>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // HOTFIX-162.3(사용자 신고 — "브라우저의 다른 탭을 보고 오면 항상 리셋돼"): 탭에 돌아오면
  // Supabase가 세션(토큰)을 갱신하며 session/member 객체가 새로 만들어지는데, 아래 로딩
  // effect들이 그 객체를 deps로 잡고 있어 매번 다시 실행되며 편집 중이던 draft를 전부 서버
  // 값으로 덮어썼다. 이제 "관리자로 인증됨"이라는 boolean 하나만 보고, 각 데이터는 최초 1번만
  // 불러온다(토큰은 ref로 최신값만 읽음).
  const authReady = !loading && !memberLoading && !!session && !!member?.is_admin;
  const tokenRef = useRef<string | undefined>(session?.access_token);
  useEffect(() => {
    tokenRef.current = session?.access_token;
  }, [session?.access_token]);
  const started = useRef({ tiers: false, gates: false, boards: false });

  // HOTFIX-161.7(사용자 지시 — "각 멤버십마다 대표 사진을 넣고 싶어",
  // "이 편집은 기존 화면에 추가"): 등급별 대표 사진(membership_tiers.image_url)
  // 업로드를 이 화면(관리자가 이미 등급×게시판 권한을 편집하는 곳) 맨 위에
  // 추가한다 — 새 화면을 따로 만들지 않는다. membership_tiers는 RLS에
  // 관리자 전용 UPDATE 정책이 이미 있어(membership_tiers_admin_write)
  // 클라이언트에서 바로 supabase.update()를 호출해도 안전하다.
  const [tiers, setTiers] = useState<{ rank: number; name: string; image_url: string | null }[] | null>(null);
  const [uploadingTierRank, setUploadingTierRank] = useState<number | null>(null);

  useEffect(() => {
    if (!authReady || started.current.tiers) return;
    started.current.tiers = true;
    supabase
      .from("membership_tiers")
      .select("rank, name, image_url")
      .lt("rank", 100) // EPIC-168: Owner는 제외
      .order("rank", { ascending: true })
      .then(({ data }) => {
        setTiers((data ?? []) as { rank: number; name: string; image_url: string | null }[]);
      });
  }, [authReady]);

  async function uploadTierImage(rank: number, file: File) {
    setUploadingTierRank(rank);
    const { url, error: uploadError } = await uploadImage(file, "membership_tier_image");
    if (uploadError || !url) {
      setUploadingTierRank(null);
      setError(uploadError ?? "이미지 업로드에 실패했어요.");
      return;
    }
    const { error: updateError } = await supabase.from("membership_tiers").update({ image_url: url }).eq("rank", rank);
    setUploadingTierRank(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTiers((prev) => prev?.map((t) => (t.rank === rank ? { ...t, image_url: url } : t)) ?? prev);
  }

  async function removeTierImage(rank: number) {
    const { error: updateError } = await supabase.from("membership_tiers").update({ image_url: null }).eq("rank", rank);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTiers((prev) => prev?.map((t) => (t.rank === rank ? { ...t, image_url: null } : t)) ?? prev);
  }

  // HOTFIX-162.1(사용자 신고 — "최상위/중간/최하위 카테고리 중 권한을 입력할 수 없는 곳이
  // 꽤 있다(사일로 상점/살롱데상/커뮤니티)"): 게시판이 직접 연결되지 않은 카테고리(허브
  // 페이지) 행에는 지금까지 권한 입력칸이 아예 없었다. 그런 카테고리 페이지 자체의 열람
  // 등급은 page_builder.min_rank_to_read(이미 usePageRankGate로 강제되는 값)이므로, 그
  // 한 가지 권한("페이지 열람")을 카테고리 행에서 직접 편집하게 한다 — 댓글/좋아요 같은 나머지는
  // 게시판에만 있는 개념이라 게시판 행에서 그대로 편집한다.
  const [pageGates, setPageGates] = useState<Record<string, { id: string; min: number | null; orig: number | null }>>({});
  const [savingPageId, setSavingPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || started.current.gates) return;
    started.current.gates = true;
    supabase
      .from("page_builder")
      .select("id, slug, min_rank_to_read")
      .then(({ data }) => {
        const map: Record<string, { id: string; min: number | null; orig: number | null }> = {};
        for (const r of (data ?? []) as { id: string; slug: string; min_rank_to_read: number | null }[]) {
          map[r.slug] = { id: r.id, min: r.min_rank_to_read, orig: r.min_rank_to_read };
        }
        setPageGates(map);
      });
  }, [authReady]);

  async function savePageGate(slug: string) {
    const g = pageGates[slug];
    if (!g) return;
    setSavingPageId(g.id);
    setError(null);
    const { error: updateError } = await supabase.from("page_builder").update({ min_rank_to_read: g.min }).eq("id", g.id);
    setSavingPageId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPageGates((prev) => ({ ...prev, [slug]: { ...g, orig: g.min } }));
  }

  // HOTFIX-161.6: 게시판 목록과 나란히, 실제 site_navigations 트리(branches)
  // + "이 게시판이 그 트리의 어느 가지에 연결됐는지"(boardBranchMap)를
  // 함께 불러온다 — /admin/site-structure(사이트 메뉴)와 완전히 같은
  // 근거 데이터라 거기 보이는 상위/하위 구조가 여기서도 그대로 재현된다.
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!authReady || started.current.boards) return;
    started.current.boards = true;
    (async () => {
      try {
        const [res, navBranches] = await Promise.all([
          fetch("/api/admin/boards", {
            headers: { Authorization: `Bearer ${tokenRef.current}` },
          }),
          fetchNavBranches(),
        ]);
        const data: BoardRow[] = await res.json();
        if (!res.ok) {
          setError("게시판 목록을 불러오지 못했어요.");
          return;
        }
        const branchMap = await fetchBoardBranchMap(navBranches);
        setBranches(navBranches);
        setBoardBranchMap(branchMap);
        setBoards(data);
        const initial: Record<string, BoardRow> = {};
        for (const b of data) initial[b.id] = b;
        setDrafts(initial);
      } catch {
        setError("게시판 목록을 불러오지 못했어요.");
      }
    })();
  }, [authReady]);

  const filtered = useMemo(() => {
    if (!boards) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter(
      (b) => b.name?.toLowerCase().includes(q) || b.category?.toLowerCase().includes(q),
    );
  }, [boards, filter]);

  const treeRows = useMemo(
    () => buildAdminTree(boards ?? [], (b) => boardBranchMap.get(b.id) ?? null, branches, "all"),
    [boards, boardBranchMap, branches],
  );

  // 기본은 전부 펼친 상태(매트릭스를 훑어보는 화면이라 접혀 있으면 오히려
  // 불편) — 이 Set에 들어있는 브랜치 id만 접힌 것으로 취급한다.
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  function toggleCollapsed(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // buildAdminTree는 항상 "펼친" 평면 목록을 주므로, 접힌 브랜치의 자손
  // (더 깊은 depth의 뒤따르는 행들)을 걸러내는 건 이 화면에서 처리한다 —
  // depth-first로 순회하다 접힌 브랜치를 만나면 그보다 깊은 행을 다음에
  // depth가 그 이하로 돌아올 때까지 스킵한다.
  // HOTFIX-162.2(사용자 신고 — "About Silo 페이지에 게시판이 있는데 '페이지 열람'만 가능하게
  // 하지 마"): 카테고리에 게시판이 직접 연결돼 있으면 그 카테고리 행 자체가 게시판 권한 행이
  // 되게(폴더 토글 + 전체 매트릭스) 합친다 — 접어도 그 행은 그대로 편집 가능. 게시판이 둘
  // 이상이면 첫 번째만 합치고 나머지는 하위 행으로 그대로 둔다.
  const visibleRows = useMemo(() => {
    const merged: MergedRow[] = [];
    for (let i = 0; i < treeRows.length; i++) {
      const row = treeRows[i];
      if (row.kind === "branch") {
        const next = treeRows[i + 1];
        if (next && next.kind === "item" && next.depth === row.depth + 1) {
          merged.push({ ...row, ownBoard: next.item });
          i++;
          continue;
        }
        merged.push({ ...row, ownBoard: null });
      } else {
        merged.push(row);
      }
    }
    const rows: MergedRow[] = [];
    let hideDeeperThan: number | null = null;
    for (const row of merged) {
      if (hideDeeperThan !== null) {
        if (row.depth > hideDeeperThan) continue;
        hideDeeperThan = null;
      }
      rows.push(row);
      if (row.kind === "branch" && collapsedKeys.has(row.id)) {
        hideDeeperThan = row.depth;
      }
    }
    return rows;
  }, [treeRows, collapsedKeys]);

  function updateDraft(boardId: string, patch: Partial<BoardRow>) {
    setDrafts((prev) => ({ ...prev, [boardId]: { ...prev[boardId], ...patch } }));
  }

  function isDirty(boardId: string): boolean {
    const original = boards?.find((b) => b.id === boardId);
    const draft = drafts[boardId];
    if (!original || !draft) return false;
    if ([...CAPS.map((c) => c.key), "badge_min_rank" as const].some((key) => original[key] !== draft[key])) {
      return true;
    }
    return JSON.stringify(original.daily_view_limits ?? {}) !== JSON.stringify(draft.daily_view_limits ?? {});
  }

  function updateDailyLimit(boardId: string, tierRank: number, raw: string) {
    const draft = drafts[boardId];
    const next = { ...(draft.daily_view_limits ?? {}) };
    if (raw.trim() === "") {
      delete next[String(tierRank)];
    } else {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) next[String(tierRank)] = n;
    }
    updateDraft(boardId, { daily_view_limits: next });
  }

  // 게시판 하나를 서버에 저장하고 성공 여부를 돌려준다(개별 저장/모두 저장 공용).
  async function saveOne(boardId: string): Promise<boolean> {
    const token = tokenRef.current;
    if (!token) return false;
    const draft = drafts[boardId];
    const patch: Record<string, number | null | Record<string, number> | null> = {};
    for (const cap of CAPS) patch[cap.key] = draft[cap.key] as number | null;
    patch.badge_min_rank = draft.badge_min_rank;
    patch.daily_view_limits =
      draft.daily_view_limits && Object.keys(draft.daily_view_limits).length > 0 ? draft.daily_view_limits : null;

    const res = await fetch(`/api/admin/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(`${draft.name}: ${data.error ?? "저장에 실패했어요."}`);
      return false;
    }
    setBoards((prev) => prev?.map((b) => (b.id === boardId ? { ...b, ...draft } : b)) ?? prev);
    setSavedAt((prev) => ({ ...prev, [boardId]: Date.now() }));
    return true;
  }

  async function save(boardId: string) {
    setSaving(boardId);
    setError(null);
    await saveOne(boardId);
    setSaving(null);
  }

  // HOTFIX-162.3(사용자 지시 — "바뀐 여러 게시판의 설정을 한번에 저장할 수 있는 버튼"): 바뀐
  // 게시판 + 바뀐 카테고리 페이지 열람 설정을 전부 한 번에 저장한다.
  const dirtyBoardIds = (boards ?? []).filter((b) => isDirty(b.id)).map((b) => b.id);
  const dirtyGateSlugs = Object.entries(pageGates)
    .filter(([, g]) => g.min !== g.orig)
    .map(([slug]) => slug);
  const dirtyCount = dirtyBoardIds.length + dirtyGateSlugs.length;
  const [savingAll, setSavingAll] = useState(false);
  const [saveAllMessage, setSaveAllMessage] = useState<string | null>(null);

  async function saveAll() {
    setSavingAll(true);
    setError(null);
    setSaveAllMessage(null);
    let ok = 0;
    let fail = 0;
    for (const id of dirtyBoardIds) {
      if (await saveOne(id)) ok++;
      else fail++;
    }
    for (const slug of dirtyGateSlugs) {
      const g = pageGates[slug];
      const { error: gateError } = await supabase.from("page_builder").update({ min_rank_to_read: g.min }).eq("id", g.id);
      if (gateError) {
        fail++;
        setError(`${slug}: ${gateError.message}`);
      } else {
        ok++;
        setPageGates((prev) => ({ ...prev, [slug]: { ...prev[slug], orig: g.min } }));
      }
    }
    setSavingAll(false);
    setSaveAllMessage(`${ok}건 저장${fail ? `, ${fail}건 실패` : "됨"}`);
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

  return (
    <main className="flex-1 p-6">
      <h1 className="text-xl font-bold mb-1">멤버십 권한</h1>
      <p className="text-sm text-gray-500 mb-4">
        게시판마다 등급별로 열람/게시글열람/댓글/좋아요/북마크/글쓰기 가능 여부를 정합니다. 태그를 클릭하면 켜고 끌 수 있어요 — 등급은
        누적형이라 특정 등급에서 켜면 그 등급 이상은 전부 자동으로 켜져요(중간만 끄고 위 등급만 유지할 수는 없어요). 행마다 따로
        저장해야 반영돼요.
      </p>

      {/* HOTFIX-161.7(사용자 지시): 등급별 대표 사진 — /membership·/pricing
          카드 상단에 그대로 보여요. 안 올리면 사진 없이(기존과 동일하게) 나와요. */}
      <div className="mb-6 rounded-md border border-gray-200 p-4">
        <p className="mb-1 text-sm font-semibold text-gray-700">등급별 대표 사진</p>
        <p className="mb-3 text-xs text-gray-400">/membership과 /pricing의 등급 카드 위에 함께 표시돼요.</p>
        {!tiers ? (
          <p className="text-xs text-gray-400">불러오는 중...</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {tiers.map((t) => (
              <div key={t.rank} className="w-36">
                <p className="mb-1 text-xs font-medium text-gray-600">
                  {t.name} {uploadingTierRank === t.rank && "(업로드 중...)"}
                </p>
                {t.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image_url} alt={t.name} className="mb-1 h-24 w-full rounded border border-gray-200 object-cover" />
                ) : (
                  <div className="mb-1 flex h-24 w-full items-center justify-center rounded border border-dashed border-gray-300 text-[11px] text-gray-400">
                    사진 없음
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingTierRank !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file) uploadTierImage(t.rank, file);
                    e.target.value = "";
                  }}
                  className="w-full text-[10px]"
                />
                {t.image_url && (
                  <button
                    type="button"
                    onClick={() => removeTierImage(t.rank)}
                    className="mt-0.5 text-[11px] text-blue-600 hover:underline"
                  >
                    제거
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sticky top-0 z-20 mb-3 flex items-center gap-3 border-b border-gray-200 bg-white/95 py-2 backdrop-blur">
        <button
          type="button"
          onClick={saveAll}
          disabled={dirtyCount === 0 || savingAll}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {savingAll ? "저장 중..." : `변경된 ${dirtyCount}건 모두 저장`}
        </button>
        {saveAllMessage && dirtyCount === 0 && <span className="text-sm text-green-600">{saveAllMessage}</span>}
        {dirtyCount > 0 && <span className="text-xs text-amber-600">저장하지 않은 변경이 있어요</span>}
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="게시판 이름/슬러그 검색"
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!boards ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="sticky left-0 bg-white p-2 pr-4 font-semibold">게시판</th>
                {TIERS.map((t) => (
                  <th key={t.label} className="p-2 font-semibold whitespace-nowrap">
                    {t.label}
                  </th>
                ))}
                <th className="p-2 font-semibold whitespace-nowrap">뱃지 대상</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {filter.trim()
                ? filtered.map((board) => (
                    <BoardEditorRow
                      key={board.id}
                      board={board}
                      depth={0}
                      draft={drafts[board.id] ?? board}
                      dirty={isDirty(board.id)}
                      saving={saving === board.id}
                      savedAt={!!savedAt[board.id]}
                      onUpdate={updateDraft}
                      onUpdateDailyLimit={updateDailyLimit}
                      onSave={save}
                    />
                  ))
                : visibleRows.map((row) =>
                    row.kind === "branch" && row.ownBoard ? (
                      <BoardEditorRow
                        key={`branch-${row.id}`}
                        board={row.ownBoard}
                        depth={row.depth}
                        draft={drafts[row.ownBoard.id] ?? row.ownBoard}
                        dirty={isDirty(row.ownBoard.id)}
                        saving={saving === row.ownBoard.id}
                        savedAt={!!savedAt[row.ownBoard.id]}
                        onUpdate={updateDraft}
                        onUpdateDailyLimit={updateDailyLimit}
                        onSave={save}
                        folder={{ title: row.title, collapsed: collapsedKeys.has(row.id), onToggle: () => toggleCollapsed(row.id) }}
                      />
                    ) : row.kind === "branch" ? (
                      <FolderHeaderRow
                        key={`branch-${row.id}`}
                        title={row.title}
                        depth={row.depth}
                        collapsed={collapsedKeys.has(row.id)}
                        onToggle={() => toggleCollapsed(row.id)}
                        gate={row.href ? pageGates[hrefToSlug(row.href)] : undefined}
                        gateSaving={row.href ? savingPageId === pageGates[hrefToSlug(row.href)]?.id : false}
                        onGateToggle={(tierRank) => {
                          const slug = hrefToSlug(row.href!);
                          setPageGates((prev) => ({ ...prev, [slug]: { ...prev[slug], min: toggle(prev[slug].min, tierRank) } }));
                        }}
                        onGateSave={() => savePageGate(hrefToSlug(row.href!))}
                      />
                    ) : (
                      <BoardEditorRow
                        key={row.item.id}
                        board={row.item}
                        depth={row.depth}
                        draft={drafts[row.item.id] ?? row.item}
                        dirty={isDirty(row.item.id)}
                        saving={saving === row.item.id}
                        savedAt={!!savedAt[row.item.id]}
                        onUpdate={updateDraft}
                        onUpdateDailyLimit={updateDailyLimit}
                        onSave={save}
                      />
                    ),
                  )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

// HOTFIX-161.6: buildAdminTree가 이미 펼친 평면 목록(branch/item)을 주므로
// 재귀 렌더링 컴포넌트가 더 필요 없다 — 폴더 헤더 하나만 남았다.
function FolderHeaderRow({
  title,
  depth,
  collapsed,
  onToggle,
  gate,
  gateSaving,
  onGateToggle,
  onGateSave,
}: {
  title: string;
  depth: number;
  collapsed: boolean;
  onToggle: () => void;
  gate?: { id: string; min: number | null; orig: number | null };
  gateSaving: boolean;
  onGateToggle: (tierRank: number | null) => void;
  onGateSave: () => void;
}) {
  const titleButton = (
    <button type="button" onClick={onToggle} style={{ paddingLeft: depth * 16 }} className="flex items-center gap-1.5 font-semibold text-gray-700">
      <span className="inline-block w-3 text-gray-400">{collapsed ? "▶" : "▼"}</span>
      📁 {title}
    </button>
  );
  if (!gate) {
    return (
      <tr className="border-b border-gray-100 bg-gray-50">
        <td colSpan={TIERS.length + 3} className="sticky left-0 bg-gray-50 p-2">
          {titleButton}
        </td>
      </tr>
    );
  }
  const dirty = gate.min !== gate.orig;
  return (
    <tr className="border-b border-gray-100 bg-gray-50 align-top">
      <td className="sticky left-0 bg-gray-50 p-2 pr-4">
        {titleButton}
        <div className="text-[11px] text-gray-400" style={{ paddingLeft: depth * 16 + 18 }}>
          카테고리 페이지 자체의 열람 권한
        </div>
      </td>
      {TIERS.map((tier) => {
        const granted = isGranted(gate.min, tier.rank);
        return (
          <td key={tier.label} className="p-2">
            <button
              type="button"
              onClick={() => onGateToggle(tier.rank)}
              className={`rounded-full border px-1.5 py-0.5 whitespace-nowrap ${
                granted ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-300"
              }`}
            >
              페이지 열람
            </button>
          </td>
        );
      })}
      <td className="p-2" />
      <td className="p-2">
        <button
          type="button"
          onClick={onGateSave}
          disabled={!dirty || gateSaving}
          className="rounded-md bg-gray-900 px-3 py-1 text-white disabled:opacity-40"
        >
          {gateSaving ? "저장 중..." : "저장"}
        </button>
        {!dirty && <span className="ml-2 text-[11px] text-gray-400">{gate.orig == null ? "전체 공개" : `${gate.orig}등급~`}</span>}
      </td>
    </tr>
  );
}

function BoardEditorRow({
  board,
  depth,
  draft,
  dirty,
  saving,
  savedAt,
  onUpdate,
  onUpdateDailyLimit,
  onSave,
  folder,
}: {
  folder?: { title: string; collapsed: boolean; onToggle: () => void };
  board: BoardRow;
  depth: number;
  draft: BoardRow;
  dirty: boolean;
  saving: boolean;
  savedAt: boolean;
  onUpdate: (boardId: string, patch: Partial<BoardRow>) => void;
  onUpdateDailyLimit: (boardId: string, tierRank: number, raw: string) => void;
  onSave: (boardId: string) => void;
}) {
  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="sticky left-0 bg-white p-2 pr-4" style={{ paddingLeft: 8 + depth * 16 }}>
        {folder ? (
          <button type="button" onClick={folder.onToggle} className="flex items-center gap-1.5 font-semibold text-gray-800">
            <span className="inline-block w-3 text-gray-400">{folder.collapsed ? "▶" : "▼"}</span>
            📁 {folder.title}
          </button>
        ) : (
          <div className="font-medium text-gray-900">{board.name}</div>
        )}
        <div className="text-gray-400" style={folder ? { paddingLeft: 18 } : undefined}>
          {folder ? `게시판: ${board.name}` : board.category}
        </div>
      </td>
      {TIERS.map((tier) => (
        <td key={tier.label} className="p-2">
          <div className="flex flex-wrap gap-1">
            {CAPS.map((cap) => {
              const granted = isGranted(draft[cap.key] as number | null, tier.rank);
              return (
                <button
                  key={cap.key}
                  type="button"
                  onClick={() =>
                    onUpdate(board.id, {
                      [cap.key]: toggle(draft[cap.key] as number | null, tier.rank),
                    } as Partial<BoardRow>)
                  }
                  className={`rounded-full border px-1.5 py-0.5 whitespace-nowrap ${
                    granted ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-300"
                  }`}
                >
                  {cap.label}
                </button>
              );
            })}
          </div>
          {tier.rank != null && (
            <div className="mt-1 flex items-center gap-1 text-gray-400">
              <span>일일</span>
              <input
                type="number"
                min={0}
                value={draft.daily_view_limits?.[String(tier.rank)] ?? ""}
                onChange={(e) => onUpdateDailyLimit(board.id, tier.rank as number, e.target.value)}
                placeholder="무제한"
                className="w-14 rounded border border-gray-200 px-1 py-0.5 text-gray-700"
              />
            </div>
          )}
        </td>
      ))}
      <td className="p-2">
        <select
          value={draft.badge_min_rank ?? ""}
          onChange={(e) => onUpdate(board.id, { badge_min_rank: e.target.value === "" ? null : Number(e.target.value) })}
          className="rounded-md border border-gray-300 px-1.5 py-1"
        >
          {BADGE_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <button
          type="button"
          onClick={() => onSave(board.id)}
          disabled={!dirty || saving}
          className="rounded-md bg-gray-900 px-3 py-1 text-white disabled:opacity-40"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {!dirty && savedAt && <span className="ml-2 text-green-600">저장됨</span>}
      </td>
    </tr>
  );
}
