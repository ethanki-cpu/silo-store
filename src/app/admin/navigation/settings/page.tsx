"use client";

// HOTFIX(사용자 지시 — "지금처럼 메인 로고 설정 따로, 사용자 메뉴 설정
// 따로가 아니라, 한 화면에서 모든 설정을 할 수 있는 걸 원해" + "페이지가
// 출력되는 위치 그대로 나오는 상태에서 페이지 위의 요소들을 클릭 → 왼쪽
// 설정창, 드래그 드롭으로 블록 위치 조정 할 수 있어야해"): 예전엔 로고/
// 슬라이드쇼/사이드바 아이콘/(EPIC-134 GrapesJS) 헤더까지 4개의 서로 다른
// 화면으로 나뉘어 있었다 — 이제 실제 페이지 순서 그대로(로고 → 사용자
// 메뉴 → 상단 탭(1단/2단) → 슬라이드쇼 → 좌우 사이드바 아이콘) 하나의
// Craft.js 트리로 쌓아 보여주는 캔버스 하나로 합쳤다. 저장 방식은
// 그대로 site_settings 키-값이고(Craft의 craft_state 직렬화는 쓰지
// 않음), 각 블록의 설정 패널이 setProp과 함께 이 페이지의 shim
// setState를 호출해 캔버스에 즉시 반영 + "저장하기"를 누르면
// site_settings에 실제로 쓰는 구조는 그대로 유지된다.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { primaryButtonClass } from "../shared";
import { CraftFooterEditor } from "@/components/admin/craft/CraftFooterEditor";
import { ChromeCraftEditor, ChromeDeviceToggle, type ChromeDeviceMode } from "@/components/admin/craft/ChromeCraftEditor";
import { DragValueSlider } from "@/components/admin/DragValueSlider";
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { ChromeLogoBlock } from "@/components/craft/chrome/blocks/ChromeLogoBlock";
import { ChromeSidebarIconBlock } from "@/components/craft/chrome/blocks/ChromeSidebarIconBlock";
import { ChromeAccountMenuBlock } from "@/components/craft/chrome/blocks/ChromeAccountMenuBlock";
import { ChromeTopTabBlock } from "@/components/craft/chrome/blocks/ChromeTopTabBlock";
import { ChromeSlideshowBlock } from "@/components/craft/chrome/blocks/ChromeSlideshowBlock";
import { ChromeTierZone } from "@/components/craft/chrome/ChromeTierZone";
import {
  normalizeMainLogo,
  defaultMainLogoValue,
  type MainLogoValue,
} from "@/lib/mainLogoSettings";
import {
  normalizeSidebarIcons,
  defaultSidebarIconsValue,
  type SidebarIconsConfig,
  type SidebarIconsValue,
} from "@/lib/sidebarIconsSettings";
import {
  normalizeTopTabStyle,
  defaultTopTabStyleValue,
  defaultTopTabStyleEntry,
  type TopTabStyleEntry,
  type TopTabStyleValue,
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
} from "@/lib/heroSlideshow";

type TopNavRow = { id: string; key: string | null; title: string; sort_order: number };

async function upsertSetting(key: string, value: unknown) {
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
}

export default function AdminNavigationSettingsPage() {
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [activeSection, setActiveSection] = useState<"unified" | "footer">("unified");

  // 하단 메뉴(footer)는 이 화면에 합치지 않았다 — page_builder.craft_state로
  // 저장되는 완전히 별개의 Craft Editor 인스턴스인데, craft.js의
  // query.serialize()는 "그 Editor가 가진 전체 트리"만 직렬화하는 라이브러리
  // 자체 제약이 있어(부분 트리만 뽑아내는 API가 없음) 같은 캔버스 안에
  // 끼워 넣으면 footer만 따로 저장할 방법이 없어진다. 대신 같은 화면
  // 상단의 섹션 전환 버튼으로 옆 섹션처럼 오갈 수 있게 해 "다른 화면으로
  // 이동해야 하는" 체감을 최대한 줄였다.
  const [footerPageId, setFooterPageId] = useState<string | null>(null);
  const [footerCraftState, setFooterCraftState] = useState<string | null>(null);
  const [footerLoading, setFooterLoading] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);

  async function loadFooter() {
    setFooterLoading(true);
    setFooterError(null);
    const { data: existing, error: fetchError } = await supabase
      .from("page_builder")
      .select("id, craft_state")
      .eq("slug", "footer")
      .maybeSingle();
    if (fetchError) {
      setFooterError(fetchError.message);
      setFooterLoading(false);
      return;
    }
    if (existing) {
      setFooterPageId(existing.id);
      setFooterCraftState(existing.craft_state ?? null);
      setFooterLoading(false);
      return;
    }
    const { data: created, error: createError } = await supabase
      .from("page_builder")
      .insert({ slug: "footer", title: "하단 Footer", status: "published", builder_type: "craft" })
      .select("id, craft_state")
      .single();
    if (createError) {
      setFooterError(createError.message);
      setFooterLoading(false);
      return;
    }
    setFooterPageId(created.id);
    setFooterCraftState(created.craft_state ?? null);
    setFooterLoading(false);
  }

  function handleSelectSection(key: "unified" | "footer") {
    setActiveSection(key);
    if (key === "footer" && footerPageId === null && !footerLoading) {
      loadFooter();
    }
  }

  // HOTFIX(사용자 지시 — "pc, tab, mobile 토글 설정가능"): 캔버스 폭
  // 미리보기는 3단(PC/태블릿/모바일)이지만, 실제 저장되는 데이터
  // (main_logo/sidebar_icons/top_tab_style/account_menu_style/
  // hero_slideshow 전부)는 이 저장소 전체가 처음부터 { pc, mobile } 2단
  // 으로만 설계돼 있다. 태블릿 전용 데이터를 새로 만드는 대신, 태블릿
  // 폭에서는 PC 값을 좁은 화면에서 미리보는 용도로만 쓴다 — 실제로
  // "편집"되는 값은 항상 pc 또는 mobile 둘 중 하나.
  const [deviceMode, setDeviceMode] = useState<ChromeDeviceMode>("pc");
  const chromeDeviceTab: "pc" | "mobile" = deviceMode === "mobile" ? "mobile" : "pc";

  const [mainLogoValue, setMainLogoValue] = useState<MainLogoValue>(() => defaultMainLogoValue());
  const [sidebarIconsValue, setSidebarIconsValue] = useState<SidebarIconsValue>(() => defaultSidebarIconsValue());
  const [topTabStyleValue, setTopTabStyleValue] = useState<TopTabStyleValue>(() => defaultTopTabStyleValue());
  const [accountMenuStyleValue, setAccountMenuStyleValue] = useState<AccountMenuStyleValue>(() => defaultAccountMenuStyleValue());
  const [heroSlideshowValue, setHeroSlideshowValue] = useState<HeroSlideshowValue>(() => defaultHeroSlideshowValue());
  const [topNavRows, setTopNavRows] = useState<TopNavRow[]>([]);

  const mainLogo = mainLogoValue[chromeDeviceTab];
  const sidebarIcons = sidebarIconsValue[chromeDeviceTab];
  const topTabStyle = topTabStyleValue[chromeDeviceTab];
  const accountMenuStyle = accountMenuStyleValue[chromeDeviceTab];
  const heroSlideshow = heroSlideshowValue[chromeDeviceTab];

  useEffect(() => {
    async function load() {
      const [{ data, error: fetchError }, navResult] = await Promise.all([
        supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["main_logo", "hero_slideshow", "sidebar_icons", "top_tab_style", "account_menu_style"]),
        supabase
          .from("site_navigations")
          .select("id, key, title, sort_order")
          .is("parent_id", null)
          .order("sort_order", { ascending: true }),
      ]);
      if (navResult.data) setTopNavRows(navResult.data as TopNavRow[]);
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
      }
      setFetching(false);
    }
    load();
  }, []);

  // HOTFIX-134 복원(사용자 지시 — "상단 탭의 1단과 2단을... 드래그앤드랍
  // 으로 각 버튼 위치를 정하는거, 그걸 원해"): EPIC-134가 GrapesJS로
  // 대체하며 지웠던 탭 좌우 순서 드래그 로직을 다시 살렸다 — 같은 단
  // 안에서 fractional order로 정렬한다.
  function tabOrderValue(tabKey: string): number {
    const explicit = topTabStyle.tabs[tabKey]?.order;
    if (explicit !== null && explicit !== undefined) return explicit;
    const naturalIndex = topNavRows.findIndex((r) => (r.key ?? r.id) === tabKey);
    return (naturalIndex === -1 ? 0 : naturalIndex) * 1000;
  }

  function updateTabStyle(tabId: string, patch: Partial<TopTabStyleEntry>) {
    setTopTabStyleValue((prev) => ({
      ...prev,
      [chromeDeviceTab]: {
        ...prev[chromeDeviceTab],
        tabs: {
          ...prev[chromeDeviceTab].tabs,
          [tabId]: { ...defaultTopTabStyleEntry(), ...prev[chromeDeviceTab].tabs[tabId], ...patch },
        },
      },
    }));
  }

  // Craft의 <Frame>은 최초 마운트 시점의 트리만 읽는다 — 탭을 드래그로
  // 재배치한 뒤에도 캔버스가 새 순서를 반영하려면 key를 바꿔 강제로
  // 리마운트해야 한다(HOTFIX-134에서 이미 검증된 패턴).
  const [tabsTreeVersion, setTabsTreeVersion] = useState(0);
  function handleTabDrop(tabKey: string, tier: 1 | 2, beforeTabKey: string | null) {
    const tabsInTier = topNavRows
      .map((r) => r.key ?? r.id)
      .filter((k) => k !== tabKey)
      .filter((k) => (topTabStyle.tabs[k]?.tier ?? 2) === tier)
      .sort((a, b) => tabOrderValue(a) - tabOrderValue(b));
    let newOrder: number;
    if (beforeTabKey && tabsInTier.includes(beforeTabKey)) {
      const idx = tabsInTier.indexOf(beforeTabKey);
      const beforeOrder = tabOrderValue(beforeTabKey);
      const prevOrder = idx > 0 ? tabOrderValue(tabsInTier[idx - 1]) : beforeOrder - 1000;
      newOrder = (prevOrder + beforeOrder) / 2;
    } else {
      const lastOrder = tabsInTier.length > 0 ? tabOrderValue(tabsInTier[tabsInTier.length - 1]) : 0;
      newOrder = lastOrder + 1000;
    }
    updateTabStyle(tabKey, { tier, order: newOrder });
    setTabsTreeVersion((v) => v + 1);
  }

  function setSidebarIcons(patch: Partial<SidebarIconsConfig>) {
    setSidebarIconsValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], ...patch } }));
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    const results = await Promise.all([
      upsertSetting("main_logo", mainLogoValue),
      upsertSetting("sidebar_icons", sidebarIconsValue),
      upsertSetting("top_tab_style", topTabStyleValue),
      upsertSetting("account_menu_style", accountMenuStyleValue),
      upsertSetting("hero_slideshow", heroSlideshowValue),
      // HOTFIX(EPIC-134 GrapesJS 폐기): unified_header_layout에 예전
      // GrapesJS 저장값이 남아있으면 Navbar.tsx가 "값이 있으면 그 값
      // 우선"이라는 EPIC-134의 폴백 규칙 때문에 계속 그 값을 쓴다 —
      // 저장할 때마다 함께 비워서 Navbar.tsx가 항상 이 화면이 방금 쓴
      // top_tab_style/account_menu_style 값을 쓰도록 보장한다.
      upsertSetting("unified_header_layout", { pc: { items: [] }, mobile: { items: [] } }),
    ]);
    const firstError = results.find((r) => r.error)?.error;
    setSaving(false);
    if (firstError) {
      setError(firstError.message);
      return;
    }
    setSavedAt(Date.now());
  }

  if (fetching) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  const SECTION_NAV: { key: "unified" | "footer"; label: string; hint: string }[] = [
    { key: "unified", label: "홈페이지 헤더 디자인", hint: "로고·사용자 메뉴·상단 탭·슬라이드쇼·사이드바 아이콘" },
    { key: "footer", label: "하단 메뉴 관리", hint: "Craft 에디터로 전체화면 편집" },
  ];

  if (activeSection === "footer") {
    if (footerLoading || (!footerPageId && !footerError)) {
      return (
        <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
          <p className="text-gray-500">하단 메뉴를 불러오는 중...</p>
        </main>
      );
    }
    if (footerError || !footerPageId) {
      return (
        <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
          <p className="text-red-600">{footerError ?? "하단 Footer 페이지를 불러오지 못했어요."}</p>
        </main>
      );
    }
    return (
      <CraftFooterEditor
        pageId={footerPageId}
        initialState={footerCraftState}
        onClose={() => setActiveSection("unified")}
        onSaved={() => loadFooter()}
      />
    );
  }

  const tier1Tabs = topNavRows
    .filter((row) => (topTabStyle.tabs[row.key ?? row.id]?.tier ?? 2) === 1)
    .sort((a, b) => tabOrderValue(a.key ?? a.id) - tabOrderValue(b.key ?? b.id));
  const tier2Tabs = topNavRows
    .filter((row) => (topTabStyle.tabs[row.key ?? row.id]?.tier ?? 2) !== 1)
    .sort((a, b) => tabOrderValue(a.key ?? a.id) - tabOrderValue(b.key ?? b.id));

  // HOTFIX(사용자 지시 — "1.메인로고 블록 2.사용자 메뉴 블록 3.상단 1/2단
  // 탭 메뉴 블록 4.슬라이드쇼 블록 5.페이지의 좌우 아이콘 블록 6.하단
  // 메뉴 블록" 순서): 실제 페이지에 렌더링되는 순서 그대로 하나의 Craft
  // 트리로 쌓는다(6번 하단 메뉴는 위에서 설명한 이유로 별도 섹션).
  const unifiedTree = (
    <Element is={RootContainer} canvas id="ROOT">
      <ChromeLogoBlock
        config={mainLogo}
        onConfigChange={(patch) => setMainLogoValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], ...patch } }))}
      />
      <ChromeAccountMenuBlock
        config={accountMenuStyle}
        onConfigChange={(patch) => setAccountMenuStyleValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], ...patch } }))}
      />
      {/* HOTFIX(Craft 트리 버그): <>...</> Fragment로 감싸면 Craft의 정적
          트리 파서가 Fragment 자체까지 노드로 해석하려다 "Invariant
          failed: ...(undefined) does not exist in the resolver"로 죽는다
          (Fragment는 .name/.displayName이 없는 Symbol이라 %node_type%가
          "undefined"로 찍힘) — 두 ChromeTierZone 호출을 감싸지 않고 각각
          독립된 조건식으로 나열해야 안전하다(HOTFIX-134 선례와 동일). */}
      {topNavRows.length > 0 &&
        ChromeTierZone({
          label: "상단 탭 — 1단",
          hint: "로고 줄과 겹치는 자리 — 칩을 드래그해 좌우 순서도 바꿀 수 있어요",
          tier: 1,
          onDropTab: handleTabDrop,
          children: tier1Tabs.map((row) => {
            const tabKey = row.key ?? row.id;
            return (
              <ChromeTopTabBlock
                key={tabKey}
                tabKey={tabKey}
                defaultLabel={row.title}
                entry={topTabStyle.tabs[tabKey] ?? defaultTopTabStyleEntry()}
                onEntryChange={(patch) => updateTabStyle(tabKey, patch)}
              />
            );
          }),
        })}
      {topNavRows.length > 0 &&
        ChromeTierZone({
          label: "상단 탭 — 2단",
          hint: "기본 탭 줄 — 칩을 드래그해 좌우 순서도 바꿀 수 있어요",
          tier: 2,
          onDropTab: handleTabDrop,
          children: tier2Tabs.map((row) => {
            const tabKey = row.key ?? row.id;
            return (
              <ChromeTopTabBlock
                key={tabKey}
                tabKey={tabKey}
                defaultLabel={row.title}
                entry={topTabStyle.tabs[tabKey] ?? defaultTopTabStyleEntry()}
                onEntryChange={(patch) => updateTabStyle(tabKey, patch)}
              />
            );
          }),
        })}
      <ChromeSlideshowBlock
        config={heroSlideshow}
        onConfigChange={(patch) => setHeroSlideshowValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], ...patch } }))}
      />
      <ChromeSidebarIconBlock side="left" config={sidebarIcons} onConfigChange={setSidebarIcons} />
      <ChromeSidebarIconBlock side="right" config={sidebarIcons} onConfigChange={setSidebarIcons} />
    </Element>
  );

  return (
    <main className="flex-1 px-8 pb-8 max-w-[1600px] mx-auto w-full">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-6">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-2">
          {SECTION_NAV.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => handleSelectSection(s.key)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                activeSection === s.key
                  ? "border-gray-800 bg-gray-900 text-white shadow"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <span className="block text-sm font-medium">{s.label}</span>
              <span className={`block text-xs ${activeSection === s.key ? "text-gray-300" : "text-gray-400"}`}>{s.hint}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ChromeDeviceToggle value={deviceMode} onChange={setDeviceMode} />
          <button type="button" onClick={handleSaveAll} disabled={saving} className={primaryButtonClass}>
            {saving ? "저장 중..." : "저장하기"}
          </button>
          {savedAt && <span className="text-xs text-green-600">저장됐어요.</span>}
        </div>
      </div>
      {deviceMode === "tablet" && (
        <p className="mb-3 text-xs text-amber-600">
          태블릿 폭은 미리보기 전용이에요 — 지금은 PC 값을 그대로 좁은 화면에서 보여줘요(태블릿 전용 값은 아직 따로 저장하지 않아요).
        </p>
      )}

      <ChromeCraftEditor key={`${chromeDeviceTab}-${tabsTreeVersion}`} tree={unifiedTree} deviceMode={deviceMode} minHeight={900} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DragValueSlider
          label="상단 탭 섹션 높이"
          hint="기본(~36px)보다 작으면 효과 없어요."
          value={topTabStyle.rowHeightPx ?? 40}
          min={16}
          max={400}
          onChange={(v) => setTopTabStyleValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], rowHeightPx: v } }))}
          allowAuto={topTabStyle.rowHeightPx !== null}
          onClearAuto={() => setTopTabStyleValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], rowHeightPx: null } }))}
        />
        <DragValueSlider
          label="1단 겹침 정도"
          hint="로고 줄 쪽으로 더 이동"
          value={topTabStyle.tier1OffsetPx}
          min={-100}
          max={200}
          onChange={(v) => setTopTabStyleValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], tier1OffsetPx: v } }))}
        />
        <DragValueSlider
          label="2단 위치 조정"
          hint="위로 이동"
          value={topTabStyle.tier2OffsetPx}
          min={-100}
          max={200}
          onChange={(v) => setTopTabStyleValue((prev) => ({ ...prev, [chromeDeviceTab]: { ...prev[chromeDeviceTab], tier2OffsetPx: v } }))}
        />
      </div>
    </main>
  );
}
