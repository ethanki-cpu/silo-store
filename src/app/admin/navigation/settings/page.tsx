"use client";

// EPIC-136(사용자 지시 — "실제 홈페이지 상단의 출력되는 모습이랑 '홈페이지
// 설정' 페이지의 모습이 다르잖아?" + "블록을 눌렀을때 왜 왼쪽에 아무런
// 설정할수 있는게 없어?" + "드래그앤 드롭으로 버튼이든, 이미지, 영상, 무슨
// 요소든지 자유롭게... 화면 안에서 마음대로 움직일수 있게 해달라"):
// EPIC-135까지는 Navbar.tsx와 별개인 "스타일 전용 복제품"(craft/chrome/
// views.tsx)을 캔버스에 그렸다 — 실제 로그인 이름 대신 placeholder 텍스트를
// 보여주는 등 필연적으로 실제 사이트와 어긋났고(그 드리프트가 이번 신고의
// 핵심 원인), 구조도 고정 슬롯이라 자유 드래그가 불가능했다. 이번엔 그
// 클론을 완전히 버리고 실제 <Navbar>를 그대로 이 화면에 렌더링한다
// (editable prop만 얹어서) — 캔버스가 곧 실제 사이트라 드리프트 자체가
// 구조적으로 불가능하고, 로그인 상태/드롭다운 메가메뉴도 실제로 동작한다.
// 각 요소(로고/탭/계정 메뉴 항목)는 Navbar.tsx 안에서 HeaderSlot으로
// 감싸져 있어 클릭하면 이 페이지의 왼쪽 패널에 설정이 뜨고, 드래그하면
// transform으로 화면 어디든 자유롭게 옮길 수 있다(headerLayoutPositions.ts
// 참고 — Craft.js는 더 이상 헤더에 쓰지 않는다).
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { primaryButtonClass } from "../shared";
import { CraftFooterEditor } from "@/components/admin/craft/CraftFooterEditor";
import { Navbar } from "@/components/Navbar";
import { uploadImage, compressImage } from "@/lib/adminImageUpload";
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
import { TAB_HOVER_MOTIONS, TAB_HOVER_MOTION_LABELS, DEFAULT_TAB_HOVER_MOTION } from "@/lib/tabHoverMotion";

const MAX_WALLPAPERS = 10;

async function upsertSetting(key: string, value: unknown) {
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
}

type Section = "header" | "slideshow" | "sidebarIcons" | "footer";

export default function AdminNavigationSettingsPage() {
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [activeSection, setActiveSection] = useState<Section>("header");

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

  function handleSelectSection(key: Section) {
    setActiveSection(key);
    if (key === "footer" && footerPageId === null && !footerLoading) {
      loadFooter();
    }
  }

  const [deviceTab, setDeviceTab] = useState<"pc" | "mobile">("pc");

  const [mainLogoValue, setMainLogoValue] = useState<MainLogoValue>(() => defaultMainLogoValue());
  const [sidebarIconsValue, setSidebarIconsValue] = useState<SidebarIconsValue>(() => defaultSidebarIconsValue());
  const [topTabStyleValue, setTopTabStyleValue] = useState<TopTabStyleValue>(() => defaultTopTabStyleValue());
  const [accountMenuStyleValue, setAccountMenuStyleValue] = useState<AccountMenuStyleValue>(() => defaultAccountMenuStyleValue());
  const [heroSlideshowValue, setHeroSlideshowValue] = useState<HeroSlideshowValue>(() => defaultHeroSlideshowValue());
  const [headerPositionsValue, setHeaderPositionsValue] = useState<HeaderPositionsValue>(() => defaultHeaderPositionsValue());

  const sidebarIcons = sidebarIconsValue[deviceTab];
  const heroSlideshow = heroSlideshowValue[deviceTab];
  const headerPositions = headerPositionsValue[deviceTab];

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["main_logo", "hero_slideshow", "sidebar_icons", "top_tab_style", "account_menu_style", "header_positions"]);
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
      }
      setFetching(false);
    }
    load();
  }, []);

  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

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
    const results = await Promise.all([
      upsertSetting("main_logo", mainLogoValue),
      upsertSetting("sidebar_icons", sidebarIconsValue),
      upsertSetting("top_tab_style", topTabStyleValue),
      upsertSetting("account_menu_style", accountMenuStyleValue),
      upsertSetting("hero_slideshow", heroSlideshowValue),
      upsertSetting("header_positions", headerPositionsValue),
      // EPIC-134 GrapesJS 폐기 잔재 — Navbar.tsx가 이 값이 남아있으면
      // 여전히 그쪽 폴백 경로를 우선하므로 항상 비워 둔다.
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

  const SECTION_NAV: { key: Section; label: string; hint: string }[] = [
    { key: "header", label: "홈페이지 헤더 디자인", hint: "로고·상단 탭·사용자 메뉴 — 실제 화면을 클릭·드래그로 편집" },
    { key: "slideshow", label: "슬라이드쇼", hint: "홈페이지 메인 슬라이드" },
    { key: "sidebarIcons", label: "사이드바 아이콘", hint: "좌우 여닫이 버튼" },
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
        onClose={() => setActiveSection("header")}
        onSaved={() => loadFooter()}
      />
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-[1600px] mx-auto w-full">
      {error && <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-6">{error}</div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">
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
          <button type="button" onClick={handleSaveAll} disabled={saving} className={primaryButtonClass}>
            {saving ? "저장 중..." : "저장하기"}
          </button>
          {savedAt && <span className="text-xs text-green-600">저장됐어요.</span>}
        </div>
      </div>

      {activeSection === "header" && (
        <div className="flex overflow-hidden rounded-lg border border-gray-200" style={{ minHeight: 700 }}>
          <div className="w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-4">
            <HeaderSlotSettingsPanel
              selectedSlotKey={selectedSlotKey}
              mainLogoValue={mainLogoValue}
              setMainLogoValue={setMainLogoValue}
              deviceTab={deviceTab}
              topTabStyleValue={topTabStyleValue}
              setTopTabStyleValue={setTopTabStyleValue}
              accountMenuStyleValue={accountMenuStyleValue}
              setAccountMenuStyleValue={setAccountMenuStyleValue}
              headerPositions={headerPositions}
              onResetOffset={resetSlotOffset}
            />
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div className={deviceTab === "mobile" ? "mx-auto w-[390px] border-x border-gray-300 bg-white shadow-lg" : "bg-white"}>
              <Navbar
                editable
                selectedSlotKey={selectedSlotKey}
                onSelectSlot={setSelectedSlotKey}
                positionsOverride={headerPositions}
                onOffsetChange={handleOffsetChange}
                deviceOverride={deviceTab}
              />
            </div>
          </div>
        </div>
      )}

      {activeSection === "slideshow" && (
        <SlideshowSection value={heroSlideshow} onChange={(patch) => setHeroSlideshowValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...patch } }))} />
      )}

      {activeSection === "sidebarIcons" && (
        <SidebarIconsSection
          value={sidebarIcons}
          onChange={(patch) => setSidebarIconsValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...patch } }))}
        />
      )}
    </main>
  );
}

// ── 헤더 캔버스 왼쪽 설정 패널 — 클릭한 요소(slotKey)에 따라 다른 필드를 보여준다.
function HeaderSlotSettingsPanel({
  selectedSlotKey,
  mainLogoValue,
  setMainLogoValue,
  deviceTab,
  topTabStyleValue,
  setTopTabStyleValue,
  accountMenuStyleValue,
  setAccountMenuStyleValue,
  headerPositions,
  onResetOffset,
}: {
  selectedSlotKey: string | null;
  mainLogoValue: MainLogoValue;
  setMainLogoValue: React.Dispatch<React.SetStateAction<MainLogoValue>>;
  deviceTab: "pc" | "mobile";
  topTabStyleValue: TopTabStyleValue;
  setTopTabStyleValue: React.Dispatch<React.SetStateAction<TopTabStyleValue>>;
  accountMenuStyleValue: AccountMenuStyleValue;
  setAccountMenuStyleValue: React.Dispatch<React.SetStateAction<AccountMenuStyleValue>>;
  headerPositions: { slots: Record<string, HeaderSlotOffset> };
  onResetOffset: (slotKey: string) => void;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);

  if (!selectedSlotKey) {
    return <p className="text-xs text-gray-400">캔버스에서 요소를 클릭하면 설정이 여기 표시됩니다.</p>;
  }

  const offset = headerPositions.slots[selectedSlotKey];
  const positionSection = (
    <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
      <p className="text-xs font-semibold text-gray-500">위치</p>
      <p className="text-[11px] leading-relaxed text-gray-400">
        선택된 요소 위의 ✥ 핸들을 캔버스에서 직접 드래그해 화면 어디로든 옮기세요.
      </p>
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
          <select
            value={mainLogo.type}
            onChange={(e) => patchLogo({ type: e.target.value as "text" | "image" })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          >
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
          <input
            type="number"
            value={mainLogo.heightPx}
            onChange={(e) => patchLogo({ heightPx: Number(e.target.value) || DEFAULT_LOGO_HEIGHT_PX })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
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
                <button
                  type="button"
                  onClick={() => patchLogo({ customFonts: mainLogo.customFonts.filter((f) => f.id !== font.id) })}
                  className="text-[11px] text-red-500 hover:underline"
                >
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
    function patchTab(patch: Partial<typeof entry>) {
      setTopTabStyleValue((prev) => ({
        ...prev,
        [deviceTab]: { ...prev[deviceTab], tabs: { ...prev[deviceTab].tabs, [tabKey]: { ...entry, ...patch } } },
      }));
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">상단 탭</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">표시 텍스트(비우면 원래 이름)</span>
          <input value={entry.labelOverride} onChange={(e) => patchTab({ labelOverride: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
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
          <select
            value={entry.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION}
            onChange={(e) => patchTab({ hoverMotion: e.target.value as typeof entry.hoverMotion })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          >
            {TAB_HOVER_MOTIONS.map((m) => (
              <option key={m} value={m}>{TAB_HOVER_MOTION_LABELS[m]}</option>
            ))}
          </select>
        </label>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey.startsWith("account:")) {
    const accountMenuStyle = accountMenuStyleValue[deviceTab];
    function patchAccount(patch: Partial<typeof accountMenuStyle>) {
      setAccountMenuStyleValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...patch } }));
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">사용자 메뉴</p>
        <p className="text-[11px] text-gray-400">관리자 / 회원 등급 / 마이페이지 / 회원 이름 / 로그아웃 5개 항목 전체에 함께 적용돼요(위치는 항목별로 따로 옮길 수 있어요).</p>
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
          <select
            value={accountMenuStyle.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION}
            onChange={(e) => patchAccount({ hoverMotion: e.target.value as typeof accountMenuStyle.hoverMotion })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          >
            {TAB_HOVER_MOTIONS.map((m) => (
              <option key={m} value={m}>{TAB_HOVER_MOTION_LABELS[m]}</option>
            ))}
          </select>
        </label>
        {positionSection}
      </div>
    );
  }

  return positionSection;
}

// ── 슬라이드쇼 섹션(단순 폼 — 캔버스 아님, 홈페이지 본문 요소라 Navbar 편집 화면과는 별개)
function SlideshowSection({
  value,
  onChange,
}: {
  value: HeroSlideshowValue["pc"];
  onChange: (patch: Partial<HeroSlideshowValue["pc"]>) => void;
}) {
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);
  const [uploadingWallpaperIdx, setUploadingWallpaperIdx] = useState<number | null>(null);

  function addSlide() {
    onChange({ slides: [...value.slides, { imageUrl: "", title: "", description: "" }] });
  }
  function updateSlide(index: number, patch: Partial<SlideItem>) {
    onChange({ slides: value.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  }
  function removeSlide(index: number) {
    onChange({ slides: value.slides.filter((_, i) => i !== index) });
  }
  async function handleSlideFile(index: number, file: File | null) {
    if (!file) return;
    setUploadingSlideIdx(index);
    const { url } = await uploadImage(file, "slides");
    setUploadingSlideIdx(null);
    if (url) updateSlide(index, { imageUrl: url });
  }
  function addWallpaper() {
    if (value.wallpaperUrls.length >= MAX_WALLPAPERS) return;
    onChange({ wallpaperUrls: [...value.wallpaperUrls, ""] });
  }
  function removeWallpaper(index: number) {
    onChange({ wallpaperUrls: value.wallpaperUrls.filter((_, i) => i !== index) });
  }
  async function handleWallpaperFile(index: number, file: File | null) {
    if (!file) return;
    setUploadingWallpaperIdx(index);
    const compressed = await compressImage(file, value.wallpaperQuality);
    const { url } = await uploadImage(compressed, "wallpaper");
    setUploadingWallpaperIdx(null);
    if (url) onChange({ wallpaperUrls: value.wallpaperUrls.map((u, i) => (i === index ? url : u)) });
  }

  return (
    <section className="max-w-2xl rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-semibold">슬라이드쇼</h2>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">슬라이드 ({value.slides.length}개)</p>
        {value.slides.map((slide, idx) => (
          <div key={idx} className="space-y-1 rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">#{idx + 1}</span>
              <button type="button" onClick={() => removeSlide(idx)} className="text-xs text-red-500 hover:underline">삭제</button>
            </div>
            <input type="file" accept="image/*" disabled={uploadingSlideIdx === idx} onChange={(e) => handleSlideFile(idx, e.target.files?.[0] ?? null)} className="w-full text-xs" />
            <input value={slide.title} placeholder="제목(선택)" onChange={(e) => updateSlide(idx, { title: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            <input value={slide.description} placeholder="설명(선택)" onChange={(e) => updateSlide(idx, { description: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          </div>
        ))}
        <button type="button" onClick={addSlide} className="w-full rounded border border-gray-300 py-1.5 text-sm text-gray-600 hover:bg-gray-50">+ 슬라이드 추가</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">섹션 높이(vh, 비우면 자동)</span>
          <input type="number" value={value.heightVh ?? ""} onChange={(e) => onChange({ heightVh: e.target.value ? Number(e.target.value) : null })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">자동 전환(초)</span>
          <input type="number" value={value.autoAdvanceSeconds} onChange={(e) => onChange({ autoAdvanceSeconds: Number(e.target.value) || 5 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">이미지 맞춤</span>
          <select value={value.objectFit} onChange={(e) => onChange({ objectFit: e.target.value as "cover" | "contain" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="cover">꽉 채우기(cover)</option>
            <option value="contain">전체 보이기(contain)</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">위 여백(px)</span>
          <input type="number" value={value.marginTopPx} onChange={(e) => onChange({ marginTopPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">아래 여백(px)</span>
          <input type="number" value={value.marginBottomPx} onChange={(e) => onChange({ marginBottomPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">좌 여백(px)</span>
          <input type="number" value={value.marginLeftPx} onChange={(e) => onChange({ marginLeftPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">우 여백(px)</span>
          <input type="number" value={value.marginRightPx} onChange={(e) => onChange({ marginRightPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
      </div>

      {value.objectFit === "contain" && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-600">여백 배경 이미지 ({value.wallpaperUrls.length}/{MAX_WALLPAPERS})</p>
          {value.wallpaperUrls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input type="file" accept="image/*" disabled={uploadingWallpaperIdx === idx} onChange={(e) => handleWallpaperFile(idx, e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs" />
              <button type="button" onClick={() => removeWallpaper(idx)} className="shrink-0 text-xs text-red-500 hover:underline">삭제</button>
            </div>
          ))}
          {value.wallpaperUrls.length < MAX_WALLPAPERS && (
            <button type="button" onClick={addWallpaper} className="w-full rounded border border-gray-300 py-1.5 text-sm text-gray-600 hover:bg-gray-50">+ 배경 이미지 추가</button>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">압축 품질(%)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={value.wallpaperQuality}
              onChange={(e) => onChange({ wallpaperQuality: Math.max(1, Math.min(100, Number(e.target.value) || 100)) })}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          </label>
        </div>
      )}
    </section>
  );
}

// ── 사이드바 아이콘 섹션(단순 폼 — 좌우 고정 2개, 화면 가장자리에 fixed로 뜨는 트리거라 헤더 캔버스와는 별개)
function SidebarIconsSection({
  value,
  onChange,
}: {
  value: SidebarIconsValue["pc"];
  onChange: (patch: Partial<SidebarIconsValue["pc"]>) => void;
}) {
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  async function handleFile(field: "leftIconDefaultUrl" | "leftIconHoverUrl" | "rightIconDefaultUrl" | "rightIconHoverUrl", file: File | null) {
    if (!file) return;
    setUploadingField(field);
    const { url } = await uploadImage(file, "sidebar_icons");
    setUploadingField(null);
    if (url) onChange({ [field]: url } as Partial<SidebarIconsValue["pc"]>);
  }

  return (
    <section className="max-w-2xl rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-semibold">사이드바 아이콘</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(["left", "right"] as const).map((side) => {
          const defaultField = side === "left" ? "leftIconDefaultUrl" : "rightIconDefaultUrl";
          const hoverField = side === "left" ? "leftIconHoverUrl" : "rightIconHoverUrl";
          return (
            <div key={side} className="space-y-2">
              <p className="text-sm font-medium text-gray-600">{side === "left" ? "좌측" : "우측"} 아이콘</p>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">기본 이미지/영상 {uploadingField === defaultField && "(업로드 중...)"}</span>
                <input type="file" accept="image/*,video/webm,video/mp4" onChange={(e) => handleFile(defaultField, e.target.files?.[0] ?? null)} disabled={uploadingField !== null} className="w-full text-xs" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">호버 이미지/영상 {uploadingField === hoverField && "(업로드 중...)"}</span>
                <input type="file" accept="image/*,video/webm,video/mp4" onChange={(e) => handleFile(hoverField, e.target.files?.[0] ?? null)} disabled={uploadingField !== null} className="w-full text-xs" />
              </label>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">아이콘 크기(px, 좌우 공통)</span>
          <input type="number" value={value.iconSizePx || DEFAULT_ICON_SIZE_PX} onChange={(e) => onChange({ iconSizePx: Number(e.target.value) || DEFAULT_ICON_SIZE_PX })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">여닫이 방식(좌우 공통)</span>
          <select value={value.triggerMode} onChange={(e) => onChange({ triggerMode: e.target.value as "click" | "hover" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="click">클릭해야 열림</option>
            <option value="hover">마우스를 올리면 바로 열림</option>
          </select>
        </label>
      </div>
    </section>
  );
}
