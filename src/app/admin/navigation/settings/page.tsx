"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inputClass, primaryButtonClass, smallButtonClass } from "../shared";
import { LivePreviewFrame } from "@/components/admin/LivePreviewFrame";
import { DragValueSlider } from "@/components/admin/DragValueSlider";
import { CraftFooterEditor } from "@/components/admin/craft/CraftFooterEditor";
import { ChromeCraftEditor } from "@/components/admin/craft/ChromeCraftEditor";
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { ChromeLogoBlock } from "@/components/craft/chrome/blocks/ChromeLogoBlock";
import { ChromeSidebarIconBlock } from "@/components/craft/chrome/blocks/ChromeSidebarIconBlock";
import { ChromeTopTabBlock } from "@/components/craft/chrome/blocks/ChromeTopTabBlock";
import { ChromeAccountMenuBlock } from "@/components/craft/chrome/blocks/ChromeAccountMenuBlock";
import { uploadImage, compressImage } from "@/lib/adminImageUpload";
import {
  TAB_HOVER_MOTIONS,
  TAB_HOVER_MOTION_LABELS,
  DEFAULT_TAB_HOVER_MOTION,
  type TabHoverMotion,
} from "@/lib/tabHoverMotion";
import {
  normalizeHeroSlideshow,
  defaultHeroSlideshowValue,
  defaultHeroSlideshowConfig,
  type SlideItem,
  type HeroSlideshowConfig,
  type HeroSlideshowValue,
} from "@/lib/heroSlideshow";
import {
  normalizeMainLogo,
  defaultMainLogoValue,
  DEFAULT_LOGO_HEIGHT_PX,
  DEFAULT_LOGO_FONT_SIZE_PX,
  DEFAULT_LOGO_TEXT_COLOR,
  type CustomFontEntry,
  type MainLogoConfig,
  type MainLogoValue,
} from "@/lib/mainLogoSettings";
import {
  normalizeSidebarIcons,
  defaultSidebarIconsValue,
  DEFAULT_ICON_SIZE_PX,
  DEFAULT_ICON_BG_COLOR,
  DEFAULT_TOP_OFFSET_PX,
  type SidebarIconsConfig,
  type SidebarIconsValue,
} from "@/lib/sidebarIconsSettings";
import {
  normalizeTopTabStyle,
  defaultTopTabStyleValue,
  defaultTopTabStyleEntry,
  type TopTabStyleEntry,
  type TopTabStyleConfig,
  type TopTabStyleValue,
} from "@/lib/topTabStyleSettings";
import {
  normalizeAccountMenuStyle,
  defaultAccountMenuStyleValue,
  type AccountMenuStyleConfig,
  type AccountMenuStyleValue,
} from "@/lib/accountMenuStyleSettings";
import { MotionPreviewSamples } from "@/components/admin/MotionPreviewSamples";

// EPIC-026: "홈페이지 설정 관리" 실 구현. site_settings(key-value, EPIC-026)의
// 키(main_logo/hero_slideshow/sidebar_icons)를 조회/저장한다. 다른 CMS
// 페이지들과 동일하게 별도 API Route 없이 브라우저에서 anon key + RLS
// (admin bypass)로 직접 CUD한다.
//
// EPIC-078 후속 3차: "노출 필터(홈 큐레이션)"(home_curation, EPIC-041에서
// 블록 배열로 고도화됐던 기능)는 홈페이지가 이제 Page Builder 위젯으로
// 직접 관리되어(EPIC-067) 더 이상 필요 없다는 요청으로 완전히 삭제 —
// 이 파일의 상태/핸들러/렌더링, page.tsx의 조회/렌더링,
// HomeCurationSlider.tsx 컴포넌트 전부 제거. 기존에 저장된
// site_settings.home_curation DB 행 자체는 지우지 않았다(더 이상 아무 코드도
// 읽지 않는 비활성 데이터로 남음).
//
// EPIC-033: 이미지 URL 텍스트 입력 옆에 파일 업로드를 추가 — 선택 시
// Supabase Storage("public-assets" 버킷)에 즉시 업로드하고 반환된 public
// URL을 그대로 URL 입력값으로 채운다(URL 직접 입력도 계속 fallback으로
// 남겨둠). 로고 높이(px)/슬라이드 자동 전환 시간(초)/이미지 채움 방식도
// 이번 EPIC에서 추가 — Navbar.tsx/HeroSlideshow.tsx가 이 값을 읽어 적용한다.
//
// EPIC-034: main_logo에 정렬 위치(align)/로고 옆 추가 텍스트(extraText)/
// 텍스트 서체·굵기·크기(fontFamily/bold/fontSizePx)를 추가. 기존 필드와
// 마찬가지로 site_settings.setting_value(jsonb) 안에 병합해서 저장한다.
//
// EPIC-034-Ext: align(로고 자체의 헤더 내 정렬)과는 별개로, "추가 텍스트가
// 로고의 좌/우 어느 쪽에 붙는지"를 정하는 textPosition을 추가. 서체는
// EPIC-034의 자유 입력 fontFamily를 대체하지 않고, 미리 정의된 커스텀
// 폰트(Graphire/Primor) 중 선택하는 textCustomFont로 보완 — "기본"이면
// 기존 fontFamily 자유 입력값을 그대로 쓰고, Graphire/Primor를 고르면
// 그 폰트명이 우선 적용된다(globals.css의 @font-face 뼈대 참고).
//
// EPIC-036: main_logo에 추가 텍스트 색상(textColor)을 추가 — 기본값은
// Navbar.tsx 사이드바에 쓰이는 짙은 녹색(Tailwind green-800, #166534)과
// 맞춰둔다. hero_slideshow에는 슬라이드가 objectFit="contain"일 때 생기는
// 여백을 채울 배경 이미지(wallpaperUrl)를 추가 — 로고/슬라이드 이미지와
// 동일한 uploadImage()/public-assets 버킷 업로드 로직을 재사용한다.
//
// EPIC-039: main_logo의 단일 extraText+textPosition을 leftText/rightText로
// 분리 — 로고 이미지를 중앙에 두고 양옆에 대칭으로 텍스트를 배치하기 위함.
// align(로고 정렬 위치)은 이 대칭 레이아웃과 함께 쓰기엔 의미가 겹쳐 UI에서
// 제거했고(중앙 고정), 기존 데이터 호환을 위해 타입/기본값에는 남겨둔다.
// 기존에 extraText+textPosition으로 저장돼 있던 값은 로드 시 1회 자동으로
// leftText 또는 rightText로 옮겨준다(아래 load() 참고).
// hero_slideshow.wallpaperUrl(단일 문자열)은 wallpaperUrls(문자열 배열,
// 최대 10개)로 교체 — HeroSlideshow.tsx가 매 슬라이드 전환마다 이 배열
// 중 하나를 무작위로 골라 배경으로 쓴다. 기존 단일 값은 로드 시 배열의
// 첫 항목으로 자동 이전된다.
// 새 site_settings 키 "sidebar_icons"(leftIconUrl/rightIconUrl) 추가 —
// Navbar의 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘 이미지.
//
// EPIC-041: main_logo에 커스텀 폰트 파일 업로드(fontFileUrl, .woff/.ttf 등)
// 추가 — Navbar.tsx가 이 URL이 있으면 @font-face를 동적으로 주입해 좌/우
// 텍스트에 최우선으로 적용한다(textCustomFont/fontFamily보다 우선).
// sidebar_icons에 아이콘 크기(iconSizePx) 추가 — 기본값은 기존 하드코딩
// 크기였던 32px(w-8 h-8)와 맞춘다.
// home_curation을 단일 설정에서 "블록" 배열(HomeCurationBlock[])로
// 고도화 — 섹션 제목(title)을 추가하고, 여러 큐레이션 섹션을 추가/삭제/
// 순서 변경(위/아래)할 수 있게 했다. 구버전 단일 객체 데이터는 로드 시
// 블록 1개짜리 배열로 자동 이전한다.
//
// EPIC-041-042-HOTFIX: fontFileUrl/sidebar_icons(leftIconUrl/rightIconUrl)는
// 파일 업로드(input type="file" + Storage 업로드) 대신 URL을 직접 붙여넣는
// 텍스트 입력으로 되돌렸다 — 가장 단순하고 확실한 방식을 우선한다. 로고
// 이미지/슬라이드/Wallpaper 이미지는 계속 파일 업로드를 쓴다(대상 아님).
//
// EPIC-043: 실제로 동작하지 않던(폰트 파일이 없는) "텍스트 폰트"
// select(textCustomFont: Graphire/Primor)를 완전히 삭제. 단일 fontFileUrl도
// customFonts(배열, 각 항목에 url+isActive)로 교체 — 여러 폰트를 등록해두고
// 필요한 것만 켜고 끌 수 있다. Navbar.tsx는 isActive인 항목들을 순서대로
// @font-face 주입 + font-family fallback 체인으로 연결한다(먼저 켜진
// 폰트가 우선). 구버전 단일 fontFileUrl은 로드 시 1개짜리 배열로 이전.

type TopNavRow = { id: string; key: string | null; title: string; sort_order: number };

const MAX_WALLPAPERS = 10;

function makeDefaultCustomFont(): CustomFontEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: "",
    isActive: true,
  };
}

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
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // HOTFIX(사용자 지시 — "각 섹션 별... 설정들을, 섹션을 클릭하면 수정할
  // 수 있는 사이드바가 왼쪽에 뜨게 하고, 오른쪽에 데스크탑과 모바일
  // 프리뷰가 더 크게 뜨게 해"): 4개 섹션을 전부 세로로 쌓아 보여주던
  // 것에서, 좌측 섹션 목록 → 클릭한 섹션 하나만 편집 폼으로 보여주는
  // 구조로 전환 — 나머지 폭을 우측 프리뷰에 더 크게 내줄 수 있다.
  const [activeSection, setActiveSection] = useState<
    "logo" | "slideshow" | "sidebarIcons" | "topTabs" | "accountMenu" | "footer"
  >("logo");

  // HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 '하단메뉴관리'를 병합해줘"):
  // /admin/footer/page.tsx와 동일한 로드/생성 로직 — footer는 URL을 가진
  // 실제 페이지가 아니라 page_builder(slug="footer") 행 하나만 쓰는
  // 전역 레이아웃 조각이라 그대로 재사용한다. 처음 "하단 메뉴" 섹션을
  // 클릭했을 때만(lazy) 불러온다.
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

  function handleSelectSection(key: typeof activeSection) {
    setActiveSection(key);
    if (key === "footer" && footerPageId === null && !footerLoading) {
      loadFooter();
    }
  }

  // HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
  // 설정'이 따로 구분이 되게 해야지"): 메인 로고/사이드바 아이콘/상단 탭
  // 디자인 셋 다 PC/모바일 버전을 독립적으로 편집한다 — heroSlideshow의
  // heroTab과 같은 원리지만 세 섹션이 함께 쓰는 토글 하나
  // (chromeDeviceTab)다. 아래 mainLogo/sidebarIcons/topTabStyle은 "지금
  // 고른 기기의 값"이라 이후 코드는 이전과 동일하게 mainLogo.text처럼
  // 읽고 setMainLogo(newConfig)로 쓸 수 있다 — 실제로는 바로 아래 shim
  // 함수가 mainLogoValue[chromeDeviceTab]에 쓰고, 저장할 때만
  // mainLogoValue 전체({pc,mobile})를 내보낸다.
  const [chromeDeviceTab, setChromeDeviceTab] = useState<"pc" | "mobile">("pc");

  const [mainLogoValue, setMainLogoValue] = useState<MainLogoValue>(defaultMainLogoValue());
  const mainLogo = mainLogoValue[chromeDeviceTab];
  function setMainLogo(next: MainLogoConfig | ((prev: MainLogoConfig) => MainLogoConfig)) {
    setMainLogoValue((prev) => ({
      ...prev,
      [chromeDeviceTab]: typeof next === "function" ? (next as (p: MainLogoConfig) => MainLogoConfig)(prev[chromeDeviceTab]) : next,
    }));
  }

  const [heroSlideshow, setHeroSlideshow] = useState<HeroSlideshowValue>(
    defaultHeroSlideshowValue(),
  );
  // EPIC-092(요구사항 7): "PC 버전"/"모바일 버전" 탭 — admin/payments의
  // useState<"pending"|"all"> 탭 토글과 동일한 패턴.
  const [heroTab, setHeroTab] = useState<"pc" | "mobile">("pc");
  const activeHero = heroSlideshow[heroTab];
  function updateActiveHero(patch: Partial<HeroSlideshowConfig>) {
    setHeroSlideshow((prev) => ({ ...prev, [heroTab]: { ...prev[heroTab], ...patch } }));
  }

  // EPIC-118(사용자 지시): 손으로 흉내 낸 가짜 미리보기(MobilePreviewFrame)
  // 대신 실제 홈페이지("/")를 iframe으로 띄우는 진짜 미리보기로 교체 —
  // 저장 성공 시(각 섹션 handleSave)마다 이 값을 올려 iframe을 새로
  // 불러온다(LivePreviewFrame.tsx의 key prop이 이 값을 그대로 씀).
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const [sidebarIconsValue, setSidebarIconsValue] = useState<SidebarIconsValue>(defaultSidebarIconsValue());
  const sidebarIcons = sidebarIconsValue[chromeDeviceTab];
  function setSidebarIcons(next: SidebarIconsConfig | ((prev: SidebarIconsConfig) => SidebarIconsConfig)) {
    setSidebarIconsValue((prev) => ({
      ...prev,
      [chromeDeviceTab]: typeof next === "function" ? (next as (p: SidebarIconsConfig) => SidebarIconsConfig)(prev[chromeDeviceTab]) : next,
    }));
  }

  const [topTabStyleValue, setTopTabStyleValue] = useState<TopTabStyleValue>(defaultTopTabStyleValue());
  const topTabStyle = topTabStyleValue[chromeDeviceTab];
  function setTopTabStyle(next: TopTabStyleConfig | ((prev: TopTabStyleConfig) => TopTabStyleConfig)) {
    setTopTabStyleValue((prev) => ({
      ...prev,
      [chromeDeviceTab]: typeof next === "function" ? (next as (p: TopTabStyleConfig) => TopTabStyleConfig)(prev[chromeDeviceTab]) : next,
    }));
  }

  // HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 맨 위의 '관리자, (회원
  // 등급), 마이페이지, (사용자이름), 로그아웃' 이런 메뉴의 디자인을
  // 설정하는 또다른 탭을 만들어줘"): topTabStyle과 동일한 shim 패턴.
  const [accountMenuStyleValue, setAccountMenuStyleValue] = useState<AccountMenuStyleValue>(defaultAccountMenuStyleValue());
  const accountMenuStyle = accountMenuStyleValue[chromeDeviceTab];
  function setAccountMenuStyle(next: AccountMenuStyleConfig | ((prev: AccountMenuStyleConfig) => AccountMenuStyleConfig)) {
    setAccountMenuStyleValue((prev) => ({
      ...prev,
      [chromeDeviceTab]: typeof next === "function" ? (next as (p: AccountMenuStyleConfig) => AccountMenuStyleConfig)(prev[chromeDeviceTab]) : next,
    }));
  }

  const [topNavRows, setTopNavRows] = useState<TopNavRow[]>([]);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(
    null,
  );
  const [uploadingWallpaperIdx, setUploadingWallpaperIdx] = useState<
    number | null
  >(null);
  // EPIC-078: 좌/우 x 기본/호버 4개 업로드 슬롯 중 지금 업로드 중인 것.
  const [uploadingSidebarIconField, setUploadingSidebarIconField] = useState<
    keyof Pick<
      SidebarIconsConfig,
      "leftIconDefaultUrl" | "leftIconHoverUrl" | "rightIconDefaultUrl" | "rightIconHoverUrl"
    > | null
  >(null);

  useEffect(() => {
    async function load() {
      const [{ data, error: fetchError }, navResult] = await Promise.all([
        supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .in("setting_key", [
            "main_logo",
            "hero_slideshow",
            "sidebar_icons",
            "top_tab_style",
            "account_menu_style",
          ]),
        // EPIC-079-PHASE-4: 상단 탭 디자인 섹션이 편집 대상 목록으로 보여줄
        // 실제 최상위(depth 0) site_navigations 행 — "사이트 구성 관리"가
        // 이미 쓰는 것과 동일한 SSoT(제목/순서), 여기서는 읽기 전용으로만 쓴다.
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
        // HOTFIX(사용자 지시 — PC/모바일 분리): 옛 flat 모양이든 새
        // { pc, mobile } 모양이든 각 normalize*() 함수가 한 번에
        // 처리한다(라이브 데이터 back-compat) — heroSlideshow와 동일한 패턴.
        if (row.setting_key === "main_logo") {
          setMainLogoValue(normalizeMainLogo(row.setting_value));
        } else if (row.setting_key === "hero_slideshow") {
          setHeroSlideshow(normalizeHeroSlideshow(row.setting_value));
        } else if (row.setting_key === "sidebar_icons") {
          setSidebarIconsValue(normalizeSidebarIcons(row.setting_value));
        } else if (row.setting_key === "top_tab_style") {
          setTopTabStyleValue(normalizeTopTabStyle(row.setting_value));
        } else if (row.setting_key === "account_menu_style") {
          setAccountMenuStyleValue(normalizeAccountMenuStyle(row.setting_value));
        }
      }
      setFetching(false);
    }

    load();
  }, []);

  async function handleSave(key: string, value: unknown) {
    setError(null);
    setSavedKey(null);
    const { error: saveError } = await upsertSetting(key, value);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSavedKey(key);
    // EPIC-118: 저장이 실제로 반영된 뒤 미리보기 iframe을 새로 불러온다
    // (LivePreviewFrame의 key prop이 이 값을 그대로 씀 — 값이 바뀌면
    // React가 iframe을 통째로 새로 마운트해 최신 페이지를 다시 불러온다).
    setPreviewRefreshKey((k) => k + 1);
  }

  function addSlide() {
    updateActiveHero({ slides: [...activeHero.slides, { imageUrl: "", title: "", description: "" }] });
  }

  function updateSlide(index: number, patch: Partial<SlideItem>) {
    updateActiveHero({ slides: activeHero.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  }

  function removeSlide(index: number) {
    updateActiveHero({ slides: activeHero.slides.filter((_, i) => i !== index) });
  }

  async function handleLogoFileChange(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    const { url, error: uploadError } = await uploadImage(file, "main_logo");
    setUploadingLogo(false);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    setMainLogo((prev) => ({ ...prev, type: "image", imageUrl: url }));
  }

  // EPIC-078: 사이드바 아이콘 4개 슬롯(좌/우 x 기본/호버) 공용 업로드
  // 핸들러 — uploadImage()는 파일 종류를 가리지 않으므로 이미지/비디오
  // 모두 그대로 재사용한다.
  async function handleSidebarIconFileChange(
    field: "leftIconDefaultUrl" | "leftIconHoverUrl" | "rightIconDefaultUrl" | "rightIconHoverUrl",
    file: File | null,
  ) {
    if (!file) return;
    setUploadingSidebarIconField(field);
    setError(null);
    const { url, error: uploadError } = await uploadImage(file, "sidebar_icons");
    setUploadingSidebarIconField(null);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    setSidebarIcons((prev) => ({ ...prev, [field]: url }));
  }

  async function handleSlideFileChange(index: number, file: File | null) {
    if (!file) return;
    setUploadingSlideIdx(index);
    setError(null);
    const { url, error: uploadError } = await uploadImage(file, "slides");
    setUploadingSlideIdx(null);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    updateSlide(index, { imageUrl: url });
  }

  function addWallpaper() {
    if (activeHero.wallpaperUrls.length >= MAX_WALLPAPERS) return;
    updateActiveHero({ wallpaperUrls: [...activeHero.wallpaperUrls, ""] });
  }

  function updateWallpaper(index: number, url: string) {
    updateActiveHero({ wallpaperUrls: activeHero.wallpaperUrls.map((u, i) => (i === index ? url : u)) });
  }

  function removeWallpaper(index: number) {
    updateActiveHero({ wallpaperUrls: activeHero.wallpaperUrls.filter((_, i) => i !== index) });
  }

  async function handleWallpaperFileChange(index: number, file: File | null) {
    if (!file) return;
    setUploadingWallpaperIdx(index);
    setError(null);
    const compressed = await compressImage(file, activeHero.wallpaperQuality);
    const { url, error: uploadError } = await uploadImage(compressed, "wallpaper");
    setUploadingWallpaperIdx(null);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    updateWallpaper(index, url);
  }

  function addCustomFont() {
    setMainLogo((prev) => ({
      ...prev,
      customFonts: [...prev.customFonts, makeDefaultCustomFont()],
    }));
  }

  function updateCustomFont(id: string, patch: Partial<CustomFontEntry>) {
    setMainLogo((prev) => ({
      ...prev,
      customFonts: prev.customFonts.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    }));
  }

  function removeCustomFont(id: string) {
    setMainLogo((prev) => ({
      ...prev,
      customFonts: prev.customFonts.filter((f) => f.id !== id),
    }));
  }

  // EPIC-079-PHASE-4: 상단 탭 디자인 — tabId(row.key ?? row.id)별로 독립된
  // TopTabStyleEntry를 갖는다. 아직 한 번도 편집 안 한 탭은 topTabStyle.tabs에
  // 키 자체가 없으므로, patch할 때 defaultTopTabStyleEntry()로 채워 넣는다.
  function updateTabStyle(tabId: string, patch: Partial<TopTabStyleEntry>) {
    setTopTabStyle((prev) => ({
      ...prev,
      tabs: {
        ...prev.tabs,
        [tabId]: { ...defaultTopTabStyleEntry(), ...prev.tabs[tabId], ...patch },
      },
    }));
  }

  function addTabCustomFont(tabId: string) {
    const entry = topTabStyle.tabs[tabId] ?? defaultTopTabStyleEntry();
    updateTabStyle(tabId, { customFonts: [...entry.customFonts, makeDefaultCustomFont()] });
  }

  function updateTabCustomFont(tabId: string, fontId: string, patch: Partial<CustomFontEntry>) {
    const entry = topTabStyle.tabs[tabId] ?? defaultTopTabStyleEntry();
    updateTabStyle(tabId, {
      customFonts: entry.customFonts.map((f) => (f.id === fontId ? { ...f, ...patch } : f)),
    });
  }

  function removeTabCustomFont(tabId: string, fontId: string) {
    const entry = topTabStyle.tabs[tabId] ?? defaultTopTabStyleEntry();
    updateTabStyle(tabId, { customFonts: entry.customFonts.filter((f) => f.id !== fontId) });
  }

  if (fetching) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  const SECTION_NAV: { key: typeof activeSection; label: string; hint: string }[] = [
    { key: "logo", label: "메인 로고", hint: "로고 이미지/텍스트, 좌우 문구" },
    { key: "slideshow", label: "슬라이드쇼", hint: "홈페이지 히어로 슬라이드" },
    { key: "sidebarIcons", label: "사이드바 아이콘", hint: "좌/우 여닫이 버튼 아이콘" },
    { key: "topTabs", label: "상단 탭 디자인", hint: "탭 배치·서체·hover 모션" },
    { key: "accountMenu", label: "사용자 메뉴 디자인", hint: "관리자·등급·마이페이지·이름·로그아웃" },
    { key: "footer", label: "하단 메뉴 관리", hint: "Craft 에디터로 전체화면 편집" },
  ];

  // HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 '하단메뉴관리'를 병합해줘"):
  // Footer는 이미 자체 Craft 에디터가 fixed 전체화면 오버레이라(원래
  // /admin/footer 페이지가 그것만 렌더링했음) 나머지 3단 레이아웃 대신
  // 그 에디터 하나로 화면 전체를 교체한다 — 닫으면 이 페이지의 "메인
  // 로고" 섹션으로 돌아간다(원래는 /admin/site-structure로 이동했었음).
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
        onClose={() => setActiveSection("logo")}
        onSaved={() => loadFooter()}
      />
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-[1600px] mx-auto w-full">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* HOTFIX: 좌측 섹션 목록(WYSIWYG 빌더의 "레이어 패널" 느낌) → 클릭한
          섹션의 편집 폼 → 우측 더 큰 실시간 PC/모바일 프리뷰, 3단 구성.
          xl 미만(좁은 화면)에서는 프리뷰를 숨겨 폼 입력 공간을 우선한다. */}
      <div className="flex items-start gap-6">
        <nav className="sticky top-6 w-[190px] shrink-0 space-y-1">
          {SECTION_NAV.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => handleSelectSection(s.key)}
              className={`block w-full rounded-lg border px-3 py-2 text-left transition ${
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

        <div className="min-w-0 flex-1 space-y-8">
        {/* HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과
            '모바일 설정'이 따로 구분이 되게 해야지"): 메인 로고/사이드바
            아이콘/상단 탭 디자인 셋 다 이 토글 하나를 공유한다 —
            슬라이드쇼는 이미 자기 자신만의 PC/모바일 탭이 있어(heroTab)
            대상이 아니고, 하단 메뉴는 Craft 전체화면 에디터라 별개다. */}
        {(activeSection === "logo" || activeSection === "sidebarIcons" || activeSection === "topTabs" || activeSection === "accountMenu") && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
            <span className="text-xs text-gray-500">지금 편집 중:</span>
            <div className="flex items-center rounded-md border border-gray-300 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setChromeDeviceTab("pc")}
                className={`rounded px-3 py-1 ${chromeDeviceTab === "pc" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                🖥️ PC 설정
              </button>
              <button
                type="button"
                onClick={() => setChromeDeviceTab("mobile")}
                className={`rounded px-3 py-1 ${chromeDeviceTab === "mobile" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                📱 모바일 설정
              </button>
            </div>
            <span className="text-xs text-gray-400">PC와 모바일이 서로 다른 값을 가질 수 있어요.</span>
          </div>
        )}
        {/* 메인 로고 */}
        {activeSection === "logo" && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">메인 로고</h2>
          <div className="mb-4">
            <p className="mb-2 text-xs text-gray-500">🎨 아래 미리보기에서 로고를 직접 클릭하면 바로 편집할 수 있어요.</p>
            <ChromeCraftEditor
              key={chromeDeviceTab}
              tree={
                <Element is={RootContainer} canvas id="ROOT">
                  <ChromeLogoBlock
                    config={mainLogo}
                    onConfigChange={(patch) => setMainLogo((prev) => ({ ...prev, ...patch }))}
                  />
                </Element>
              }
            />
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-sm mb-1">텍스트 로고</label>
              <input
                className={inputClass}
                value={mainLogo.text}
                onChange={(e) =>
                  setMainLogo({ ...mainLogo, type: "text", text: e.target.value })
                }
                placeholder="예: 사일로 스토어"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">이미지 로고 URL (선택)</label>
              <input
                className={inputClass}
                value={mainLogo.imageUrl}
                onChange={(e) =>
                  setMainLogo({ ...mainLogo, type: "image", imageUrl: e.target.value })
                }
                placeholder="https://... (또는 아래에서 파일 직접 업로드)"
              />
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo}
                onChange={(e) =>
                  handleLogoFileChange(e.target.files?.[0] ?? null)
                }
                className="mt-2 text-sm"
              />
              {uploadingLogo && (
                <p className="text-xs text-gray-400 mt-1">업로드 중...</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">로고 높이 (px)</label>
                <input
                  type="number"
                  min={16}
                  max={200}
                  className={`${inputClass} w-28`}
                  value={mainLogo.heightPx}
                  onChange={(e) =>
                    setMainLogo({
                      ...mainLogo,
                      heightPx: Number(e.target.value) || DEFAULT_LOGO_HEIGHT_PX,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">로고 섹션 높이 (px, 비우면 자동)</label>
                <input
                  type="number"
                  min={16}
                  max={400}
                  className={`${inputClass} w-28`}
                  value={mainLogo.rowHeightPx ?? ""}
                  placeholder="자동"
                  onChange={(e) =>
                    setMainLogo({
                      ...mainLogo,
                      rowHeightPx: e.target.value === "" ? null : Math.max(16, Number(e.target.value) || 64),
                    })
                  }
                />
              </div>
            </div>
            {/* EPIC-039: 로고 이미지를 중앙에 두고 양옆에 대칭으로 텍스트를
                배치하는 레이아웃으로 바뀌어, 기존 "정렬 위치"(좌/중앙/우)는
                이 레이아웃과 함께 쓰기 어려워 UI에서 제거했다(항상 중앙). */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">로고 좌측 텍스트 (선택)</label>
                <input
                  className={inputClass}
                  value={mainLogo.leftText}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, leftText: e.target.value })
                  }
                  placeholder="예: since 2024"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">로고 우측 텍스트 (선택)</label>
                <input
                  className={inputClass}
                  value={mainLogo.rightText}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, rightText: e.target.value })
                  }
                  placeholder="예: Retrouvailles"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">좌/우 텍스트 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={mainLogo.textColor || DEFAULT_LOGO_TEXT_COLOR}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, textColor: e.target.value })
                  }
                  className="h-9 w-12 rounded border border-gray-300 p-1"
                />
                <input
                  className={`${inputClass} w-32`}
                  value={mainLogo.textColor}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, textColor: e.target.value })
                  }
                  placeholder={DEFAULT_LOGO_TEXT_COLOR}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">
                  커스텀 폰트 파일 (.woff, .woff2, .ttf 등, 여러 개 등록 가능)
                </label>
                <button
                  type="button"
                  onClick={addCustomFont}
                  className={smallButtonClass}
                >
                  + 폰트 추가
                </button>
              </div>
              {mainLogo.customFonts.length === 0 ? (
                <p className="text-sm text-gray-400">
                  아직 추가된 폰트가 없어요.
                </p>
              ) : (
                <div className="space-y-2">
                  {mainLogo.customFonts.map((font) => (
                    <div key={font.id} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={font.url}
                        onChange={(e) =>
                          updateCustomFont(font.id, { url: e.target.value })
                        }
                        placeholder="https://... (Supabase Storage에 올린 폰트 파일의 공개 URL)"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
                        <input
                          type="checkbox"
                          checked={font.isActive}
                          onChange={(e) =>
                            updateCustomFont(font.id, {
                              isActive: e.target.checked,
                            })
                          }
                        />
                        적용
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCustomFont(font.id)}
                        className="text-xs text-red-600 hover:underline shrink-0"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                &quot;적용&quot;이 켜진 폰트만 실제로 주입되고, 아래 텍스트
                서체 입력값보다 우선 적용돼요. 여러 개를 켜두면 목록 순서대로
                폴백 체인으로 연결돼요.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">텍스트 서체 (직접 입력)</label>
                <input
                  className={inputClass}
                  value={mainLogo.fontFamily}
                  onChange={(e) =>
                    setMainLogo({ ...mainLogo, fontFamily: e.target.value })
                  }
                  placeholder="예: 'Pretendard', sans-serif"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">텍스트 크기 (px)</label>
                <input
                  type="number"
                  min={8}
                  max={64}
                  className={inputClass}
                  value={mainLogo.fontSizePx}
                  onChange={(e) =>
                    setMainLogo({
                      ...mainLogo,
                      fontSizePx:
                        Number(e.target.value) || DEFAULT_LOGO_FONT_SIZE_PX,
                    })
                  }
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={mainLogo.bold}
                    onChange={(e) =>
                      setMainLogo({ ...mainLogo, bold: e.target.checked })
                    }
                  />
                  굵게 (Bold)
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSave("main_logo", mainLogoValue)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "main_logo" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>
        )}

        {/* 슬라이드쇼 */}
        {activeSection === "slideshow" && (
        <section className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">슬라이드쇼</h2>
            <button type="button" onClick={addSlide} className={smallButtonClass}>
              + 슬라이드 추가
            </button>
          </div>

          {/* EPIC-092(요구사항 7): PC/모바일 버전을 독립적으로 편집 —
              아래 슬라이드/여백/배경 설정은 전부 선택된 탭에만 적용된다. */}
          <div className="mb-4 flex gap-1 rounded-md border border-gray-200 p-1 w-fit">
            <button
              type="button"
              onClick={() => setHeroTab("pc")}
              className={`rounded px-3 py-1 text-sm ${heroTab === "pc" ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              PC 버전
            </button>
            <button
              type="button"
              onClick={() => setHeroTab("mobile")}
              className={`rounded px-3 py-1 text-sm ${heroTab === "mobile" ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              모바일 버전
            </button>
          </div>

          {activeHero.slides.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">
              아직 추가된 슬라이드가 없어요.
            </p>
          ) : (
            <div className="space-y-3 mb-3">
              {activeHero.slides.map((slide, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-gray-200 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      슬라이드 #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="flex items-start gap-2">
                    {slide.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slide.imageUrl}
                        alt={`슬라이드 #${idx + 1} 미리보기`}
                        className="w-16 h-16 object-contain rounded bg-gray-100 shrink-0"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        className={inputClass}
                        placeholder="이미지 URL (또는 아래에서 파일 직접 업로드)"
                        value={slide.imageUrl}
                        onChange={(e) =>
                          updateSlide(idx, { imageUrl: e.target.value })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingSlideIdx === idx}
                        onChange={(e) =>
                          handleSlideFileChange(idx, e.target.files?.[0] ?? null)
                        }
                        className="text-sm"
                      />
                      {uploadingSlideIdx === idx && (
                        <p className="text-xs text-gray-400">업로드 중...</p>
                      )}
                    </div>
                  </div>
                  <input
                    className={inputClass}
                    placeholder="타이틀"
                    value={slide.title}
                    onChange={(e) => updateSlide(idx, { title: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="설명"
                    value={slide.description}
                    onChange={(e) =>
                      updateSlide(idx, { description: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm mb-1">섹션 높이 (vh, 비우면 자동)</label>
              <input
                type="number"
                min={10}
                max={100}
                className={inputClass}
                value={activeHero.heightVh ?? ""}
                placeholder="자동(모바일 60 / PC 70)"
                onChange={(e) =>
                  updateActiveHero({
                    heightVh: e.target.value === "" ? null : Math.max(10, Math.min(100, Number(e.target.value) || 60)),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">자동 전환 시간 (초)</label>
              <input
                type="number"
                min={1}
                max={60}
                className={inputClass}
                value={activeHero.autoAdvanceSeconds}
                onChange={(e) =>
                  updateActiveHero({
                    autoAdvanceSeconds: Number(e.target.value) || defaultHeroSlideshowConfig().autoAdvanceSeconds,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">이미지 채움 방식</label>
              <select
                className={inputClass}
                value={activeHero.objectFit}
                onChange={(e) => updateActiveHero({ objectFit: e.target.value as "cover" | "contain" })}
              >
                <option value="cover">꽉 차게 (cover)</option>
                <option value="contain">원본 모두 보이게 (contain)</option>
              </select>
            </div>
          </div>

          {/* EPIC-092(요구사항 6): 슬라이드쇼 위젯 바깥 여백(px) — 저장 후
              공개 홈페이지가 다음 요청부터 바로 반영한다(별도 미리보기 캔버스
              없음, 기존 다른 hero_slideshow 필드와 동일한 "실시간 적용" 의미). */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-sm mb-1">여백 위(px)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={activeHero.marginTopPx}
                onChange={(e) => updateActiveHero({ marginTopPx: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">여백 아래(px)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={activeHero.marginBottomPx}
                onChange={(e) => updateActiveHero({ marginBottomPx: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">여백 왼쪽(px)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={activeHero.marginLeftPx}
                onChange={(e) => updateActiveHero({ marginLeftPx: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">여백 오른쪽(px)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={activeHero.marginRightPx}
                onChange={(e) => updateActiveHero({ marginRightPx: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm">
                여백 배경 이미지 (Wallpaper, 최대 {MAX_WALLPAPERS}개) — 이미지
                채움 방식이 &quot;contain&quot;일 때 생기는 여백을, 슬라이드가
                바뀔 때마다 이 중 하나를 무작위로 골라 채워요
              </label>
              <button
                type="button"
                onClick={addWallpaper}
                disabled={activeHero.wallpaperUrls.length >= MAX_WALLPAPERS}
                className={smallButtonClass}
              >
                + 추가
              </button>
            </div>
            <div className="mb-2">
              <label className="block text-sm mb-1">
                업로드 압축 품질 (원본 대비 %) — 100이면 압축 없이 원본 그대로
                업로드해요. 이미 업로드된 이미지에는 소급 적용되지 않고, 다음에
                파일을 새로 올릴 때부터 적용돼요.
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className={`${inputClass} max-w-[120px]`}
                value={activeHero.wallpaperQuality}
                onChange={(e) =>
                  updateActiveHero({ wallpaperQuality: Math.max(1, Math.min(100, Number(e.target.value) || 100)) })
                }
              />
            </div>
            {activeHero.wallpaperUrls.length === 0 ? (
              <p className="text-sm text-gray-400">
                아직 추가된 배경 이미지가 없어요.
              </p>
            ) : (
              <div className="space-y-2">
                {activeHero.wallpaperUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`여백 배경 이미지 #${idx + 1} 미리보기`}
                        className="w-16 h-16 object-contain rounded bg-gray-100 shrink-0"
                      />
                    )}
                    <input
                      className={inputClass}
                      placeholder="이미지 URL (또는 파일 직접 업로드)"
                      value={url}
                      onChange={(e) => updateWallpaper(idx, e.target.value)}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingWallpaperIdx === idx}
                      onChange={(e) =>
                        handleWallpaperFileChange(
                          idx,
                          e.target.files?.[0] ?? null,
                        )
                      }
                      className="text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeWallpaper(idx)}
                      className="text-xs text-red-600 hover:underline shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                ))}
                {uploadingWallpaperIdx !== null && (
                  <p className="text-xs text-gray-400">업로드 중...</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave("hero_slideshow", heroSlideshow)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "hero_slideshow" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>
        )}

        {/* EPIC-039: 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘.
            비어 있으면 Navbar.tsx가 기존 🔑/🚪 이모지로 대체한다.
            EPIC-078: 기본(Default)/호버(Hover) 2개 미디어로 확장 — 이미지뿐
            아니라 투명 배경 비디오(.webm/.mp4)도 업로드할 수 있다. */}
        {activeSection === "sidebarIcons" && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">사이드바 아이콘</h2>
          <div className="mb-4">
            <p className="mb-2 text-xs text-gray-500">🎨 아래 미리보기에서 좌/우 아이콘을 직접 클릭하면 바로 편집할 수 있어요.</p>
            <ChromeCraftEditor
              key={chromeDeviceTab}
              tree={
                <Element is={RootContainer} canvas id="ROOT">
                  <ChromeSidebarIconBlock
                    side="left"
                    config={sidebarIcons}
                    onConfigChange={(patch) => setSidebarIcons((prev) => ({ ...prev, ...patch }))}
                  />
                  <ChromeSidebarIconBlock
                    side="right"
                    config={sidebarIcons}
                    onConfigChange={(patch) => setSidebarIcons((prev) => ({ ...prev, ...patch }))}
                  />
                </Element>
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SidebarIconUploadField
              label="좌측 사이드바 — 1. 기본 아이콘 (사일로상점)"
              value={sidebarIcons.leftIconDefaultUrl}
              uploading={uploadingSidebarIconField === "leftIconDefaultUrl"}
              onFileChange={(file) => handleSidebarIconFileChange("leftIconDefaultUrl", file)}
              onUrlChange={(url) =>
                setSidebarIcons({ ...sidebarIcons, leftIconDefaultUrl: url })
              }
            />
            <SidebarIconUploadField
              label="좌측 사이드바 — 2. Hover 미디어 (커서 올렸을 때, WebM/WebP/GIF 등)"
              value={sidebarIcons.leftIconHoverUrl}
              uploading={uploadingSidebarIconField === "leftIconHoverUrl"}
              onFileChange={(file) => handleSidebarIconFileChange("leftIconHoverUrl", file)}
              onUrlChange={(url) =>
                setSidebarIcons({ ...sidebarIcons, leftIconHoverUrl: url })
              }
            />
            <SidebarIconUploadField
              label="우측 사이드바 — 1. 기본 아이콘 (살롱데상)"
              value={sidebarIcons.rightIconDefaultUrl}
              uploading={uploadingSidebarIconField === "rightIconDefaultUrl"}
              onFileChange={(file) => handleSidebarIconFileChange("rightIconDefaultUrl", file)}
              onUrlChange={(url) =>
                setSidebarIcons({ ...sidebarIcons, rightIconDefaultUrl: url })
              }
            />
            <SidebarIconUploadField
              label="우측 사이드바 — 2. Hover 미디어 (커서 올렸을 때, WebM/WebP/GIF 등)"
              value={sidebarIcons.rightIconHoverUrl}
              uploading={uploadingSidebarIconField === "rightIconHoverUrl"}
              onFileChange={(file) => handleSidebarIconFileChange("rightIconHoverUrl", file)}
              onUrlChange={(url) =>
                setSidebarIcons({ ...sidebarIcons, rightIconHoverUrl: url })
              }
            />
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">아이콘 크기 (px)</label>
            <input
              type="number"
              min={16}
              max={96}
              className={`${inputClass} w-28`}
              value={sidebarIcons.iconSizePx}
              onChange={(e) =>
                setSidebarIcons({
                  ...sidebarIcons,
                  iconSizePx: Number(e.target.value) || DEFAULT_ICON_SIZE_PX,
                })
              }
            />
          </div>
          {/* EPIC-089(요구사항 2): 좌/우 사이드바 여닫이 아이콘 세로 위치 —
              기존엔 top-1/2(화면 정중앙)로 고정이었다. 뷰포트 상단에서부터의
              px 거리로 직접 조절할 수 있게 한다(iconSizePx와 동일한 숫자
              입력 패턴). */}
          <div className="mt-3">
            <label className="block text-sm mb-1">아이콘 세로 위치 (상단에서 px)</label>
            <input
              type="number"
              min={0}
              max={2000}
              className={`${inputClass} w-28`}
              value={sidebarIcons.topOffsetPx}
              onChange={(e) =>
                setSidebarIcons({
                  ...sidebarIcons,
                  topOffsetPx: Number(e.target.value) || DEFAULT_TOP_OFFSET_PX,
                })
              }
            />
          </div>
          {/* EPIC-076: 여닫이 버튼 배경색 — 하드코딩된 초록색(bg-green-800)을
              대체. "transparent" 또는 #HEX 코드를 자유 입력, 색상 picker는
              #HEX일 때만 유효하므로 참고용으로 병행 노출한다.
              EPIC-078: 트리거 버튼이 항상 완전 투명이어야 한다는 요구사항과
              충돌해 실제 버튼에는 더 이상 적용하지 않는다 — 그동안 저장된
              값이 사라지지 않도록 설정 자체는 남겨뒀다(값을 저장해도 화면에
              반영되지 않음). */}
          <div className="mt-3">
            <label className="block text-sm mb-1">
              아이콘 배경색 (transparent 또는 #HEX 코드)
            </label>
            <div className="flex items-center gap-2">
              {/^#[0-9a-fA-F]{6}$/.test(sidebarIcons.backgroundColor) && (
                <input
                  type="color"
                  value={sidebarIcons.backgroundColor}
                  onChange={(e) =>
                    setSidebarIcons({
                      ...sidebarIcons,
                      backgroundColor: e.target.value,
                    })
                  }
                  className="h-9 w-12 rounded border border-gray-300 p-1"
                />
              )}
              <input
                className={`${inputClass} w-40`}
                value={sidebarIcons.backgroundColor}
                onChange={(e) =>
                  setSidebarIcons({
                    ...sidebarIcons,
                    backgroundColor: e.target.value,
                  })
                }
                placeholder={DEFAULT_ICON_BG_COLOR}
              />
            </div>
          </div>
          {/* EPIC-077: 여닫이 트리거 모드 — "click"이면 호버는 아르누보
              애니메이션만 재생하고 클릭해야 패널이 열린다. "hover"면 EPIC-063
              이전 방식대로 호버 즉시 열린다. */}
          <div className="mt-3">
            <label className="block text-sm mb-1">여닫이 트리거 방식</label>
            <select
              className={inputClass}
              value={sidebarIcons.triggerMode}
              onChange={(e) =>
                setSidebarIcons({
                  ...sidebarIcons,
                  triggerMode: e.target.value === "hover" ? "hover" : "click",
                })
              }
            >
              <option value="click">클릭으로 열기 (기본)</option>
              <option value="hover">호버로 열기 (기존 방식)</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSave("sidebar_icons", sidebarIconsValue)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "sidebar_icons" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>
        )}

        {/* EPIC-079-PHASE-4: 상단 탭 하나하나의 표시 텍스트/서체/크기/색상을
            여기서 개별 편집한다 — 트리 구조(제목/href/순서/재부모화)는
            여전히 "사이트 구성 관리"(/admin/site-structure)가 SSoT이고,
            여기서는 그 위에 얹는 순수 디자인 오버레이만 다룬다(구조를
            건드리지 않음 — labelOverride가 비어있으면 원래 제목 그대로). */}
        {activeSection === "topTabs" && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-1">상단 탭 디자인</h2>
          <p className="text-sm text-gray-500 mb-3">
            각 상단 탭의 표시 텍스트·서체·크기·색상을 개별적으로 바꿀 수 있어요.
            표시 텍스트를 비워두면 &quot;사이트 구성 관리&quot;에서 정한 원래
            이름이 그대로 쓰여요. 탭 자체를 추가/삭제/순서 변경하려면
            &quot;사이트 구성 관리&quot; 화면을 이용하세요.
          </p>
          <div className="mb-4">
            <p className="mb-2 text-xs text-gray-500">🎨 아래 미리보기에서 탭을 직접 클릭하면 바로 편집할 수 있어요(탭 추가/삭제는 안 돼요).</p>
            {topNavRows.length === 0 ? (
              <p className="rounded-lg border border-gray-200 p-4 text-xs text-gray-400">상단 탭 목록을 불러오는 중이에요...</p>
            ) : (
              <ChromeCraftEditor
                key={chromeDeviceTab}
                tree={
                  <Element is={RootContainer} canvas id="ROOT">
                    {topNavRows.map((row) => {
                      const tabKey = row.key ?? row.id;
                      return (
                        <ChromeTopTabBlock
                          key={tabKey}
                          tabKey={tabKey}
                          defaultLabel={row.title}
                          entry={topTabStyle.tabs[tabKey] ?? defaultTopTabStyleEntry()}
                          onEntryChange={(patch) =>
                            setTopTabStyle((prev) => ({
                              ...prev,
                              tabs: {
                                ...prev.tabs,
                                [tabKey]: { ...(prev.tabs[tabKey] ?? defaultTopTabStyleEntry()), ...patch },
                              },
                            }))
                          }
                        />
                      );
                    })}
                  </Element>
                }
              />
            )}
          </div>
          <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* HOTFIX(사용자 지시 — "일일이 숫자값을 넣어서 하는 게 너무
                구시대적이야. 드래그앤드롭으로 하고 싶어"): 숫자 입력 대신
                트랙을 드래그해 값을 정하는 슬라이더로 교체(DragValueSlider) —
                우측에 정밀 조정용 ±버튼과 현재 값도 함께 보여준다. */}
            <DragValueSlider
              label="상단 탭 섹션 높이"
              hint="기본(~36px)보다 작으면 효과 없어요."
              value={topTabStyle.rowHeightPx ?? 40}
              min={16}
              max={400}
              onChange={(v) => setTopTabStyle({ ...topTabStyle, rowHeightPx: v })}
              allowAuto={topTabStyle.rowHeightPx !== null}
              onClearAuto={() => setTopTabStyle({ ...topTabStyle, rowHeightPx: null })}
            />
            {/* EPIC-117/118(사용자 지시): 아래 각 탭의 "표시 위치"를 1단으로
                지정하면 로고 줄 하단 경계선에 걸치게(로고 줄 절반+2단 탭
                줄 절반) 자동 배치되는데, 이 값으로 위/아래 미세 조정을
                더한다(양수면 더 위로, 즉 로고 줄 쪽으로 더 겹친다). 가로
                위치는 더 이상 이 화면에서 조절할 필요가 없다 — 계정
                영역(로그인/로그아웃 등) 바로 앞자리에 자동으로 배치돼
                겹치지 않는다. */}
            <DragValueSlider
              label="1단 겹침 정도"
              hint="로고 줄 쪽으로 더 이동"
              value={topTabStyle.tier1OffsetPx}
              min={-100}
              max={200}
              onChange={(v) => setTopTabStyle({ ...topTabStyle, tier1OffsetPx: v })}
            />
            <DragValueSlider
              label="2단 위치 조정"
              hint="위로 이동"
              value={topTabStyle.tier2OffsetPx}
              min={-100}
              max={200}
              onChange={(v) => setTopTabStyle({ ...topTabStyle, tier2OffsetPx: v })}
            />
          </div>
          {topNavRows.length === 0 ? (
            <p className="text-sm text-gray-400">아직 등록된 상단 탭이 없어요.</p>
          ) : (
            <div className="space-y-3">
              {topNavRows.map((row) => {
                const tabId = row.key ?? row.id;
                const entry = topTabStyle.tabs[tabId] ?? defaultTopTabStyleEntry();
                return (
                  <TopTabStyleRow
                    key={row.id}
                    originalTitle={row.title}
                    entry={entry}
                    onChange={(patch) => updateTabStyle(tabId, patch)}
                    onAddCustomFont={() => addTabCustomFont(tabId)}
                    onUpdateCustomFont={(fontId, patch) => updateTabCustomFont(tabId, fontId, patch)}
                    onRemoveCustomFont={(fontId) => removeTabCustomFont(tabId, fontId)}
                  />
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSave("top_tab_style", topTabStyleValue)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "top_tab_style" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>
        )}

        {/* HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 맨 위의 '관리자,
            (회원 등급), 마이페이지, (사용자이름), 로그아웃' 이런 메뉴의
            디자인을 설정하는 또다른 탭을 만들어줘, 그리고 그 디자인의
            모션에 대해서도 옵션을 줘"): 계정 영역(우측 상단) 전체에
            적용되는 서체/크기/색상 + hover 모션. */}
        {activeSection === "accountMenu" && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-1">사용자 메뉴 디자인</h2>
          <p className="text-sm text-gray-500 mb-3">
            우측 상단 &quot;관리자 / 등급 / 마이페이지 / 이름 / 로그아웃&quot; 5개 항목에 함께 적용돼요.
          </p>
          <div className="mb-4">
            <p className="mb-2 text-xs text-gray-500">🎨 아래 미리보기를 직접 클릭하면 바로 편집할 수 있어요.</p>
            <ChromeCraftEditor
              key={chromeDeviceTab}
              tree={
                <Element is={RootContainer} canvas id="ROOT">
                  <ChromeAccountMenuBlock
                    config={accountMenuStyle}
                    onConfigChange={(patch) => setAccountMenuStyle((prev) => ({ ...prev, ...patch }))}
                  />
                </Element>
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">텍스트 서체 (직접 입력, 폴백용)</label>
              <input
                className={inputClass}
                value={accountMenuStyle.fontFamily}
                onChange={(e) => setAccountMenuStyle({ ...accountMenuStyle, fontFamily: e.target.value })}
                placeholder="예: 'Pretendard', sans-serif"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">텍스트 크기 (px, 비우면 기본값)</label>
              <input
                type="number"
                min={8}
                max={64}
                className={inputClass}
                value={accountMenuStyle.fontSizePx ?? ""}
                onChange={(e) => setAccountMenuStyle({ ...accountMenuStyle, fontSizePx: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={accountMenuStyle.bold}
                  onChange={(e) => setAccountMenuStyle({ ...accountMenuStyle, bold: e.target.checked })}
                />
                굵게 (Bold)
              </label>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">텍스트 색상 (비우면 기본 색상)</label>
            <div className="flex items-center gap-2">
              {/^#[0-9a-fA-F]{6}$/.test(accountMenuStyle.color) && (
                <input
                  type="color"
                  value={accountMenuStyle.color}
                  onChange={(e) => setAccountMenuStyle({ ...accountMenuStyle, color: e.target.value })}
                  className="h-9 w-12 rounded border border-gray-300 p-1"
                />
              )}
              <input
                className={`${inputClass} w-32`}
                value={accountMenuStyle.color}
                onChange={(e) => setAccountMenuStyle({ ...accountMenuStyle, color: e.target.value })}
                placeholder="#4b5563"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">마우스를 올렸을 때(hover) 모션</label>
            <select
              className={inputClass}
              value={accountMenuStyle.hoverMotion}
              onChange={(e) => setAccountMenuStyle({ ...accountMenuStyle, hoverMotion: e.target.value as TabHoverMotion })}
            >
              {TAB_HOVER_MOTIONS.map((m) => (
                <option key={m} value={m}>
                  {TAB_HOVER_MOTION_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <MotionPreviewSamples selected={accountMenuStyle.hoverMotion} />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSave("account_menu_style", accountMenuStyleValue)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "account_menu_style" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>
        )}
        </div>

        {/* B6(홈페이지 설정 관리 Craft.js 전환): 메인 로고/사이드바 아이콘/
            상단 탭/계정 메뉴 4개 섹션은 이제 위쪽 캔버스가 이미 실시간
            미리보기+편집을 겸하므로(클릭하면 바로 옆에 설정까지 뜬다),
            그 4개 섹션에서는 이 오른쪽 iframe 미리보기를 숨겨 중앙
            캔버스에 폭을 온전히 내준다 — 실제로 켜둔 채 테스트해보니
            중앙 칸이 640px 미리보기에 밀려 300px 안팎으로 좁아져 캔버스
            안 요소를 클릭할 폭 자체가 없었다(SILO 텍스트가 폭 0으로
            찌그러짐). 슬라이드쇼는 아직 옛 폼+iframe 방식 그대로라 계속
            보여준다. */}
        {activeSection === "slideshow" && (
        <aside className="sticky top-6 hidden w-[640px] shrink-0 xl:block">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">실시간 미리보기 (실제 홈페이지)</p>
            <button
              type="button"
              onClick={() => setPreviewRefreshKey((k) => k + 1)}
              className="text-xs text-gray-500 hover:underline"
            >
              ↻ 처음부터 다시 불러오기
            </button>
          </div>
          <p className="mb-3 text-xs text-gray-400">
            실제 Navbar를 그대로 iframe으로 띄운 화면이에요 — 메인 로고/사이드바
            아이콘/상단 탭 디자인은 타이핑하는 즉시 반영돼요(저장 전이라도).
            슬라이드쇼는 홈페이지가 Craft 편집기로 별도 관리돼서 이 미리보기에는
            반영되지 않을 수 있어요 — 그럴 땐 &quot;페이지 수정&quot;(홈페이지
            우측 상단)에서 직접 편집해 주세요.
          </p>
          <div className="flex items-start gap-4">
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">PC</p>
              <LivePreviewFrame device="pc" refreshKey={previewRefreshKey} overrides={{ mainLogo: mainLogoValue, sidebarIcons: sidebarIconsValue, topTabStyle: topTabStyleValue, accountMenuStyle: accountMenuStyleValue }} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">모바일</p>
              <LivePreviewFrame device="mobile" refreshKey={previewRefreshKey} overrides={{ mainLogo: mainLogoValue, sidebarIcons: sidebarIconsValue, topTabStyle: topTabStyleValue, accountMenuStyle: accountMenuStyleValue }} />
            </div>
          </div>
        </aside>
        )}
      </div>
    </main>
  );
}

// EPIC-079-PHASE-4: 상단 탭 디자인 섹션의 탭 1개짜리 편집 블록 — 메인
// 로고 섹션의 커스텀 폰트 등록 UI와 동일한 패턴을 재사용한다.
function TopTabStyleRow({
  originalTitle,
  entry,
  onChange,
  onAddCustomFont,
  onUpdateCustomFont,
  onRemoveCustomFont,
}: {
  originalTitle: string;
  entry: TopTabStyleEntry;
  onChange: (patch: Partial<TopTabStyleEntry>) => void;
  onAddCustomFont: () => void;
  onUpdateCustomFont: (fontId: string, patch: Partial<CustomFontEntry>) => void;
  onRemoveCustomFont: (fontId: string) => void;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-3 space-y-2">
      <p className="text-sm font-medium text-gray-700">{originalTitle}</p>
      <div>
        <label className="block text-xs text-gray-500 mb-1">표시 텍스트 (비우면 원래 이름 사용)</label>
        <input
          className={inputClass}
          value={entry.labelOverride}
          onChange={(e) => onChange({ labelOverride: e.target.value })}
          placeholder={originalTitle}
        />
      </div>

      {/* EPIC-117(사용자 지시): "1단"을 고르면 이 탭이 기존 탭 줄(2단)이
          아니라 로고 줄과 겹치는 자리에 뜬다 — 위 "1단 겹침 정도"로
          겹치는 정도를 조절. */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">표시 위치</label>
        <select
          className={inputClass}
          value={entry.tier === 1 ? "1" : "2"}
          onChange={(e) => onChange({ tier: e.target.value === "1" ? 1 : 2 })}
        >
          <option value="2">2단(기본, 기존 탭 줄)</option>
          <option value="1">1단(로고 섹션과 겹치게 배치)</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-gray-500">커스텀 폰트 파일 (.woff, .woff2, .ttf 등)</label>
          <button type="button" onClick={onAddCustomFont} className={smallButtonClass}>
            + 폰트 추가
          </button>
        </div>
        {entry.customFonts.length === 0 ? (
          <p className="text-xs text-gray-400">아직 추가된 폰트가 없어요.</p>
        ) : (
          <div className="space-y-2">
            {entry.customFonts.map((font) => (
              <div key={font.id} className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={font.url}
                  onChange={(e) => onUpdateCustomFont(font.id, { url: e.target.value })}
                  placeholder="https://... (Supabase Storage에 올린 폰트 파일의 공개 URL)"
                />
                <label className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
                  <input
                    type="checkbox"
                    checked={font.isActive}
                    onChange={(e) => onUpdateCustomFont(font.id, { isActive: e.target.checked })}
                  />
                  적용
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveCustomFont(font.id)}
                  className="text-xs text-red-600 hover:underline shrink-0"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">텍스트 서체 (직접 입력, 폴백용)</label>
          <input
            className={inputClass}
            value={entry.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            placeholder="예: 'Pretendard', sans-serif"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">텍스트 크기 (px, 비우면 기본값)</label>
          <input
            type="number"
            min={8}
            max={64}
            className={inputClass}
            value={entry.fontSizePx ?? ""}
            onChange={(e) => onChange({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={entry.bold}
              onChange={(e) => onChange({ bold: e.target.checked })}
            />
            굵게 (Bold)
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">텍스트 색상 (비우면 기본 색상)</label>
        <div className="flex items-center gap-2">
          {/^#[0-9a-fA-F]{6}$/.test(entry.color) && (
            <input
              type="color"
              value={entry.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-9 w-12 rounded border border-gray-300 p-1"
            />
          )}
          <input
            className={`${inputClass} w-32`}
            value={entry.color}
            onChange={(e) => onChange({ color: e.target.value })}
            placeholder="#166534"
          />
        </div>
      </div>

      {/* HOTFIX(사용자 지시 — "각 탭 위에 커서가 hover 되었을 때의 모션들을
          6가지로 설정할 수 있게 해 고급스러운 느낌이 나도록"): 프리셋
          6종 + 없음. 아무 것도 안 고르면 tabHoverMotion.ts의 기본값(금빛
          그라디언트 밑줄)이 이미 적용돼 있다. */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">마우스를 올렸을 때(hover) 모션</label>
        <select
          className={inputClass}
          value={entry.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION}
          onChange={(e) => onChange({ hoverMotion: e.target.value as TabHoverMotion })}
        >
          {TAB_HOVER_MOTIONS.map((m) => (
            <option key={m} value={m}>
              {TAB_HOVER_MOTION_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      {/* HOTFIX(사용자 지시 — "상단 메뉴탭... 모션에 대한 옵션을 프리뷰
          할 수 있는 샘플을 보여줘"): 축소된 iframe 미리보기 대신 여기서
          바로 6가지를 비교해볼 수 있는 샘플. */}
      <MotionPreviewSamples selected={entry.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION} />
    </div>
  );
}

// EPIC-078: 사이드바 아이콘 업로드 슬롯 4개(좌/우 x 기본/호버)가 미리보기
// (이미지/비디오 자동 판별)+URL 텍스트 입력+파일 업로드 구조를 그대로
// 공유해 공용 컴포넌트로 뽑았다.
function isSidebarIconVideoUrl(url: string): boolean {
  return /\.(webm|mp4)(\?|$)/i.test(url);
}

function SidebarIconUploadField({
  label,
  value,
  uploading,
  onFileChange,
  onUrlChange,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onFileChange: (file: File | null) => void;
  onUrlChange: (url: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      {value &&
        (isSidebarIconVideoUrl(value) ? (
          <video
            src={value}
            autoPlay
            loop
            muted
            playsInline
            className="w-16 h-16 mb-2 object-contain rounded bg-gray-100"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={label}
            className="w-16 h-16 mb-2 object-contain rounded bg-gray-100"
          />
        ))}
      <input
        className={inputClass}
        value={value}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="https://... (또는 아래에서 파일 직접 업로드)"
      />
      <input
        type="file"
        accept="image/*,.webm,.mp4,video/webm,video/mp4"
        disabled={uploading}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        className="mt-2 text-sm"
      />
      {uploading && <p className="text-xs text-gray-400 mt-1">업로드 중...</p>}
    </div>
  );
}
