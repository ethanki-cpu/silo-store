"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inputClass, primaryButtonClass, smallButtonClass } from "../shared";
import { MobilePreviewFrame } from "@/components/admin/MobilePreviewFrame";
import {
  normalizeHeroSlideshow,
  defaultHeroSlideshowValue,
  defaultHeroSlideshowConfig,
  type SlideItem,
  type HeroSlideshowConfig,
  type HeroSlideshowValue,
} from "@/lib/heroSlideshow";

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

type LogoAlign = "left" | "center" | "right";
type TextPosition = "left" | "right";

type CustomFontEntry = {
  id: string;
  url: string;
  isActive: boolean;
};

type MainLogoValue = {
  type: "text" | "image";
  text: string;
  imageUrl: string;
  heightPx: number;
  align: LogoAlign;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용으로만 읽는다. */
  extraText: string;
  fontFamily: string;
  bold: boolean;
  fontSizePx: number;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용으로만 읽는다. */
  textPosition: TextPosition;
  textColor: string;
  leftText: string;
  rightText: string;
  /** @deprecated EPIC-043: customFonts(배열)로 대체. 구버전 데이터 호환용으로만 읽는다. */
  fontFileUrl: string;
  customFonts: CustomFontEntry[];
  // EPIC-110: 로고가 놓이는 상단 바 첫 줄(로고+좌우 텍스트) 자체의 높이(px)
  // — null이면 기존처럼 내용물(로고 이미지 높이 등)에 맞춰 자동으로 정해진다.
  rowHeightPx: number | null;
};
// EPIC-078: 기본(default)/호버(hover) 2종 미디어로 확장 — 이미지뿐 아니라
// 투명 배경 비디오(.webm/.mp4)도 지원해 실제 사이트에서 호버 시 기본
// 미디어가 호버 미디어로 크로스페이드된다. 구버전 leftIconUrl/rightIconUrl
// (단일 URL)은 leftIconDefaultUrl/rightIconDefaultUrl로 로드 시 1회
// 폴백한다(아래 load() 참고) — 데이터 자체를 변형하지 않고, 다음 저장 시
// 새 필드로 자연스럽게 옮겨간다.
type SidebarIconsValue = {
  leftIconDefaultUrl: string;
  leftIconHoverUrl: string;
  rightIconDefaultUrl: string;
  rightIconHoverUrl: string;
  iconSizePx: number;
  // EPIC-078: 실제 트리거 버튼에는 더 이상 적용하지 않는다(항상 완전
  // 투명 유지 요구사항과 충돌) — 다만 이 설정 자체를 지우면 그동안 저장된
  // 값이 사라지므로 필드/UI는 남겨두고 시각적 적용만 중단했다.
  backgroundColor: string;
  triggerMode: "click" | "hover";
  // EPIC-089(요구사항 2): 좌/우 사이드바 여닫이 아이콘의 뷰포트 상단
  // 기준 px 위치.
  topOffsetPx: number;
};

// EPIC-079-PHASE-4: 상단 탭(site_navigations의 depth 0 행) 하나하나의
// 표시 텍스트/서체/크기/색상을 개별적으로 커스터마이징한다 — 트리 구조
// 자체(제목/href 등)는 "사이트 구성 관리"(/admin/site-structure)가
// 담당하고, 여기서는 순수 디자인(어떻게 보일지)만 별도로 다룬다. tabId는
// site_navigations 행의 key(있으면)|id — Navbar.tsx의 NavTab.key와 동일한
// 값이라 프론트엔드에서 그대로 매칭할 수 있다.
type TopTabStyleEntry = {
  /** 비어있으면 site_navigations.title을 그대로 쓴다. */
  labelOverride: string;
  fontFamily: string;
  fontSizePx: number | null;
  bold: boolean;
  color: string;
  customFonts: CustomFontEntry[];
};
type TopTabStyleValue = {
  tabs: Record<string, TopTabStyleEntry>;
  // EPIC-110: 상단 탭 줄(nav) 전체의 높이(px) — null이면 기존처럼 탭
  // 버튼의 padding에 맞춰 자동으로 정해진다.
  rowHeightPx: number | null;
};
type TopNavRow = { id: string; key: string | null; title: string; sort_order: number };

function defaultTopTabStyleEntry(): TopTabStyleEntry {
  return { labelOverride: "", fontFamily: "", fontSizePx: null, bold: false, color: "", customFonts: [] };
}

const MAX_WALLPAPERS = 10;
const DEFAULT_ICON_SIZE_PX = 32;
// EPIC-076: 사이드바 여닫이 버튼 배경색 기본값 — 기존 하드코딩 bg-green-800(#166534)과 맞춤.
const DEFAULT_ICON_BG_COLOR = "#166534";
// EPIC-077: 사이드바 여닫이 트리거 모드 기본값 — 호버 시 아르누보 애니메이션만
// 재생되고 클릭해야 패널이 열리도록 "click"을 기본으로 한다.
const DEFAULT_TRIGGER_MODE: "click" | "hover" = "click";
// EPIC-089: Navbar.tsx의 DEFAULT_TOP_OFFSET_PX와 동일한 값 — 두 파일이
// site_settings 값을 각자 읽고 기본값도 각자 상수로 갖는 기존 관례(위
// 다른 DEFAULT_* 상수들과 동일)를 그대로 따른다.
const DEFAULT_TOP_OFFSET_PX = 160;

function makeDefaultCustomFont(): CustomFontEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: "",
    isActive: true,
  };
}

const DEFAULT_MAIN_LOGO: MainLogoValue = {
  type: "text",
  text: "",
  imageUrl: "",
  heightPx: 64,
  align: "left",
  extraText: "",
  fontFamily: "",
  bold: false,
  fontSizePx: 16,
  textPosition: "right",
  textColor: "#166534",
  leftText: "",
  rightText: "",
  fontFileUrl: "",
  customFonts: [],
  rowHeightPx: null,
};
const DEFAULT_SIDEBAR_ICONS: SidebarIconsValue = {
  leftIconDefaultUrl: "",
  leftIconHoverUrl: "",
  rightIconDefaultUrl: "",
  rightIconHoverUrl: "",
  iconSizePx: DEFAULT_ICON_SIZE_PX,
  backgroundColor: DEFAULT_ICON_BG_COLOR,
  triggerMode: DEFAULT_TRIGGER_MODE,
  topOffsetPx: DEFAULT_TOP_OFFSET_PX,
};

const STORAGE_BUCKET = "public-assets";

async function upsertSetting(key: string, value: unknown) {
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
}

async function uploadImage(
  file: File,
  folder: string,
): Promise<{ url: string | null; error: string | null }> {
  const path = `${folder}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file);

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// EPIC-078 후속: 여백 배경 이미지를 원본 대비 quality%(1~100)로 재인코딩한다
// — 캔버스에 원본 해상도 그대로 그린 뒤 압축(리사이즈는 하지 않음, 오직
// 압축률만 조절). 100이면 원본을 그대로 둔다(불필요한 손실 재인코딩 방지).
// 외부 서비스 없이 브라우저 canvas만으로 동작한다.
//
// EPIC-079-PHASE-2 버그 픽스: 이전엔 항상 image/jpeg로 인코딩했는데, JPEG는
// 알파 채널이 없어 투명 PNG를 업로드하면 캔버스의 투명 영역이 검정으로
// 합성(flatten)되어 저장됐다 — "여백 배경 이미지가 검정색으로 나온다"는
// 증상의 원인. 알파를 보존하는 image/webp로 인코딩해 투명 영역이 실제로
// 투명하게 저장되도록 한다.
async function compressImage(file: File, quality: number): Promise<File> {
  if (quality >= 100) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", Math.max(1, Math.min(100, quality)) / 100),
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}

export default function AdminNavigationSettingsPage() {
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const [mainLogo, setMainLogo] = useState<MainLogoValue>(DEFAULT_MAIN_LOGO);
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

  // EPIC-094(요구사항 1.3): 우측 실시간 모바일 프리뷰어에 넘길 "첫 번째
  // 유효 모바일 슬라이드" — heroSlideshow.mobile 참조가 실제로 바뀔 때만
  // (즉 모바일 탭을 편집할 때만) 새로 계산한다. PC 탭만 편집 중일 때는
  // heroSlideshow.mobile 참조가 그대로라 이 useMemo도, 그 아래
  // React.memo(MobilePreviewFrame)도 재계산/재렌더링되지 않는다.
  const mobilePreviewSlide = useMemo(() => {
    const slides = heroSlideshow.mobile.slides.filter(
      (s) => s.imageUrl || s.title || s.description,
    );
    return slides[0] ?? null;
  }, [heroSlideshow.mobile]);
  const [sidebarIcons, setSidebarIcons] = useState<SidebarIconsValue>(
    DEFAULT_SIDEBAR_ICONS,
  );
  const [topTabStyle, setTopTabStyle] = useState<TopTabStyleValue>({ tabs: {}, rowHeightPx: null });
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
      SidebarIconsValue,
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
        if (row.setting_key === "main_logo") {
          const value = {
            ...DEFAULT_MAIN_LOGO,
            ...(row.setting_value as Partial<MainLogoValue>),
          };
          // EPIC-039: 구버전 extraText+textPosition을 leftText/rightText로 1회 이전.
          if (!value.leftText && !value.rightText && value.extraText) {
            if (value.textPosition === "left") {
              value.leftText = value.extraText;
            } else {
              value.rightText = value.extraText;
            }
          }
          // EPIC-043: 구버전 단일 fontFileUrl을 customFonts 배열로 1회 이전.
          if (value.customFonts.length === 0 && value.fontFileUrl) {
            value.customFonts = [
              { id: "legacy", url: value.fontFileUrl, isActive: true },
            ];
          }
          setMainLogo(value);
        } else if (row.setting_key === "hero_slideshow") {
          // EPIC-092(요구사항 7): 옛 flat 모양이든 새 {pc,mobile} 모양이든
          // normalizeHeroSlideshow가 한 번에 처리한다(라이브 데이터 back-compat).
          setHeroSlideshow(normalizeHeroSlideshow(row.setting_value));
        } else if (row.setting_key === "sidebar_icons") {
          // EPIC-078: 구버전 leftIconUrl/rightIconUrl(단일 URL)을
          // leftIconDefaultUrl/rightIconDefaultUrl로 1회 폴백.
          const raw = row.setting_value as Partial<SidebarIconsValue> & {
            leftIconUrl?: string;
            rightIconUrl?: string;
          };
          setSidebarIcons({
            ...DEFAULT_SIDEBAR_ICONS,
            ...raw,
            leftIconDefaultUrl: raw.leftIconDefaultUrl || raw.leftIconUrl || "",
            rightIconDefaultUrl: raw.rightIconDefaultUrl || raw.rightIconUrl || "",
          });
        } else if (row.setting_key === "top_tab_style") {
          const value = row.setting_value as Partial<TopTabStyleValue> | null;
          setTopTabStyle({ tabs: value?.tabs ?? {}, rowHeightPx: value?.rowHeightPx ?? null });
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

  return (
    <main className="flex-1 px-8 pb-8 max-w-6xl mx-auto w-full">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* EPIC-094(요구사항 1.3): 2단 스플릿 — 좌측은 기존 폼 그대로, 우측은
          스크롤과 무관하게 고정된(sticky) 아이폰 프레임 실시간 프리뷰.
          xl 미만(좁은 화면)에서는 프리뷰를 숨겨 폼 입력 공간을 우선한다. */}
      <div className="flex items-start gap-8">
        <div className="min-w-0 flex-1 space-y-8">
        {/* 메인 로고 */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">메인 로고</h2>
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
                      heightPx: Number(e.target.value) || DEFAULT_MAIN_LOGO.heightPx,
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
                  value={mainLogo.textColor || DEFAULT_MAIN_LOGO.textColor}
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
                  placeholder={DEFAULT_MAIN_LOGO.textColor}
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
                        Number(e.target.value) || DEFAULT_MAIN_LOGO.fontSizePx,
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
              onClick={() => handleSave("main_logo", mainLogo)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "main_logo" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>

        {/* 슬라이드쇼 */}
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

        {/* EPIC-039: 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘.
            비어 있으면 Navbar.tsx가 기존 🔑/🚪 이모지로 대체한다.
            EPIC-078: 기본(Default)/호버(Hover) 2개 미디어로 확장 — 이미지뿐
            아니라 투명 배경 비디오(.webm/.mp4)도 업로드할 수 있다. */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">사이드바 아이콘</h2>
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
              onClick={() => handleSave("sidebar_icons", sidebarIcons)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "sidebar_icons" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>

        {/* EPIC-079-PHASE-4: 상단 탭 하나하나의 표시 텍스트/서체/크기/색상을
            여기서 개별 편집한다 — 트리 구조(제목/href/순서/재부모화)는
            여전히 "사이트 구성 관리"(/admin/site-structure)가 SSoT이고,
            여기서는 그 위에 얹는 순수 디자인 오버레이만 다룬다(구조를
            건드리지 않음 — labelOverride가 비어있으면 원래 제목 그대로). */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-1">상단 탭 디자인</h2>
          <p className="text-sm text-gray-500 mb-3">
            각 상단 탭의 표시 텍스트·서체·크기·색상을 개별적으로 바꿀 수 있어요.
            표시 텍스트를 비워두면 &quot;사이트 구성 관리&quot;에서 정한 원래
            이름이 그대로 쓰여요. 탭 자체를 추가/삭제/순서 변경하려면
            &quot;사이트 구성 관리&quot; 화면을 이용하세요.
          </p>
          <div className="mb-3">
            <label className="block text-sm mb-1">상단 탭 섹션 높이 (px, 비우면 자동)</label>
            <input
              type="number"
              min={16}
              max={400}
              className={`${inputClass} w-28`}
              value={topTabStyle.rowHeightPx ?? ""}
              placeholder="자동"
              onChange={(e) =>
                setTopTabStyle({
                  ...topTabStyle,
                  rowHeightPx: e.target.value === "" ? null : Math.max(16, Number(e.target.value) || 40),
                })
              }
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
              onClick={() => handleSave("top_tab_style", topTabStyle)}
              className={primaryButtonClass}
            >
              저장하기
            </button>
            {savedKey === "top_tab_style" && (
              <span className="text-sm text-green-600">저장됐어요.</span>
            )}
          </div>
        </section>
        </div>

        <aside className="sticky top-6 hidden w-[320px] shrink-0 xl:block">
          <p className="mb-2 text-sm font-medium text-gray-600">실시간 모바일 프리뷰</p>
          <MobilePreviewFrame
            slide={mobilePreviewSlide}
            objectFit={heroSlideshow.mobile.objectFit}
            mainLogo={mainLogo}
            marginTopPx={heroSlideshow.mobile.marginTopPx}
            marginBottomPx={heroSlideshow.mobile.marginBottomPx}
            marginLeftPx={heroSlideshow.mobile.marginLeftPx}
            marginRightPx={heroSlideshow.mobile.marginRightPx}
          />
        </aside>
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
