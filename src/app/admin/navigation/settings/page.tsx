"use client";

// EPIC-137(사용자 지시 — "4개로 구분하지마 홈페이지를. 한개의 홈페이지를
// 실시간으로 설정하는거야. 한개의 preview를 가지고, 각 블록마다 Elements,
// Control 탭이 다르게 나오는거라구."): EPIC-136까지도 "홈페이지 헤더 디자인/
// 슬라이드쇼/사이드바 아이콘/하단 메뉴 관리" 4개 섹션을 상단 버튼으로
// 전환하는 방식이었다 — 사용자가 이걸 "또다시 4개의 화면"이라고 재차
// 거부하고, BuilderJS 레퍼런스 그대로 (1) 화면 전환 없이 실제 페이지 전체를
// 위에서 아래로 이어 보여주는 캔버스 하나, (2) 왼쪽에 Elements/Controls/
// Page/Themes 4개 탭 패널을 명시적으로 요구했다. 이번 구현:
// - 캔버스: Navbar(헤더, 이미 EPIC-136에서 실제 컴포넌트+자유 드래그로 전환
//   완료) → 슬라이드쇼(실제 HeroSlideshow, 신규 클릭 선택) → 사이드바 아이콘
//   미리보기(실제 좌/우 아이콘은 화면 가장자리 fixed 트리거라 인라인에
//   그대로 넣을 수 없어, 실제 이미지를 쓰는 대표 미리보기 칩으로 대체 —
//   클릭하면 동일하게 설정 가능) → 하단 메뉴(Footer, 기존 CraftFooterEditor
//   전체화면 대신 같은 Editor를 이 캔버스 안에 인라인으로 얹음) 순서로 전부
//   한 화면에 이어 붙인다.
// - 왼쪽 패널: Elements(페이지 요소 목록 클릭 이동 + 하단 메뉴에 새 블록
//   추가하는 기존 Toolbox 기능) / Controls(선택된 요소의 실제 설정 —
//   이미지 필드마다 실제 썸네일 미리보기 포함) / Page(페이지 단위 안내) /
//   Themes(호버 모션을 탭+계정 메뉴 전체에 일괄 적용) 4탭.
// - 저장: 기존 site_settings 6개 키 + 하단 메뉴 craft_state까지 "저장하기"
//   버튼 하나로 함께 저장한다(craft_state는 Editor 컨텍스트 밖에서 접근할
//   수 없어 CraftBridge가 query/actions를 ref로 끌어올린다).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Editor, Frame, useEditor } from "@craftjs/core";
import { supabase } from "@/lib/supabaseClient";
import { primaryButtonClass } from "../shared";
import { Navbar } from "@/components/Navbar";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { SelectionOverlay } from "@/components/SelectionOverlay";
import { uploadImage, compressImage } from "@/lib/adminImageUpload";
import { fetchNavTabs, type NavTab, type DbTargetType } from "@/lib/navConfig";
import { ensurePageForSlug, hrefToSlug } from "@/lib/pageTemplates";
import { PRIMITIVE_RESOLVER, PRIMITIVE_BLOCK_OPTIONS } from "@/components/craft/primitives";
import type { CraftBlockOption } from "@/components/craft/shared/types";
import { craftFooterResolver } from "@/components/craft/footer/resolver";
import { footerDefaultTree, footerBlockOptions } from "@/components/craft/footer/defaultTree";
import {
  normalizeMainLogo,
  defaultMainLogoValue,
  DEFAULT_LOGO_HEIGHT_PX,
  DEFAULT_LOGO_TEXT_COLOR,
  type MainLogoValue,
  type CustomFontEntry,
} from "@/lib/mainLogoSettings";
import {
  normalizeSidebarIcons,
  defaultSidebarIconsValue,
  DEFAULT_ICON_SIZE_PX,
  type SidebarIconsValue,
} from "@/lib/sidebarIconsSettings";
import {
  normalizeTopTabStyle,
  defaultTopTabStyleValue,
  defaultTopTabStyleEntry,
  type TopTabStyleValue,
  type TopTabStyleEntry,
} from "@/lib/topTabStyleSettings";
import {
  normalizeAccountMenuStyle,
  defaultAccountMenuStyleValue,
  type AccountMenuStyleValue,
} from "@/lib/accountMenuStyleSettings";
import {
  normalizeHeroSlideshow,
  defaultHeroSlideshowValue,
  type HeroSlideshowValue,
  type SlideItem,
} from "@/lib/heroSlideshow";
import {
  normalizeHeaderPositions,
  defaultHeaderPositionsValue,
  type HeaderPositionsValue,
  type HeaderSlotOffset,
} from "@/lib/headerLayoutPositions";
import {
  normalizeTopSidebar,
  defaultTopSidebarValue,
  type TopSidebarValue,
  type TopSidebarConfig,
  type TopSidebarLink,
  type TopSidebarChildLink,
} from "@/lib/topSidebarSettings";
import { TAB_HOVER_MOTIONS, TAB_HOVER_MOTION_LABELS, DEFAULT_TAB_HOVER_MOTION } from "@/lib/tabHoverMotion";

// HOTFIX-137.4(사용자 지시 — "여백 배경 이미지 갯수를 10개가 아닌 100개로"): 10 → 100.
const MAX_WALLPAPERS = 100;

// HOTFIX-137.5(사용자 지시 — "각 요소마다 '드롭다운'이 되게 하는걸
// 선택할수 있는 기능을 만들고"): EPIC-138이 "사이트 구성 관리 > 사이트
// 메뉴"에 만든 것과 동일한 라벨 — 여기서도 바로 편집할 수 있게(다른
// 화면으로 안내만 하던 것 대신) 탭 Controls 패널에 동일한 체크박스를
// 노출한다.
const TAB_TARGET_TYPE_LABELS: Record<DbTargetType, string> = {
  tier1_tab: "1단 상단탭",
  tier2_tab: "2단 상단탭",
  dropdown: "드롭다운",
  sidebar_left: "왼쪽 사이드바",
  sidebar_right: "오른쪽 사이드바",
  user_menu: "사용자 메뉴",
};

async function upsertSetting(key: string, value: unknown) {
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
}

type Selection = { kind: "slot"; key: string } | { kind: "craft" } | null;
type LeftTab = "elements" | "controls" | "page" | "themes";

// ── 캔버스 안에서 클릭으로만 선택되는 요소(슬라이드쇼/사이드바 아이콘) —
// 자유 드래그는 안 준다(줄 전체를 차지하는 블록이라 "옆으로 옮기기"가
// 의미가 없음, 순서는 실제 페이지 순서 그대로 고정).
function ClickSelectSlot({
  slotKey,
  label,
  selected,
  onSelect,
  className,
  children,
}: {
  slotKey: string;
  label: string;
  selected: boolean;
  onSelect: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative cursor-pointer ${className ?? ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(slotKey);
      }}
    >
      {children}
      <SelectionOverlay selected={selected} hovered={false} label={label} />
    </div>
  );
}

// ── Editor 컨텍스트(craft.js)는 React context라 이 컴포넌트 트리 밖에 있는
// "저장하기" 버튼에서 query.serialize()를 직접 부를 수 없다 — Editor 안에
// 항상 마운트돼 있는 이 브리지가 query/actions를 ref로 끌어올리고, 하단
// 메뉴(Footer) 블록이 새로 선택될 때마다 상위 selection 상태도 갱신한다.
function CraftBridge({
  bridgeRef,
  onCraftSelect,
}: {
  bridgeRef: React.MutableRefObject<{
    query: ReturnType<typeof useEditor>["query"];
    actions: ReturnType<typeof useEditor>["actions"];
  } | null>;
  onCraftSelect: () => void;
}) {
  const { query, actions, selectedId } = useEditor((state) => ({
    selectedId: ([...state.events.selected][0] as string | undefined) ?? null,
  }));
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    bridgeRef.current = { query, actions };
  }, [query, actions, bridgeRef]);
  useEffect(() => {
    if (selectedId && selectedId !== "ROOT" && selectedId !== prevRef.current) {
      prevRef.current = selectedId;
      onCraftSelect();
    }
    if (!selectedId) prevRef.current = null;
  }, [selectedId, onCraftSelect]);
  // HOTFIX-137.7(사용자 지시 — BuilderJS 레퍼런스 "Every action undoable.
  // ⌘Z saves the day"): Craft.js는 undo/redo가 이미 내장돼 있다
  // (actions.history.undo/redo) — 키보드 단축키만 새로 연결한다. 입력
  // 필드(텍스트/textarea/contentEditable) 안에서는 가로채지 않고 그
  // 필드의 네이티브 undo가 정상 동작하도록 비워둔다.
  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) actions.history.redo();
      else actions.history.undo();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
  return null;
}

// ── Elements 탭의 "하단 메뉴에 새 블록 추가" — 기존 Toolbox.tsx와 동일한
// connectors.create() 드래그 소스 패턴이지만, w-60 aside 없이 이 패널
// 안에 바로 넣을 수 있도록 얇게 다시 구현했다.
function FooterElementButton({ option, onAdd }: { option: CraftBlockOption; onAdd: (option: CraftBlockOption) => void }) {
  const { connectors } = useEditor();
  return (
    <button
      type="button"
      ref={(ref) => {
        if (ref) connectors.create(ref, option.buildElement);
      }}
      onClick={() => onAdd(option)}
      title="드래그해서 캔버스에 놓거나, 클릭하면 맨 끝에 추가돼요"
      className="w-full cursor-grab rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-xs text-gray-700 hover:border-gray-400 hover:bg-gray-50 active:cursor-grabbing"
    >
      {option.label}
    </button>
  );
}
function FooterElementsSection() {
  const { query, actions } = useEditor();
  function handleAdd(option: CraftBlockOption) {
    const tree = query.parseReactElement(option.buildElement()).toNodeTree();
    actions.addNodeTree(tree, "ROOT");
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">섹션</p>
        <div className="space-y-1">
          {footerBlockOptions.map((o) => (
            <FooterElementButton key={o.label} option={o} onAdd={handleAdd} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">요소</p>
        <div className="space-y-1">
          {PRIMITIVE_BLOCK_OPTIONS.map((o) => (
            <FooterElementButton key={o.label} option={o} onAdd={handleAdd} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 하단 메뉴(Footer) 블록의 선택-인식 액션 바 — HOTFIX-137.6(사용자
// 지시 — "요소를 클릭하면 왜 움직이는것만 되고, 그걸 수정하거나
// 삭제하는게 없어?"): "수정"은 아래 <selected.Settings />가 이미
// 담당하지만 "삭제"가 없었다 — Craft.js의 actions.delete/move(둘 다
// 문서화된 안전한 단일 노드 API)로 삭제+같은 부모 안 순서 이동(위/아래)을
// 추가한다. "복제"는 Craft.js 내부 addNodeTree가 전달된 트리의 노드
// id를 그대로 재사용해 state.nodes를 덮어써(라이브 코드 리버스엔지니어링으로
// 확인) 기존 노드와 충돌할 위험이 있어 — id를 직접 재생성하는 우회가
// 필요한데, 이 세션은 Browser pane으로 실제 검증이 안 되는 상태라
// 실사용 중인 하단 메뉴(모든 페이지에 노출)를 망가뜨릴 위험을 감수하지
// 않고 이번 범위에서 뺐다(NEXT_TASK.md에 후속 항목으로 기록).
function FooterCraftControls() {
  const { selected, actions, query } = useEditor((state) => {
    const currentNodeId = [...state.events.selected][0];
    if (!currentNodeId || !state.nodes[currentNodeId]) return { selected: null };
    const node = state.nodes[currentNodeId];
    const parentId = node.data.parent;
    const siblings = parentId ? state.nodes[parentId]?.data.nodes ?? [] : [];
    const index = siblings.indexOf(currentNodeId);
    return {
      selected: {
        id: currentNodeId,
        name: node.data.displayName || node.data.name,
        Settings: (node.related?.settings as React.ComponentType<Record<string, never>> | undefined) ?? null,
        isRoot: currentNodeId === "ROOT",
        isDeletable: node.data.parent !== null && currentNodeId !== "ROOT",
        parentId,
        canMoveUp: index > 0,
        canMoveDown: index >= 0 && index < siblings.length - 1,
      },
    };
  });
  if (!selected) return <p className="text-xs text-gray-400">하단 메뉴에서 블록을 클릭하면 설정이 여기 표시됩니다.</p>;

  function moveBy(offset: 1 | -1) {
    if (!selected || !selected.parentId) return;
    const siblings = query.node(selected.parentId).get().data.nodes;
    const index = siblings.indexOf(selected.id);
    if (index < 0) return;
    actions.move(selected.id, selected.parentId, index + offset);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{selected.name} 설정</h3>
        {!selected.isRoot && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="위로 이동"
              disabled={!selected.canMoveUp}
              onClick={() => moveBy(-1)}
              className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              title="아래로 이동"
              disabled={!selected.canMoveDown}
              onClick={() => moveBy(1)}
              className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ↓
            </button>
            {selected.isDeletable && (
              <button
                type="button"
                title="삭제"
                onClick={() => {
                  if (confirm("이 블록을 삭제할까요?")) actions.delete(selected.id);
                }}
                className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            )}
          </div>
        )}
      </div>
      {selected.Settings ? (
        <selected.Settings />
      ) : (
        <p className="text-xs text-gray-400">
          {selected.isRoot ? "루트 캔버스에는 설정이 없어요." : "이 블록은 별도 설정이 없어요 — 더블클릭으로 텍스트/이미지를 바로 수정하세요."}
        </p>
      )}
    </div>
  );
}

function ImageThumb({ url, alt }: { url: string; alt: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="mt-1 h-14 w-14 rounded border border-gray-200 object-cover" />;
}

export default function AdminNavigationSettingsPage() {
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [deviceTab, setDeviceTab] = useState<"pc" | "mobile">("pc");
  const [selection, setSelection] = useState<Selection>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("controls");
  const craftBridgeRef = useRef<{
    query: ReturnType<typeof useEditor>["query"];
    actions: ReturnType<typeof useEditor>["actions"];
  } | null>(null);

  function selectSlot(key: string) {
    setSelection({ kind: "slot", key });
    setLeftTab("controls");
  }
  function handleCraftSelect() {
    setSelection({ kind: "craft" });
    setLeftTab("controls");
  }

  const [mainLogoValue, setMainLogoValue] = useState<MainLogoValue>(() => defaultMainLogoValue());
  const [sidebarIconsValue, setSidebarIconsValue] = useState<SidebarIconsValue>(() => defaultSidebarIconsValue());
  const [topTabStyleValue, setTopTabStyleValue] = useState<TopTabStyleValue>(() => defaultTopTabStyleValue());
  const [accountMenuStyleValue, setAccountMenuStyleValue] = useState<AccountMenuStyleValue>(() => defaultAccountMenuStyleValue());
  const [heroSlideshowValue, setHeroSlideshowValue] = useState<HeroSlideshowValue>(() => defaultHeroSlideshowValue());
  const [headerPositionsValue, setHeaderPositionsValue] = useState<HeaderPositionsValue>(() => defaultHeaderPositionsValue());
  const [topSidebarValue, setTopSidebarValue] = useState<TopSidebarValue>(() => defaultTopSidebarValue());
  const [topNavRows, setTopNavRows] = useState<NavTab[]>([]);

  const [footerPageId, setFooterPageId] = useState<string | null>(null);
  const [footerCraftState, setFooterCraftState] = useState<string | null>(null);

  const sidebarIcons = sidebarIconsValue[deviceTab];
  const heroSlideshow = heroSlideshowValue[deviceTab];
  const headerPositions = headerPositionsValue[deviceTab];
  const topSidebar = topSidebarValue[deviceTab];

  useEffect(() => {
    async function load() {
      const [{ data, error: fetchError }, { tabs: navTabs }, footerRow] = await Promise.all([
        supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["main_logo", "hero_slideshow", "sidebar_icons", "top_tab_style", "account_menu_style", "header_positions", "top_sidebar"]),
        fetchNavTabs(),
        supabase.from("page_builder").select("id, craft_state").eq("slug", "footer").maybeSingle(),
      ]);
      if (fetchError) {
        setError(fetchError.message);
        setFetching(false);
        return;
      }
      for (const row of data ?? []) {
        if (row.setting_key === "main_logo") setMainLogoValue(normalizeMainLogo(row.setting_value));
        else if (row.setting_key === "hero_slideshow") setHeroSlideshowValue(normalizeHeroSlideshow(row.setting_value));
        else if (row.setting_key === "sidebar_icons") setSidebarIconsValue(normalizeSidebarIcons(row.setting_value));
        else if (row.setting_key === "top_tab_style") setTopTabStyleValue(normalizeTopTabStyle(row.setting_value));
        else if (row.setting_key === "account_menu_style") setAccountMenuStyleValue(normalizeAccountMenuStyle(row.setting_value));
        else if (row.setting_key === "header_positions") setHeaderPositionsValue(normalizeHeaderPositions(row.setting_value));
        else if (row.setting_key === "top_sidebar") setTopSidebarValue(normalizeTopSidebar(row.setting_value));
      }
      setTopNavRows(navTabs.filter((t) => t.type !== "sidebar-left" && t.type !== "sidebar-right"));
      if (footerRow.data) {
        setFooterPageId(footerRow.data.id);
        setFooterCraftState(footerRow.data.craft_state ?? null);
      } else {
        const { data: created } = await supabase
          .from("page_builder")
          .insert({ slug: "footer", title: "하단 Footer", status: "published", builder_type: "craft" })
          .select("id, craft_state")
          .single();
        if (created) {
          setFooterPageId(created.id);
          setFooterCraftState(created.craft_state ?? null);
        }
      }
      setFetching(false);
    }
    load();
  }, []);

  // HOTFIX-137.8(사용자 지시 — "상단 탭, 사용자 메뉴에 새로운 요소를
  // 추가하거나, 복제하거나, 삭제하는걸 할수 없는데?"): "사용자 메뉴"는
  // EPIC-138부터 별도 데이터가 아니라 site_navigations 최상위 행의
  // target_types에 "user_menu" 플래그 하나 붙는 것뿐이다(UserMenuDropdown.tsx
  // 참고) — 즉 "상단 탭 추가"와 "사용자 메뉴 항목 추가"는 같은 테이블에 대한
  // 같은 CRUD고, 노출 위치(어느 탭 줄/사이드바/사용자 메뉴에 보일지)는 이미
  // 있는 "노출 위치" 체크박스로 정하면 된다 — 그래서 추가/복제/삭제도 하나의
  // 공용 함수 세트로 처리한다. CategoryTreeManager.tsx(사이트 구성 관리)의
  // addChild/deleteRow와 동일한 컬럼/기본값을 그대로 재사용해 두 화면의
  // 데이터가 어긋나지 않게 한다.
  async function refetchNavTabs() {
    const { tabs } = await fetchNavTabs();
    setTopNavRows(tabs.filter((t) => t.type !== "sidebar-left" && t.type !== "sidebar-right"));
  }

  async function addNavItem() {
    const siblingCount = topNavRows.length;
    const { data: inserted, error: insertError } = await supabase
      .from("site_navigations")
      .insert({ parent_id: null, title: "새 탭", target_types: ["tier2_tab"], sort_order: siblingCount })
      .select("id")
      .single();
    if (insertError || !inserted) {
      alert(`탭 생성에 실패했어요.\n${insertError?.message ?? "알 수 없는 오류"}`);
      return;
    }
    const autoHref = `/c/${inserted.id}`;
    const { error: hrefError } = await supabase.from("site_navigations").update({ href: autoHref }).eq("id", inserted.id);
    if (!hrefError) {
      ensurePageForSlug(hrefToSlug(autoHref), "새 탭", null).catch(() => {});
    }
    await refetchNavTabs();
    selectSlot(`tab:${inserted.id}`);
  }

  async function duplicateNavItem(tab: NavTab) {
    if (!tab.id) return;
    const siblingCount = topNavRows.length;
    const { data: inserted, error: insertError } = await supabase
      .from("site_navigations")
      .insert({
        parent_id: null,
        title: `${tab.label} 복사본`,
        href: tab.href ?? null,
        target_types: tab.targetTypes ?? ["tier2_tab"],
        sort_order: siblingCount,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      alert(`탭 복제에 실패했어요.\n${insertError?.message ?? "알 수 없는 오류"}`);
      return;
    }
    // 스타일(글자 크기/색상/굵기/호버 모션 등)도 함께 복제 — 원본 탭 키의
    // 설정을 새 탭 키로 그대로 복사한다(양쪽 기기 모두).
    setTopTabStyleValue((prev) => {
      const next = { ...prev };
      for (const device of ["pc", "mobile"] as const) {
        const sourceEntry = prev[device].tabs[tab.key];
        if (sourceEntry) {
          next[device] = { ...next[device], tabs: { ...next[device].tabs, [inserted.id]: { ...sourceEntry } } };
        }
      }
      return next;
    });
    await refetchNavTabs();
    selectSlot(`tab:${inserted.id}`);
  }

  async function deleteNavItem(tab: NavTab) {
    if (!tab.id) return;
    if (!confirm(`"${tab.label}"을(를) 삭제할까요? 이 탭에 속한 하위 항목도 함께 삭제돼요.`)) return;
    const { error: deleteError } = await supabase.from("site_navigations").delete().eq("id", tab.id);
    if (deleteError) {
      alert(`삭제에 실패했어요.\n${deleteError.message}`);
      return;
    }
    setSelection(null);
    await refetchNavTabs();
  }

  function handleOffsetChange(slotKey: string, next: HeaderSlotOffset) {
    setHeaderPositionsValue((prev) => ({
      ...prev,
      [deviceTab]: { slots: { ...prev[deviceTab].slots, [slotKey]: next } },
    }));
  }
  function resetSlotOffset(slotKey: string) {
    setHeaderPositionsValue((prev) => {
      const nextSlots = { ...prev[deviceTab].slots };
      delete nextSlots[slotKey];
      return { ...prev, [deviceTab]: { slots: nextSlots } };
    });
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    const footerSerialized = craftBridgeRef.current?.query.serialize();
    const results = await Promise.all([
      upsertSetting("main_logo", mainLogoValue),
      upsertSetting("sidebar_icons", sidebarIconsValue),
      upsertSetting("top_tab_style", topTabStyleValue),
      upsertSetting("account_menu_style", accountMenuStyleValue),
      upsertSetting("hero_slideshow", heroSlideshowValue),
      upsertSetting("header_positions", headerPositionsValue),
      upsertSetting("top_sidebar", topSidebarValue),
      upsertSetting("unified_header_layout", { pc: { items: [] }, mobile: { items: [] } }),
      footerPageId && footerSerialized
        ? supabase.from("page_builder").update({ craft_state: footerSerialized, updated_at: new Date().toISOString() }).eq("id", footerPageId)
        : Promise.resolve({ error: null }),
    ]);
    const firstError = results.find((r) => r.error)?.error;
    setSaving(false);
    if (firstError) {
      setError(firstError.message);
      return;
    }
    if (footerSerialized) setFooterCraftState(footerSerialized);
    setSavedAt(Date.now());
  }

  if (fetching || !footerPageId) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-[1600px] mx-auto w-full">
      {error && <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-4">{error}</div>}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">홈페이지 설정 관리</h1>
          <p className="text-xs text-gray-400">실제 홈페이지를 그대로 — 요소를 클릭해서 선택, 드래그해서 이동하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-gray-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDeviceTab("pc")}
              className={`rounded px-3 py-1 ${deviceTab === "pc" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              🖥️ PC
            </button>
            <button
              type="button"
              onClick={() => setDeviceTab("mobile")}
              className={`rounded px-3 py-1 ${deviceTab === "mobile" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              📱 모바일
            </button>
          </div>
          {/* HOTFIX-137.7: Craft.js 내장 undo/redo를 하단 메뉴(Footer)
              캔버스 범위에서 쓸 수 있게 노출 — ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z
              단축키는 CraftBridge가 처리하고, 이 버튼은 클릭으로도 같은
              동작을 하는 보조 진입점. */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="실행 취소 (Ctrl/⌘+Z)"
              onClick={() => craftBridgeRef.current?.actions.history.undo()}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              ↶ 실행 취소
            </button>
            <button
              type="button"
              title="다시 실행 (Ctrl/⌘+Shift+Z)"
              onClick={() => craftBridgeRef.current?.actions.history.redo()}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              ↷ 다시 실행
            </button>
          </div>
          <button type="button" onClick={handleSaveAll} disabled={saving} className={primaryButtonClass}>
            {saving ? "저장 중..." : "저장하기"}
          </button>
          {savedAt && <span className="text-xs text-green-600">저장됐어요.</span>}
        </div>
      </div>

      <Editor resolver={{ ...PRIMITIVE_RESOLVER, ...craftFooterResolver }} enabled>
        <CraftBridge bridgeRef={craftBridgeRef} onCraftSelect={handleCraftSelect} />
        <div className="flex overflow-hidden rounded-lg border border-gray-200" style={{ minHeight: 900 }}>
          <div className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="flex border-b border-gray-200 text-xs">
              {([
                ["elements", "Elements"],
                ["controls", "Controls"],
                ["page", "Page"],
                ["themes", "Themes"],
              ] as [LeftTab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLeftTab(key)}
                  className={`flex-1 border-b-2 px-2 py-2.5 font-medium ${
                    leftTab === key ? "border-gray-800 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {leftTab === "elements" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <p className="mb-2 font-semibold text-gray-500">페이지 요소 (클릭해서 선택)</p>
                    <div className="space-y-1">
                      <button type="button" onClick={() => selectSlot("logo")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        로고
                      </button>
                      {topNavRows.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => selectSlot(`tab:${tab.key}`)}
                          className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50"
                        >
                          {tab.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={addNavItem}
                        className="block w-full rounded border border-dashed border-gray-300 px-2 py-1.5 text-left text-blue-600 hover:bg-blue-50"
                      >
                        + 새 탭/메뉴 항목 추가
                      </button>
                      <button type="button" onClick={() => selectSlot("write-button")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        글쓰기
                      </button>
                      {[
                        ["account:admin", "관리자"],
                        ["account:tier", "회원 등급"],
                        ["account:mypage", "마이페이지"],
                        ["account:name", "회원 이름"],
                        ["account:logout", "로그인/로그아웃"],
                      ].map(([key, label]) => (
                        <button key={key} type="button" onClick={() => selectSlot(key)} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                          {label}
                        </button>
                      ))}
                      <button type="button" onClick={() => selectSlot("slideshow")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        슬라이드쇼
                      </button>
                      <button type="button" onClick={() => selectSlot("sidebar:left")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        좌측 사이드바 아이콘
                      </button>
                      <button type="button" onClick={() => selectSlot("sidebar:right")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        우측 사이드바 아이콘
                      </button>
                      <button type="button" onClick={() => selectSlot("top-sidebar-trigger")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        상단 사이드바 열기 버튼
                      </button>
                      <button type="button" onClick={() => selectSlot("top-sidebar")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        상단 사이드바 (Kinfolk형 메가 메뉴)
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="mb-2 font-semibold text-gray-500">하단 메뉴에 새 블록 추가</p>
                    <FooterElementsSection />
                  </div>
                </div>
              )}

              {leftTab === "controls" && (
                <ControlsPanel
                  selection={selection}
                  deviceTab={deviceTab}
                  topNavRows={topNavRows}
                  setTopNavRows={setTopNavRows}
                  onDuplicateNavItem={duplicateNavItem}
                  onDeleteNavItem={deleteNavItem}
                  mainLogoValue={mainLogoValue}
                  setMainLogoValue={setMainLogoValue}
                  topTabStyleValue={topTabStyleValue}
                  setTopTabStyleValue={setTopTabStyleValue}
                  accountMenuStyleValue={accountMenuStyleValue}
                  setAccountMenuStyleValue={setAccountMenuStyleValue}
                  heroSlideshowValue={heroSlideshowValue}
                  setHeroSlideshowValue={setHeroSlideshowValue}
                  sidebarIconsValue={sidebarIconsValue}
                  setSidebarIconsValue={setSidebarIconsValue}
                  headerPositions={headerPositions}
                  onResetOffset={resetSlotOffset}
                  topSidebarValue={topSidebarValue}
                  setTopSidebarValue={setTopSidebarValue}
                />
              )}

              {leftTab === "page" && (
                <div className="space-y-3 text-xs text-gray-600">
                  <p className="font-semibold text-gray-500">Page</p>
                  <p>지금 편집 중인 건 홈페이지 전체 — 로고·상단 탭·사용자 메뉴·슬라이드쇼·사이드바 아이콘·하단 메뉴까지 한 화면에서 실시간으로 함께 편집돼요.</p>
                  <p>
                    탭(메뉴) 자체를 추가/삭제/순서 변경하려면{" "}
                    <Link href="/admin/site-structure" className="text-blue-600 underline">
                      사이트 구성 관리
                    </Link>
                    에서 하세요 — 여기서는 이미 있는 탭의 디자인·위치만 다뤄요.
                  </p>
                </div>
              )}

              {leftTab === "themes" && (
                <ThemesPanel
                  deviceTab={deviceTab}
                  topNavRows={topNavRows}
                  setTopTabStyleValue={setTopTabStyleValue}
                  setAccountMenuStyleValue={setAccountMenuStyleValue}
                />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div className={deviceTab === "mobile" ? "mx-auto w-[390px] border-x border-gray-300 bg-white shadow-lg" : "bg-white"}>
              <Navbar
                editable
                selectedSlotKey={selection?.kind === "slot" ? selection.key : null}
                onSelectSlot={selectSlot}
                positionsOverride={headerPositions}
                onOffsetChange={handleOffsetChange}
                deviceOverride={deviceTab}
                topSidebarOverride={topSidebar}
              />

              <ClickSelectSlot slotKey="slideshow" label="슬라이드쇼" selected={selection?.kind === "slot" && selection.key === "slideshow"} onSelect={selectSlot}>
                {heroSlideshow.slides.length === 0 ? (
                  <div className="flex h-40 items-center justify-center border-b border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                    등록된 슬라이드가 없어요 — 왼쪽 Controls에서 슬라이드를 추가하세요.
                  </div>
                ) : (
                  <HeroSlideshow
                    device="both"
                    slides={heroSlideshow.slides}
                    autoAdvanceSeconds={heroSlideshow.autoAdvanceSeconds}
                    objectFit={heroSlideshow.objectFit}
                    wallpaperUrls={heroSlideshow.wallpaperUrls}
                    marginTopPx={heroSlideshow.marginTopPx}
                    marginBottomPx={heroSlideshow.marginBottomPx}
                    marginLeftPx={heroSlideshow.marginLeftPx}
                    marginRightPx={heroSlideshow.marginRightPx}
                    heightVh={heroSlideshow.heightVh ?? 30}
                  />
                )}
              </ClickSelectSlot>


              <div className="border-b border-t-4 border-dashed border-gray-300 bg-gray-50 px-4 py-1.5 text-center text-[10px] uppercase tracking-wide text-gray-400">
                하단 메뉴
              </div>
              <Frame data={footerCraftState ?? undefined}>{!footerCraftState && footerDefaultTree}</Frame>
            </div>
          </div>
        </div>
      </Editor>
    </main>
  );
}

// ── Controls 탭 본문 — selection 종류별로 실제 필드를 보여준다.
function ControlsPanel({
  selection,
  deviceTab,
  topNavRows,
  setTopNavRows,
  onDuplicateNavItem,
  onDeleteNavItem,
  mainLogoValue,
  setMainLogoValue,
  topTabStyleValue,
  setTopTabStyleValue,
  accountMenuStyleValue,
  setAccountMenuStyleValue,
  heroSlideshowValue,
  setHeroSlideshowValue,
  sidebarIconsValue,
  setSidebarIconsValue,
  headerPositions,
  onResetOffset,
  topSidebarValue,
  setTopSidebarValue,
}: {
  selection: Selection;
  deviceTab: "pc" | "mobile";
  topNavRows: NavTab[];
  setTopNavRows: React.Dispatch<React.SetStateAction<NavTab[]>>;
  onDuplicateNavItem: (tab: NavTab) => void;
  onDeleteNavItem: (tab: NavTab) => void;
  mainLogoValue: MainLogoValue;
  setMainLogoValue: React.Dispatch<React.SetStateAction<MainLogoValue>>;
  topTabStyleValue: TopTabStyleValue;
  setTopTabStyleValue: React.Dispatch<React.SetStateAction<TopTabStyleValue>>;
  accountMenuStyleValue: AccountMenuStyleValue;
  setAccountMenuStyleValue: React.Dispatch<React.SetStateAction<AccountMenuStyleValue>>;
  heroSlideshowValue: HeroSlideshowValue;
  setHeroSlideshowValue: React.Dispatch<React.SetStateAction<HeroSlideshowValue>>;
  sidebarIconsValue: SidebarIconsValue;
  setSidebarIconsValue: React.Dispatch<React.SetStateAction<SidebarIconsValue>>;
  headerPositions: { slots: Record<string, HeaderSlotOffset> };
  onResetOffset: (slotKey: string) => void;
  topSidebarValue: TopSidebarValue;
  setTopSidebarValue: React.Dispatch<React.SetStateAction<TopSidebarValue>>;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);
  const [uploadingWallpaperIdx, setUploadingWallpaperIdx] = useState<number | null>(null);
  const [uploadingSidebarField, setUploadingSidebarField] = useState<string | null>(null);

  if (!selection) return <p className="text-xs text-gray-400">캔버스에서 요소를 클릭하면 설정이 여기 표시됩니다.</p>;
  if (selection.kind === "craft") return <FooterCraftControls />;

  const selectedSlotKey = selection.key;
  const offset = headerPositions.slots[selectedSlotKey];
  const positionSection = (selectedSlotKey === "slideshow" || selectedSlotKey === "top-sidebar" || selectedSlotKey.startsWith("sidebar:")) ? null : (
    <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
      <p className="text-xs font-semibold text-gray-500">위치</p>
      <p className="text-[11px] leading-relaxed text-gray-400">선택된 요소 위의 ✥ 핸들을 캔버스에서 직접 드래그해 화면 어디로든 옮기세요.</p>
      {offset && (offset.dxPx !== 0 || offset.dyPx !== 0) && (
        <button type="button" onClick={() => onResetOffset(selectedSlotKey)} className="text-xs text-blue-600 hover:underline">
          원래 위치로 되돌리기
        </button>
      )}
    </div>
  );

  const mainLogo = mainLogoValue[deviceTab];
  function patchLogo(patch: Partial<MainLogoValue["pc"]>) {
    setMainLogoValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...patch } }));
  }
  async function handleLogoFile(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    const { url } = await uploadImage(file, "main_logo");
    setUploadingLogo(false);
    if (url) patchLogo({ type: "image", imageUrl: url });
  }
  async function handleFontFile(file: File | null) {
    if (!file) return;
    setUploadingFont(true);
    const { url } = await uploadImage(file, "custom_fonts");
    setUploadingFont(false);
    if (url) {
      const entry: CustomFontEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url, isActive: true };
      patchLogo({ customFonts: [...mainLogo.customFonts, entry] });
    }
  }

  if (selectedSlotKey === "logo") {
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">로고</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">유형</span>
          <select value={mainLogo.type} onChange={(e) => patchLogo({ type: e.target.value as "text" | "image" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="text">텍스트</option>
            <option value="image">이미지</option>
          </select>
        </label>
        {mainLogo.type === "text" ? (
          <label className="block">
            <span className="mb-1 block text-gray-600">텍스트</span>
            <input value={mainLogo.text} onChange={(e) => patchLogo({ text: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-gray-600">이미지 {uploadingLogo && "(업로드 중...)"}</span>
            <input type="file" accept="image/*" disabled={uploadingLogo} onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
            <ImageThumb url={mainLogo.imageUrl} alt="로고 미리보기" />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-gray-600">왼쪽 텍스트</span>
          <input value={mainLogo.leftText} onChange={(e) => patchLogo({ leftText: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">오른쪽 텍스트</span>
          <input value={mainLogo.rightText} onChange={(e) => patchLogo({ rightText: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">로고 이미지 높이(px)</span>
          <input type="number" value={mainLogo.heightPx} onChange={(e) => patchLogo({ heightPx: Number(e.target.value) || DEFAULT_LOGO_HEIGHT_PX })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">텍스트 색상</span>
          <input type="color" value={mainLogo.textColor || DEFAULT_LOGO_TEXT_COLOR} onChange={(e) => patchLogo({ textColor: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={mainLogo.bold} onChange={(e) => patchLogo({ bold: e.target.checked })} />
          굵게
        </label>
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className="font-medium text-gray-600">커스텀 폰트 파일 ({mainLogo.customFonts.length}개)</p>
          {mainLogo.customFonts.map((font) => (
            <div key={font.id} className="space-y-1 rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={font.isActive}
                    onChange={(e) => patchLogo({ customFonts: mainLogo.customFonts.map((f) => (f.id === font.id ? { ...f, isActive: e.target.checked } : f)) })}
                  />
                  사용
                </label>
                <button type="button" onClick={() => patchLogo({ customFonts: mainLogo.customFonts.filter((f) => f.id !== font.id) })} className="text-[11px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
              <p className="truncate text-[10px] text-gray-400" title={font.url}>{font.url}</p>
            </div>
          ))}
          <label className="block">
            <span className="mb-1 block text-gray-600">폰트 파일 추가 {uploadingFont && "(업로드 중...)"}</span>
            <input type="file" accept=".woff,.woff2,.ttf,.otf" disabled={uploadingFont} onChange={(e) => handleFontFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          </label>
        </div>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey.startsWith("tab:")) {
    const tabKey = selectedSlotKey.slice("tab:".length);
    const topTabStyle = topTabStyleValue[deviceTab];
    const entry = topTabStyle.tabs[tabKey] ?? defaultTopTabStyleEntry();
    const tab = topNavRows.find((t) => t.key === tabKey);
    const hasChildren = !!(tab?.groups?.length || tab?.items?.length);
    function patchTab(patch: Partial<TopTabStyleEntry>) {
      setTopTabStyleValue((prev) => ({
        ...prev,
        [deviceTab]: { ...prev[deviceTab], tabs: { ...prev[deviceTab].tabs, [tabKey]: { ...entry, ...patch } } },
      }));
    }
    // HOTFIX-137.5(사용자 지시 — "각 요소마다 '드롭다운'이 되게 하는걸
    // 선택할수 있는 기능을 만들고"): site_navigations.target_types를 이
    // 화면에서 바로 편집 — CategoryTreeManager.tsx(사이트 메뉴)와 같은
    // 테이블/컬럼을 직접 update하고, 로컬 topNavRows도 낙관적으로 갱신해
    // 다시 불러오지 않아도 화면(체크 상태·캔버스의 실제 탭 배치)이 바로
    // 반영되게 한다.
    async function toggleTargetType(type: DbTargetType) {
      if (!tab?.id) return;
      const current = tab.targetTypes ?? [];
      const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
      const { error } = await supabase.from("site_navigations").update({ target_types: next }).eq("id", tab.id);
      if (error) {
        alert(`노출 위치 변경에 실패했어요.\n${error.message}`);
        return;
      }
      setTopNavRows((prev) => prev.map((t) => (t.key === tabKey ? { ...t, targetTypes: next } : t)));
    }
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">상단 탭 / 메뉴 항목</p>
          {tab && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="복제"
                onClick={() => onDuplicateNavItem(tab)}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                복제
              </button>
              <button
                type="button"
                title="삭제"
                onClick={() => onDeleteNavItem(tab)}
                className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">표시 텍스트(비우면 원래 이름)</span>
          <input value={entry.labelOverride} onChange={(e) => patchTab({ labelOverride: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <div>
          <span className="mb-1 block text-gray-600">노출 위치 (복수 선택 가능)</span>
          {tab?.id ? (
            <div className="space-y-1 rounded border border-gray-200 p-2">
              {(Object.entries(TAB_TARGET_TYPE_LABELS) as [DbTargetType, string][]).map(([type, label]) => (
                <label key={type} className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={(tab.targetTypes ?? []).includes(type)}
                    onChange={() => toggleTargetType(type)}
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">이 탭은 여기서 편집할 수 없어요(사이드바 전용) — 사이트 구성 관리에서 편집하세요.</p>
          )}
        </div>
        {hasChildren && (
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" checked={!!entry.megaDropdown} onChange={(e) => patchTab({ megaDropdown: e.target.checked })} />
            메가 드롭다운으로 보기(그룹/항목을 한 번에 나란히 펼침)
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-gray-600">글자 크기(px)</span>
          <input
            type="number"
            value={entry.fontSizePx ?? ""}
            placeholder="기본값"
            onChange={(e) => patchTab({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">색상</span>
          <input type="color" value={entry.color || "#6b7280"} onChange={(e) => patchTab({ color: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={entry.bold} onChange={(e) => patchTab({ bold: e.target.checked })} />
          굵게
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">호버 모션</span>
          <select value={entry.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION} onChange={(e) => patchTab({ hoverMotion: e.target.value as TopTabStyleEntry["hoverMotion"] })} className="w-full rounded border border-gray-300 px-2 py-1">
            {TAB_HOVER_MOTIONS.map((m) => (
              <option key={m} value={m}>
                {TAB_HOVER_MOTION_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey.startsWith("account:")) {
    const accountMenuStyle = accountMenuStyleValue[deviceTab];
    function patchAccount(patch: Partial<AccountMenuStyleValue["pc"]>) {
      setAccountMenuStyleValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...patch } }));
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">계정 영역 (관리자·등급·마이페이지·이름·로그아웃)</p>
        <p className="text-[11px] text-gray-400">
          관리자 / 회원 등급 / 마이페이지 / 회원 이름 / 로그아웃 — 이 5개는 로그인 상태에 따라 자동으로 나타나는 고정 항목이라 여기서 추가/삭제는 안 돼요(위치·스타일만 조정). 스타일은 5개 전체에 함께 적용돼요.
        </p>
        <p className="text-[11px] text-gray-400">
          &ldquo;마이페이지&rdquo; 클릭 시 뜨는 드롭다운에 항목을 추가하고 싶으면 — Elements 탭의 &ldquo;+ 새 탭/메뉴 항목 추가&rdquo;로 만든 뒤, 그 항목의 Controls에서 노출 위치를 &ldquo;사용자 메뉴&rdquo;로 체크하세요.
        </p>
        <label className="block">
          <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
          <input value={accountMenuStyle.fontFamily} onChange={(e) => patchAccount({ fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">글자 크기(px)</span>
          <input
            type="number"
            value={accountMenuStyle.fontSizePx ?? ""}
            placeholder="기본값"
            onChange={(e) => patchAccount({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">색상</span>
          <input type="color" value={accountMenuStyle.color || "#4b5563"} onChange={(e) => patchAccount({ color: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={accountMenuStyle.bold} onChange={(e) => patchAccount({ bold: e.target.checked })} />
          굵게
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">호버 모션</span>
          <select value={accountMenuStyle.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION} onChange={(e) => patchAccount({ hoverMotion: e.target.value as AccountMenuStyleValue["pc"]["hoverMotion"] })} className="w-full rounded border border-gray-300 px-2 py-1">
            {TAB_HOVER_MOTIONS.map((m) => (
              <option key={m} value={m}>
                {TAB_HOVER_MOTION_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "write-button") {
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">글쓰기 버튼</p>
        <p className="text-[11px] text-gray-400">항상 &ldquo;마이 페이지&rdquo; 탭 바로 오른쪽에 붙어있는 전역 버튼이에요. 위치만 자유롭게 옮길 수 있어요.</p>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "top-sidebar-trigger") {
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">상단 사이드바 열기 버튼</p>
        <p className="text-[11px] text-gray-400">클릭하면 아래에서 편집하는 &ldquo;상단 사이드바&rdquo; 패널이 위에서 아래로 슬라이드해 열려요. 위치만 자유롭게 옮길 수 있어요(캔버스에서 직접 클릭해 열고 닫아 미리볼 수도 있어요).</p>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "top-sidebar") {
    return <TopSidebarControls value={topSidebarValue} setValue={setTopSidebarValue} deviceTab={deviceTab} />;
  }

  if (selectedSlotKey === "slideshow") {
    const value = heroSlideshowValue[deviceTab];
    function patch(next: Partial<HeroSlideshowValue["pc"]>) {
      setHeroSlideshowValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...next } }));
    }
    function addSlide() {
      patch({ slides: [...value.slides, { imageUrl: "", title: "", description: "" }] });
    }
    function updateSlide(index: number, slidePatch: Partial<SlideItem>) {
      patch({ slides: value.slides.map((s, i) => (i === index ? { ...s, ...slidePatch } : s)) });
    }
    function removeSlide(index: number) {
      patch({ slides: value.slides.filter((_, i) => i !== index) });
    }
    // HOTFIX-137.3(사용자 지시 — "슬라이드쇼 요소에 여백 배경 이미지를
    // 업로드하면 프리뷰가 안나와"): url을 얻지 못하면(업로드 실패, 예:
    // Supabase 무료 플랜 파일 용량 상한) 조용히 아무 일도 안 일어나
    // "업로드했는데 왜 안 뜨지"로 보였다 — HOTFIX-134.2가 다른 업로드
    // 경로에 적용한 것과 동일하게 실패 사유를 alert로 보여준다.
    async function handleSlideFile(index: number, file: File | null) {
      if (!file) return;
      setUploadingSlideIdx(index);
      const { url, error: uploadErr } = await uploadImage(file, "slides");
      setUploadingSlideIdx(null);
      if (url) {
        updateSlide(index, { imageUrl: url });
      } else {
        alert(`슬라이드 이미지 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
      }
    }
    function addWallpaper() {
      if (value.wallpaperUrls.length >= MAX_WALLPAPERS) return;
      patch({ wallpaperUrls: [...value.wallpaperUrls, ""] });
    }
    function removeWallpaper(index: number) {
      patch({ wallpaperUrls: value.wallpaperUrls.filter((_, i) => i !== index) });
    }
    async function handleWallpaperFile(index: number, file: File | null) {
      if (!file) return;
      setUploadingWallpaperIdx(index);
      try {
        const compressed = await compressImage(file, value.wallpaperQuality);
        const { url, error: uploadErr } = await uploadImage(compressed, "wallpaper");
        if (url) {
          patch({ wallpaperUrls: value.wallpaperUrls.map((u, i) => (i === index ? url : u)) });
        } else {
          alert(`여백 배경 이미지 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
        }
      } catch (e) {
        alert(`여백 배경 이미지 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setUploadingWallpaperIdx(null);
      }
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">슬라이드쇼</p>
        <div className="space-y-2">
          <p className="font-medium text-gray-600">슬라이드 ({value.slides.length}개)</p>
          {value.slides.map((slide, idx) => (
            <div key={idx} className="space-y-1 rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">#{idx + 1}</span>
                <button type="button" onClick={() => removeSlide(idx)} className="text-[11px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
              <div className="flex items-start gap-2">
                <ImageThumb url={slide.imageUrl} alt={`슬라이드 ${idx + 1}`} />
                <div className="min-w-0 flex-1 space-y-1">
                  <input type="file" accept="image/*" disabled={uploadingSlideIdx === idx} onChange={(e) => handleSlideFile(idx, e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
                  <input value={slide.title} placeholder="제목(선택)" onChange={(e) => updateSlide(idx, { title: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
                  <input value={slide.description} placeholder="설명(선택)" onChange={(e) => updateSlide(idx, { description: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSlide} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">
            + 슬라이드 추가
          </button>
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">섹션 높이(vh, 비우면 자동)</span>
          <input type="number" value={value.heightVh ?? ""} onChange={(e) => patch({ heightVh: e.target.value ? Number(e.target.value) : null })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">자동 전환(초)</span>
          <input type="number" value={value.autoAdvanceSeconds} onChange={(e) => patch({ autoAdvanceSeconds: Number(e.target.value) || 5 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">이미지 맞춤</span>
          <select value={value.objectFit} onChange={(e) => patch({ objectFit: e.target.value as "cover" | "contain" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="cover">꽉 채우기(cover)</option>
            <option value="contain">전체 보이기(contain)</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-gray-600">위 여백(px)</span>
            <input type="number" value={value.marginTopPx} onChange={(e) => patch({ marginTopPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">아래 여백(px)</span>
            <input type="number" value={value.marginBottomPx} onChange={(e) => patch({ marginBottomPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">좌 여백(px)</span>
            <input type="number" value={value.marginLeftPx} onChange={(e) => patch({ marginLeftPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">우 여백(px)</span>
            <input type="number" value={value.marginRightPx} onChange={(e) => patch({ marginRightPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
        </div>
        {value.objectFit === "contain" && (
          <div className="space-y-2">
            <p className="font-medium text-gray-600">
              여백 배경 이미지 ({value.wallpaperUrls.length}/{MAX_WALLPAPERS})
            </p>
            {value.wallpaperUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <ImageThumb url={url} alt={`배경 ${idx + 1}`} />
                <input type="file" accept="image/*" disabled={uploadingWallpaperIdx === idx} onChange={(e) => handleWallpaperFile(idx, e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-[11px]" />
                <button type="button" onClick={() => removeWallpaper(idx)} className="shrink-0 text-[11px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
            ))}
            {value.wallpaperUrls.length < MAX_WALLPAPERS && (
              <button type="button" onClick={addWallpaper} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">
                + 배경 이미지 추가
              </button>
            )}
            <label className="block">
              <span className="mb-1 block text-gray-600">압축 품질(%)</span>
              <input
                type="number"
                min={1}
                max={100}
                value={value.wallpaperQuality}
                onChange={(e) => patch({ wallpaperQuality: Math.max(1, Math.min(100, Number(e.target.value) || 100)) })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
          </div>
        )}
      </div>
    );
  }

  if (selectedSlotKey.startsWith("sidebar:")) {
    const side = selectedSlotKey === "sidebar:left" ? "left" : "right";
    const value = sidebarIconsValue[deviceTab];
    function patch(next: Partial<SidebarIconsValue["pc"]>) {
      setSidebarIconsValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...next } }));
    }
    const defaultField = side === "left" ? "leftIconDefaultUrl" : "rightIconDefaultUrl";
    const hoverField = side === "left" ? "leftIconHoverUrl" : "rightIconHoverUrl";
    async function handleFile(field: "leftIconDefaultUrl" | "leftIconHoverUrl" | "rightIconDefaultUrl" | "rightIconHoverUrl", file: File | null) {
      if (!file) return;
      setUploadingSidebarField(field);
      const { url } = await uploadImage(file, "sidebar_icons");
      setUploadingSidebarField(null);
      if (url) patch({ [field]: url } as Partial<SidebarIconsValue["pc"]>);
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">{side === "left" ? "좌측" : "우측"} 사이드바 아이콘</p>
        <p className="text-[11px] text-gray-400">이 자리는 화면 가장자리에 항상 고정이라 추가/삭제할 수 없어요.</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">기본 이미지/영상 {uploadingSidebarField === defaultField && "(업로드 중...)"}</span>
          <input type="file" accept="image/*,video/webm,video/mp4" onChange={(e) => handleFile(defaultField, e.target.files?.[0] ?? null)} disabled={uploadingSidebarField !== null} className="w-full text-[11px]" />
          <ImageThumb url={value[defaultField]} alt="기본 아이콘 미리보기" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">호버 이미지/영상 {uploadingSidebarField === hoverField && "(업로드 중...)"}</span>
          <input type="file" accept="image/*,video/webm,video/mp4" onChange={(e) => handleFile(hoverField, e.target.files?.[0] ?? null)} disabled={uploadingSidebarField !== null} className="w-full text-[11px]" />
          <ImageThumb url={value[hoverField]} alt="호버 아이콘 미리보기" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">아이콘 크기(px, 좌우 공통)</span>
          <input type="number" value={value.iconSizePx || DEFAULT_ICON_SIZE_PX} onChange={(e) => patch({ iconSizePx: Number(e.target.value) || DEFAULT_ICON_SIZE_PX })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">여닫이 방식(좌우 공통)</span>
          <select value={value.triggerMode} onChange={(e) => patch({ triggerMode: e.target.value as "click" | "hover" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="click">클릭해야 열림</option>
            <option value="hover">마우스를 올리면 바로 열림</option>
          </select>
        </label>
      </div>
    );
  }

  return null;
}

// ── "상단 사이드바"(Kinfolk형 메가 메뉴, HOTFIX-137.9) 전용 Controls —
// column 2(링크 목록, 항목마다 hover 이미지)와 그 하위 column 3(children)을
// 여기서 추가/삭제/재배치한다. column 1(이름/등급/팔로워 등)은 실제 세션
// 데이터라 TopSidebarPanel.tsx가 직접 조회 — 관리자가 편집할 대상이 아니다.
function TopSidebarControls({
  value,
  setValue,
  deviceTab,
}: {
  value: TopSidebarValue;
  setValue: React.Dispatch<React.SetStateAction<TopSidebarValue>>;
  deviceTab: "pc" | "mobile";
}) {
  const [uploadingLinkId, setUploadingLinkId] = useState<string | null>(null);
  const [uploadingBankImage, setUploadingBankImage] = useState(false);
  const config = value[deviceTab];

  function patch(next: Partial<TopSidebarValue["pc"]>) {
    setValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...next } }));
  }
  function updateLink(id: string, linkPatch: Partial<TopSidebarLink>) {
    patch({ links: config.links.map((l) => (l.id === id ? { ...l, ...linkPatch } : l)) });
  }
  function addLink() {
    const newLink: TopSidebarLink = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: "새 링크", href: "#", imageUrl: "", children: [] };
    patch({ links: [...config.links, newLink] });
  }
  // HOTFIX-140.2(사용자 지시 — "모든 요소 추가, 제거, 복제 가능하게해"):
  // 이 목록은 Craft.js 노드 트리가 아니라 평범한 React 배열이라(EPIC-139의
  // "복제" 위험 회피 사유였던 Craft 내부 id 재사용 문제가 여기엔 없음)
  // 그냥 새 id로 깊은 복사하면 안전하다.
  function duplicateLink(id: string) {
    const link = config.links.find((l) => l.id === id);
    if (!link) return;
    const copy: TopSidebarLink = {
      ...link,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: `${link.label} 사본`,
      children: link.children.map((c) => ({ ...c, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` })),
    };
    const idx = config.links.findIndex((l) => l.id === id);
    const next = [...config.links];
    next.splice(idx + 1, 0, copy);
    patch({ links: next });
  }
  function removeLink(id: string) {
    patch({ links: config.links.filter((l) => l.id !== id) });
  }
  function moveLink(id: string, dir: -1 | 1) {
    const idx = config.links.findIndex((l) => l.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= config.links.length) return;
    const next = [...config.links];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    patch({ links: next });
  }
  async function handleLinkImage(id: string, file: File | null) {
    if (!file) return;
    setUploadingLinkId(id);
    const { url } = await uploadImage(file, "top_sidebar");
    setUploadingLinkId(null);
    if (url) updateLink(id, { imageUrl: url });
  }
  // HOTFIX-140.2: column 0에 무작위로 보여줄 이미지 풀 — 여러 장 추가/삭제.
  async function handleAddBankImage(file: File | null) {
    if (!file) return;
    setUploadingBankImage(true);
    const { url } = await uploadImage(file, "top_sidebar_bank");
    setUploadingBankImage(false);
    if (url) patch({ imageBankUrls: [...config.imageBankUrls, url] });
  }
  function removeBankImage(url: string) {
    patch({ imageBankUrls: config.imageBankUrls.filter((u) => u !== url) });
  }
  function addChild(linkId: string) {
    const link = config.links.find((l) => l.id === linkId);
    if (!link) return;
    const newChild: TopSidebarChildLink = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: "새 하위 링크", href: "#" };
    updateLink(linkId, { children: [...link.children, newChild] });
  }
  function updateChild(linkId: string, childId: string, childPatch: Partial<TopSidebarChildLink>) {
    const link = config.links.find((l) => l.id === linkId);
    if (!link) return;
    updateLink(linkId, { children: link.children.map((c) => (c.id === childId ? { ...c, ...childPatch } : c)) });
  }
  function removeChild(linkId: string, childId: string) {
    const link = config.links.find((l) => l.id === linkId);
    if (!link) return;
    updateLink(linkId, { children: link.children.filter((c) => c.id !== childId) });
  }

  return (
    <div className="space-y-3 text-xs">
      <p className="text-sm font-semibold text-gray-700">상단 사이드바</p>
      <p className="text-[11px] text-gray-400">
        헤더 우측의 &ldquo;상단 사이드바 열기 버튼&rdquo;은 다른 헤더 요소처럼 항상 표시돼요(따로 켜고 끄지 않아요). 클릭하면 화면 위에서 아래로 슬라이드해 열려요(캔버스에서 직접 클릭해 열고 닫아 미리볼 수 있어요). 왼쪽 이름/등급/팔로워/최근 활동/Mind Diary·Studio·Silo Planet은 실제 로그인 정보 + 고정 바로가기라 여기서 편집할 수 없어요 — 아래는 그 옆(column 2) 링크 목록과 패널 전체 스타일이에요.
      </p>

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">패널 스타일</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">배경색</span>
          <input type="color" value={config.backgroundColor || "#ffffff"} onChange={(e) => patch({ backgroundColor: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">텍스트 색</span>
          <input type="color" value={config.textColor || "#374151"} onChange={(e) => patch({ textColor: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
          <input value={config.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">링크 hover 모션</span>
          <select value={config.hoverMotion} onChange={(e) => patch({ hoverMotion: e.target.value as TopSidebarConfig["hoverMotion"] })} className="w-full rounded border border-gray-300 px-2 py-1">
            {TAB_HOVER_MOTIONS.map((m) => (
              <option key={m} value={m}>
                {TAB_HOVER_MOTION_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">이미지 뱅크 ({config.imageBankUrls.length}장) — column 2에 마우스를 올리면 이 중 무작위로 하나가 왼쪽에 떠요</p>
        <div className="grid grid-cols-4 gap-2">
          {config.imageBankUrls.map((url) => (
            <div key={url} className="relative">
              <ImageThumb url={url} alt="뱅크 이미지" />
              <button type="button" onClick={() => removeBankImage(url)} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">✕</button>
            </div>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">이미지 추가 {uploadingBankImage && "(업로드 중...)"}</span>
          <input type="file" accept="image/*" disabled={uploadingBankImage} onChange={(e) => handleAddBankImage(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
        </label>
      </div>

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">링크 목록 ({config.links.length}개)</p>
        {config.links.map((link, idx) => (
          <div key={link.id} className="space-y-1.5 rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">#{idx + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={idx === 0} onClick={() => moveLink(link.id, -1)} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30">↑</button>
                <button type="button" disabled={idx === config.links.length - 1} onClick={() => moveLink(link.id, 1)} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => duplicateLink(link.id)} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50">복제</button>
                <button type="button" onClick={() => removeLink(link.id)} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50">삭제</button>
              </div>
            </div>
            <input value={link.label} placeholder="라벨" onChange={(e) => updateLink(link.id, { label: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
            <input value={link.href} placeholder="링크 주소" onChange={(e) => updateLink(link.id, { href: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
            <div className="flex items-start gap-2">
              <ImageThumb url={link.imageUrl} alt={`${link.label} 미리보기`} />
              <label className="block min-w-0 flex-1">
                <span className="mb-1 block text-gray-600">hover 이미지(이미지 뱅크가 비어있을 때만 사용) {uploadingLinkId === link.id && "(업로드 중...)"}</span>
                <input type="file" accept="image/*" disabled={uploadingLinkId === link.id} onChange={(e) => handleLinkImage(link.id, e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
              </label>
            </div>
            <div className="space-y-1 border-t border-gray-100 pt-1.5">
              <p className="text-[11px] font-medium text-gray-500">하위 목록 ({link.children.length}개) — 이 링크에 마우스를 올리면 나타나요</p>
              {link.children.map((child) => (
                <div key={child.id} className="flex items-center gap-1">
                  <input value={child.label} placeholder="라벨" onChange={(e) => updateChild(link.id, child.id, { label: e.target.value })} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1" />
                  <input value={child.href} placeholder="링크" onChange={(e) => updateChild(link.id, child.id, { href: e.target.value })} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1" />
                  <button type="button" onClick={() => removeChild(link.id, child.id)} className="shrink-0 text-[11px] text-red-500 hover:underline">삭제</button>
                </div>
              ))}
              <button type="button" onClick={() => addChild(link.id)} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">+ 하위 링크 추가</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addLink} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">+ 링크 추가</button>
      </div>
    </div>
  );
}

function ThemesPanel({
  deviceTab,
  topNavRows,
  setTopTabStyleValue,
  setAccountMenuStyleValue,
}: {
  deviceTab: "pc" | "mobile";
  topNavRows: NavTab[];
  setTopTabStyleValue: React.Dispatch<React.SetStateAction<TopTabStyleValue>>;
  setAccountMenuStyleValue: React.Dispatch<React.SetStateAction<AccountMenuStyleValue>>;
}) {
  function applyMotionToAll(motion: (typeof TAB_HOVER_MOTIONS)[number]) {
    setTopTabStyleValue((prev) => {
      const cfg = prev[deviceTab];
      const nextTabs = { ...cfg.tabs };
      for (const tab of topNavRows) {
        nextTabs[tab.key] = { ...(nextTabs[tab.key] ?? defaultTopTabStyleEntry()), hoverMotion: motion };
      }
      return { ...prev, [deviceTab]: { ...cfg, tabs: nextTabs } };
    });
    setAccountMenuStyleValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], hoverMotion: motion } }));
  }
  return (
    <div className="space-y-3 text-xs">
      <p className="font-semibold text-gray-500">호버 모션 테마</p>
      <p className="text-[11px] text-gray-400">상단 탭 전체 + 사용자 메뉴 전체에 한 번에 적용해요(개별 조정은 각 요소의 Controls에서 다시 바꿀 수 있어요).</p>
      <div className="space-y-1">
        {TAB_HOVER_MOTIONS.map((m) => (
          <button key={m} type="button" onClick={() => applyMotionToAll(m)} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
            {TAB_HOVER_MOTION_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
