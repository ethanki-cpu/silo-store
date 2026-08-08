"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import {
  fetchPageForAdmin,
  PAGE_MODULE_LABELS,
  PAGE_MODULE_ICONS,
  BOARD_LINKED_MODULE_TYPES,
  WIDGET_FIELDS,
  WIDGET_DEFAULT_SETTINGS,
  type PageBuilderRow,
  type PageModuleRow,
  type PageModuleType,
} from "@/lib/pageBuilder";
import { WidgetPalette } from "@/components/admin/WidgetPalette";
import { WidgetInspectorForm } from "@/components/admin/WidgetInspectorForm";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import {
  fetchNavBranches,
  fetchBoardBranchMap,
  type NavBranchNode,
} from "@/lib/adminTreeGrouping";
import { CategoryBoardPicker } from "@/components/common/CategoryBoardPicker";
import { RANK_OPTIONS, RENDER_TYPE_OPTIONS } from "@/components/admin/BoardForm";

type BoardOption = { id: string; name: string; render_type: string | null };
// EPIC-084: 위젯의 "게시판 선택" 드롭다운이 게시판 수십 개를 이름 알파벳
// 순서도 아닌 임의 순서로 flat하게 나열해 원하는 게시판을 찾기 힘들다는
// 요청 — adminTreeGrouping.ts(EPIC-072B, "사이트 구성 관리" 트리 뷰가 이미
// 쓰던 site_navigations 기반 브랜치 매칭)를 그대로 재사용한다.
// EPIC-084-REVISED: <optgroup> 단일 select(UUID 폴백 노출 가능성 포함)를
// 3열 Miller Columns 선택기(CategoryBoardPicker)로 교체 — navBranches/
// boardBranchMap을 그대로 넘긴다.

// EPIC-060/EPIC-065: Page Builder 편집 화면 — Visual Widget Builder.
// 운영자는 "+ 위젯 추가"(WidgetPalette) → 위젯 클릭(설정 펼침, settings는
// WidgetInspectorForm의 체크박스/드롭다운/텍스트/목록으로만 편집) → 저장
// 순서만으로 페이지를 완성한다. JSON/HTML을 직접 입력하는 화면은 기본적으로
// 없고, 우측 상단 "개발자 모드"를 켰을 때만 위젯별 원시 JSON 보기/수정이
// 나타난다(요구사항 10). 드래그 순서 변경은 EPIC-035(CategoryTreeManager)와
// 동일한 dnd-kit 조합을 그대로 재사용한다.
//
// 아키텍처: modules(state)는 DB와 항상 동기화된 "저장된" 상태다. 위젯 하나의
// Inspector를 열면 그 위젯만 draft(로컬 임시 상태)로 복사해 편집하고,
// Live Preview는 modules 배열에서 그 위젯 자리만 draft로 치환해서 그린다
// (PageBuilderRenderer는 순수 프레젠테이션이라 즉시 재렌더링됨, 새로고침
// 없음) — "저장" 버튼을 눌러야 draft가 실제로 DB/modules에 반영된다. 위젯
// 추가/복제/숨기기/삭제/순서 변경은 draft 없이 즉시 DB에 반영된다(기존
// EPIC-060 편집 화면과 동일한 즉시-저장 패턴).
export default function AdminPageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [page, setPage] = useState<PageBuilderRow | null>(null);
  const [modules, setModules] = useState<PageModuleRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [navBranches, setNavBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // EPIC-087-PHASE-C: null = 게이트 없음(전체 공개, 기존과 동일).
  const [minRankToRead, setMinRankToRead] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  // EPIC-088: "빈 게시판 추가" — 이 페이지에 board 위젯이 하나도 없을 때만
  // 노출한다(요구사항: "연동된 게시판이 없을 경우").
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);
  // HOTFIX-090: EPIC-088/089 둘 다 "연동된 게시판이 없으면 게시판 추가
  // 버튼을 보여달라"고 지시했는데, 실제로 만든 버튼(위 creatingBoard 쪽)은
  // 페이지 전체에 board 위젯이 하나도 없을 때만 보이는 조건이었다 — 이미
  // board 위젯을 추가했지만 아직 게시판을 안 고른 상태(가장 흔한 실사용
  // 시나리오: "+위젯 추가"→"Board" 선택 직후)에는 그 위젯의 "게시판 선택"
  // 패널 안에 새로 만드는 버튼이 전혀 없었다 — 이게 진짜 신고 원인. 이제
  // 위젯별로(어느 위젯의 "새 게시판 추가"를 눌렀는지) 로딩 상태를 추적한다.
  const [addingBoardModuleId, setAddingBoardModuleId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBoardId, setDraftBoardId] = useState("");
  const [draftSettings, setDraftSettings] = useState<Record<string, unknown>>({});
  const [draftSaving, setDraftSaving] = useState(false);
  const [devJsonText, setDevJsonText] = useState("");
  const [devJsonError, setDevJsonError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  async function load() {
    setFetching(true);
    const data = await fetchPageForAdmin(id);
    if (!data) {
      setError("페이지를 찾을 수 없어요.");
      setFetching(false);
      return;
    }
    setPage(data.page);
    setModules(data.modules);
    setTitle(data.page.title);
    setDescription(data.page.description ?? "");
    setMinRankToRead(data.page.min_rank_to_read ?? null);
    setFetching(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // HOTFIX-090(요구사항: "게시판 선택 옵션이 사이트메뉴 변화에 바로
  // 적용되도록 연동"): 기존엔 컴포넌트가 처음 마운트될 때 한 번만 게시판
  // 목록/사이트 메뉴 트리를 불러왔다 — 관리자가 이 위젯 편집기 탭을 열어둔
  // 채로 다른 탭에서 "사이트 구성 관리"의 메뉴를 바꾸고 돌아오면 반영되지
  // 않았다. 두 조회를 재사용 가능한 함수로 뽑아 마운트 시 + 이 탭이 다시
  // 포커스를 받을 때(다른 탭에서 메뉴를 바꾸고 돌아오는 가장 흔한 시나리오)
  // 마다 다시 불러온다 — 실시간 구독(Supabase Realtime)까지는 이 화면
  // 규모에 과한 인프라라 판단해 window focus 트리거로 충분히 해결한다.
  async function loadBoards() {
    const res = await fetch("/api/boards", {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      // EPIC-066: Page Builder 위젯의 게시판 드롭다운은 공개된 게시판만
      // 골라야 한다(요구사항 ②) — is_public===false만 명시적으로
      // 제외하고, 필드 자체가 없으면(마이그레이션 전) 기존처럼 전부 보여준다.
      setBoards(
        data
          .filter((b: { is_public?: boolean }) => b.is_public !== false)
          .map((b: { id: string; name: string; render_type?: string | null }) => ({
            id: b.id,
            name: b.name,
            render_type: b.render_type ?? null,
          })),
      );
    }
  }

  async function loadNavBranches() {
    const branches = await fetchNavBranches();
    setNavBranches(branches);
    setBoardBranchMap(await fetchBoardBranchMap(branches));
  }

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    loadNavBranches();

    function onFocus() {
      loadBoards();
      loadNavBranches();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // EPIC-084: branchId(또는 미분류) → "브랜치 경로 - 게시판들" 그룹으로 묶는다.
  async function handleSavePage() {
    if (!page) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({
        title,
        description,
        min_rank_to_read: minRankToRead,
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  async function handleToggleStatus() {
    if (!page) return;
    const nextStatus = page.status === "published" ? "draft" : "published";
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", page.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  async function handleSelectWidget(type: PageModuleType) {
    if (!page) return;
    setPaletteOpen(false);
    const needsBoard = BOARD_LINKED_MODULE_TYPES.includes(type);
    const { data: inserted, error: insertError } = await supabase
      .from("page_modules")
      .insert({
        page_id: page.id,
        module_type: type,
        board_id: null,
        settings: WIDGET_DEFAULT_SETTINGS[type] ?? {},
        sort_order: modules.length,
        is_hidden: false,
      })
      .select()
      .single();
    if (insertError || !inserted) {
      setError(insertError?.message ?? "위젯을 추가하지 못했어요.");
      return;
    }
    const newModule = inserted as PageModuleRow;
    setModules((prev) => [...prev, newModule]);
    if (needsBoard) {
      openEditor(newModule);
    }
  }

  // EPIC-088: 이 페이지에 종속된 새 게시판을 즉시 생성하고, board 위젯으로
  // 바로 연결한 뒤 그 게시판의 수정 화면으로 넘어간다 — "게시판 선택
  // 드롭다운에서 고를 게 없어 되돌아가야 하는" 왕복을 없앤다. 슬러그
  // (category)는 페이지 slug를 그대로 쓰고, 이미 쓰이고 있으면(POST가 409로
  // 알려줌) "-board" 접미사를 붙여 한 번 더 시도한다.
  async function handleCreateEmptyBoard() {
    if (!page || !session) return;
    setCreatingBoard(true);
    setCreateBoardError(null);

    async function tryCreate(category: string) {
      return fetch("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session!.access_token}` },
        body: JSON.stringify({ name: page!.title || page!.slug, category }),
      });
    }

    let res = await tryCreate(page.slug);
    if (res.status === 409) {
      res = await tryCreate(`${page.slug}-board`);
    }
    const data = await res.json();
    if (!res.ok) {
      setCreatingBoard(false);
      setCreateBoardError(data.error ?? "게시판 생성에 실패했어요.");
      return;
    }

    const { error: moduleError } = await supabase.from("page_modules").insert({
      page_id: page.id,
      module_type: "board",
      board_id: data.id,
      settings: WIDGET_DEFAULT_SETTINGS.board ?? {},
      sort_order: modules.length,
      is_hidden: false,
    });
    setCreatingBoard(false);
    if (moduleError) {
      setCreateBoardError(moduleError.message);
      return;
    }
    router.push(`/admin/boards/${data.id}`);
  }

  // EPIC-089(요구사항 5): 지금까지 위젯 편집기의 "게시판 수정" 링크를 타고
  // /admin/boards/[id]로 나가야만 Board Type(render_type)을 바꿀 수 있었다
  // — 여기서 바로 바꿀 수 있게 PATCH /api/admin/boards/[id](이미
  // render_type을 EDITABLE_FIELDS로 받고 있음, 새 라우트 불필요)를 호출하고
  // 로컬 boards 상태만 갱신한다.
  async function handleBoardRenderTypeChange(boardId: string, renderType: string) {
    const res = await fetch(`/api/admin/boards/${boardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ render_type: renderType || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Board Type 변경에 실패했어요.");
      return;
    }
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, render_type: renderType || null } : b)));
  }

  // HOTFIX-090: 위젯의 "게시판 선택"(Miller Columns) 영역 바로 아래에서
  // 즉석으로 새 게시판을 만든다 — handleCreateEmptyBoard(위, 페이지 전체에
  // board 위젯이 하나도 없을 때만 쓰는 진입점)와 달리 이건 "이미 board
  // 위젯은 있는데 아직 게시판을 안 골랐거나, 기존 목록에 없는 새 게시판을
  // 원할 때" 언제든 누를 수 있어야 한다(요구사항 원문). 임시 제목/슬러그로
  // 즉시 생성 → 지금 편집 중인 이 위젯에 바로 연결(page_modules.board_id
  // 직접 update, draft 저장을 기다리지 않음) → 요구사항대로 게시판 수정
  // 화면(/admin/boards/[id])으로 바로 이동.
  async function handleAddNewBoardForModule(moduleId: string) {
    if (!session) return;
    setAddingBoardModuleId(moduleId);
    setCreateBoardError(null);

    const tempCategory = `new-board-${crypto.randomUUID().slice(0, 8)}`;
    const res = await fetch("/api/admin/boards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name: "새 게시판", category: tempCategory }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddingBoardModuleId(null);
      setCreateBoardError(data.error ?? "게시판 생성에 실패했어요.");
      return;
    }

    const { error: linkError } = await supabase
      .from("page_modules")
      .update({ board_id: data.id })
      .eq("id", moduleId);

    setAddingBoardModuleId(null);
    if (linkError) {
      setCreateBoardError(linkError.message);
      return;
    }

    router.push(`/admin/boards/${data.id}`);
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("이 위젯을 삭제할까요?")) return;
    const { error: deleteError } = await supabase.from("page_modules").delete().eq("id", moduleId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === moduleId) closeEditor();
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  async function handleDuplicate(module: PageModuleRow) {
    if (!page) return;
    const insertAt = module.sort_order + 1;
    // 뒤 항목들의 sort_order를 한 칸씩 밀어 복제본이 원본 바로 다음에 오게
    // 한다(드래그 재정렬과 동일한 방식으로 즉시 DB에 반영).
    const shifted = modules.filter((m) => m.sort_order >= insertAt);
    await Promise.all(
      shifted.map((m) =>
        supabase.from("page_modules").update({ sort_order: m.sort_order + 1 }).eq("id", m.id),
      ),
    );
    const { data: inserted, error: insertError } = await supabase
      .from("page_modules")
      .insert({
        page_id: page.id,
        module_type: module.module_type,
        board_id: module.board_id,
        settings: module.settings,
        sort_order: insertAt,
        is_hidden: module.is_hidden,
      })
      .select()
      .single();
    if (insertError || !inserted) {
      setError(insertError?.message ?? "위젯을 복제하지 못했어요.");
      return;
    }
    await load();
  }

  async function handleToggleHidden(module: PageModuleRow) {
    const { error: updateError } = await supabase
      .from("page_modules")
      .update({ is_hidden: !module.is_hidden })
      .eq("id", module.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setModules((prev) =>
      prev.map((m) => (m.id === module.id ? { ...m, is_hidden: !m.is_hidden } : m)),
    );
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(modules, oldIndex, newIndex);
    setModules(reordered);

    const updates = reordered.map((m, i) => ({ id: m.id, sort_order: i }));
    await Promise.all(
      updates.map((u) =>
        supabase.from("page_modules").update({ sort_order: u.sort_order }).eq("id", u.id),
      ),
    );
  }

  function openEditor(module: PageModuleRow) {
    setEditingId(module.id);
    setDraftBoardId(module.board_id ?? "");
    setDraftSettings(module.settings);
    setDevJsonText(JSON.stringify(module.settings, null, 2));
    setDevJsonError(null);
  }

  function closeEditor() {
    setEditingId(null);
    setDraftBoardId("");
    setDraftSettings({});
    setDevJsonError(null);
  }

  function handleDraftSettingsChange(next: Record<string, unknown>) {
    setDraftSettings(next);
    setDevJsonText(JSON.stringify(next, null, 2));
  }

  function handleApplyDevJson() {
    try {
      const parsed = devJsonText.trim() ? JSON.parse(devJsonText) : {};
      setDraftSettings(parsed);
      setDevJsonError(null);
    } catch {
      setDevJsonError("올바른 JSON이 아니에요.");
    }
  }

  async function handleSaveDraft(moduleId: string) {
    const needsBoard = BOARD_LINKED_MODULE_TYPES.includes(
      modules.find((m) => m.id === moduleId)?.module_type as PageModuleType,
    );
    setDraftSaving(true);
    const { error: updateError } = await supabase
      .from("page_modules")
      .update({
        board_id: needsBoard ? draftBoardId || null : modules.find((m) => m.id === moduleId)?.board_id ?? null,
        settings: draftSettings,
      })
      .eq("id", moduleId);
    setDraftSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, board_id: needsBoard ? draftBoardId || null : m.board_id, settings: draftSettings }
          : m,
      ),
    );
    closeEditor();
  }

  if (fetching) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full">
        <p className="text-red-600 text-sm">{error ?? "페이지를 찾을 수 없어요."}</p>
      </main>
    );
  }

  // Live Preview: modules 배열에서 지금 편집 중인 위젯 자리만 draft로
  // 치환해서 그린다 — 실제 저장 없이도 설정 변경이 즉시 화면에 반영된다.
  const previewModules = modules.map((m) =>
    m.id === editingId ? { ...m, board_id: draftBoardId || null, settings: draftSettings } : m,
  );

  return (
    <main className="flex-1 px-4 sm:px-8 pb-8 w-full">
      <div className="flex items-center justify-between max-w-6xl mx-auto mb-4">
        <button
          type="button"
          onClick={() => router.push("/admin/site-structure")}
          className="text-sm text-gray-500 hover:underline"
        >
          ← 사이트 구성 관리로
        </button>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={devMode}
            onChange={(e) => setDevMode(e.target.checked)}
            className="rounded border-gray-300"
          />
          개발자 모드(원시 JSON)
        </label>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 좌측: 페이지 정보 + 위젯 목록/편집 */}
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">/{page.slug}</h1>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    page.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {page.status === "published" ? "공개" : "비공개"}
                </span>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                >
                  {page.status === "published" ? "비공개로 전환" : "공개로 전환"}
                </button>
              </div>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명"
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                최소 열람 등급
              </label>
              <select
                value={minRankToRead ?? ""}
                onChange={(e) => setMinRankToRead(e.target.value === "" ? null : Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">(제한 없음)</option>
                {RANK_OPTIONS.map((o) => (
                  <option key={o.rank} value={o.rank}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                지정하면 미달 등급 방문자는 멤버십 안내 페이지로 이동해요.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSavePage}
              disabled={saving}
              className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "저장 중..." : "페이지 정보 저장"}
            </button>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">위젯 ({modules.length})</h2>
              <div className="flex items-center gap-2">
                {/* EPIC-088: 이 페이지에 board 위젯이 하나도 없을 때만 노출 —
                    이미 board 위젯이 있으면(연결 여부와 무관하게) 그 위젯의
                    "게시판 선택"에서 고르거나 위 게시판 수정 버튼을 쓰면 된다. */}
                {!modules.some((m) => m.module_type === "board") && (
                  <button
                    type="button"
                    onClick={handleCreateEmptyBoard}
                    disabled={creatingBoard}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {creatingBoard ? "만드는 중..." : "게시판 추가"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm hover:bg-gray-700"
                >
                  + 위젯 추가
                </button>
              </div>
            </div>
            {createBoardError && <p className="text-xs text-red-600">{createBoardError}</p>}

            {modules.length === 0 ? (
              <p className="text-gray-400 text-sm">아직 위젯이 없어요. “+ 위젯 추가”로 시작하세요.</p>
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {modules.map((module) => (
                      <WidgetRow
                        key={module.id}
                        module={module}
                        boards={boards}
                        navBranches={navBranches}
                        boardBranchMap={boardBranchMap}
                        editing={editingId === module.id}
                        devMode={devMode}
                        draftBoardId={draftBoardId}
                        draftSettings={draftSettings}
                        draftSaving={draftSaving}
                        devJsonText={devJsonText}
                        devJsonError={devJsonError}
                        onOpenEditor={() => (editingId === module.id ? closeEditor() : openEditor(module))}
                        onDraftBoardIdChange={setDraftBoardId}
                        onDraftSettingsChange={handleDraftSettingsChange}
                        onDevJsonTextChange={setDevJsonText}
                        onApplyDevJson={handleApplyDevJson}
                        onSaveDraft={() => handleSaveDraft(module.id)}
                        onCancelDraft={closeEditor}
                        onDuplicate={() => handleDuplicate(module)}
                        onToggleHidden={() => handleToggleHidden(module)}
                        onDelete={() => handleDeleteModule(module.id)}
                        onBoardRenderTypeChange={handleBoardRenderTypeChange}
                        onAddNewBoard={() => handleAddNewBoardForModule(module.id)}
                        addingBoard={addingBoardModuleId === module.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </div>

        {/* 우측: Live Preview — 설정을 바꾸면 새로고침 없이 즉시 반영 */}
        <div className="lg:sticky lg:top-4">
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
              미리보기 (숨긴 위젯도 흐리게 표시됨 — 공개 페이지에는 안 보임)
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-6 bg-white">
              <PageBuilderRenderer modules={previewModules} includeHidden />
            </div>
          </div>
        </div>
      </div>

      {paletteOpen && (
        <WidgetPalette onSelect={handleSelectWidget} onClose={() => setPaletteOpen(false)} />
      )}
    </main>
  );
}

function WidgetRow({
  module,
  boards,
  navBranches,
  boardBranchMap,
  editing,
  devMode,
  draftBoardId,
  draftSettings,
  draftSaving,
  devJsonText,
  devJsonError,
  onOpenEditor,
  onDraftBoardIdChange,
  onDraftSettingsChange,
  onDevJsonTextChange,
  onApplyDevJson,
  onSaveDraft,
  onCancelDraft,
  onDuplicate,
  onToggleHidden,
  onDelete,
  onBoardRenderTypeChange,
  onAddNewBoard,
  addingBoard,
}: {
  module: PageModuleRow;
  boards: BoardOption[];
  navBranches: NavBranchNode[];
  boardBranchMap: Map<string, string>;
  editing: boolean;
  devMode: boolean;
  draftBoardId: string;
  draftSettings: Record<string, unknown>;
  draftSaving: boolean;
  devJsonText: string;
  devJsonError: string | null;
  onOpenEditor: () => void;
  onDraftBoardIdChange: (id: string) => void;
  onDraftSettingsChange: (next: Record<string, unknown>) => void;
  onDevJsonTextChange: (text: string) => void;
  onApplyDevJson: () => void;
  onSaveDraft: () => void;
  onCancelDraft: () => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  onBoardRenderTypeChange: (boardId: string, renderType: string) => void;
  onAddNewBoard: () => void;
  addingBoard: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const type = module.module_type as PageModuleType;
  const needsBoard = BOARD_LINKED_MODULE_TYPES.includes(type);
  const fields = WIDGET_FIELDS[type] ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-3 ${module.is_hidden ? "border-gray-200 bg-gray-50" : "border-gray-200"}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="드래그해서 순서 변경"
          className="cursor-grab text-gray-400 px-1 select-none touch-none"
        >
          ⠿
        </button>
        <span aria-hidden="true">{PAGE_MODULE_ICONS[type] ?? "🧩"}</span>
        <span className="text-sm font-medium">{PAGE_MODULE_LABELS[type] ?? type}</span>
        {module.is_hidden && (
          <span className="text-xs text-amber-600">숨김</span>
        )}
        {needsBoard && (
          <span className="text-xs text-gray-400">
            {boards.find((b) => b.id === module.board_id)?.name ?? "게시판 미연결"}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={onOpenEditor}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            {editing ? "닫기" : "설정"}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            복제
          </button>
          <button
            type="button"
            onClick={onToggleHidden}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            {module.is_hidden ? "보이기" : "숨기기"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          {needsBoard && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600">게시판 선택</label>
                <div className="flex items-center gap-2">
                  {/* EPIC-088: 위젯이 가리키는 게시판을 바로 옆에서 열어 설정을
                      고칠 수 있게 — CategoryTreeManager.tsx의 BoardCard "수정"
                      버튼과 동일한 목적지(/admin/boards/[id])를 새 탭으로 연다. */}
                  {draftBoardId && (
                    <a
                      href={`/admin/boards/${draftBoardId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      게시판 수정
                    </a>
                  )}
                  {draftBoardId && (
                    <button
                      type="button"
                      onClick={() => onDraftBoardIdChange("")}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      연결 해제
                    </button>
                  )}
                </div>
              </div>
              <CategoryBoardPicker
                branches={navBranches}
                boardBranchMap={boardBranchMap}
                boards={boards}
                value={draftBoardId}
                onChange={onDraftBoardIdChange}
              />
              {/* HOTFIX-090: 3열 게시판 선택 영역 바로 아래 — 목록에서 고를
                  게시판이 아직 없거나(연동된 게시판이 없는 경우) 새로
                  만들고 싶을 때 언제든 누를 수 있다. 기존 목록 위(페이지
                  전체에 board 위젯이 하나도 없을 때만 뜨는 "게시판 추가"
                  버튼)와 달리 이건 위젯 하나하나의 설정 안에 항상 떠 있다. */}
              <button
                type="button"
                onClick={onAddNewBoard}
                disabled={addingBoard}
                className="mt-2 w-full rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50"
              >
                {addingBoard ? "새 게시판 만드는 중..." : "+ 새 게시판 추가"}
              </button>
              {/* EPIC-089(요구사항 5): 게시판 수정 화면으로 나가지 않고
                  Board Type(render_type)을 바로 바꿀 수 있게 — 선택된 값은
                  변경 즉시 저장(다른 필드처럼 "저장" 버튼을 기다리지 않음,
                  게시판 수정 화면 자체가 원래 그런 즉시-저장 화면이 아니라
                  이 위젯 draft와는 별개 리소스라서 이 필드만 독립적으로
                  즉시 반영하는 게 자연스럽다). */}
              {draftBoardId && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Board Type</label>
                  <select
                    value={boards.find((b) => b.id === draftBoardId)?.render_type ?? ""}
                    onChange={(e) => onBoardRenderTypeChange(draftBoardId, e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">(기본값)</option>
                    {RENDER_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <WidgetInspectorForm fields={fields} settings={draftSettings} onChange={onDraftSettingsChange} />

          {devMode && (
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 p-2">
              <label className="block text-xs font-medium text-amber-700 mb-1">
                개발자 모드 — 원시 JSON (일반 운영자는 사용하지 않음)
              </label>
              <textarea
                value={devJsonText}
                onChange={(e) => onDevJsonTextChange(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-amber-300 px-2 py-1.5 text-xs font-mono"
              />
              {devJsonError && <p className="text-xs text-red-600 mt-1">{devJsonError}</p>}
              <button
                type="button"
                onClick={onApplyDevJson}
                className="mt-1.5 rounded-md border border-amber-400 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
              >
                JSON 적용(위 폼에 반영)
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={draftSaving}
              className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {draftSaving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={onCancelDraft}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
