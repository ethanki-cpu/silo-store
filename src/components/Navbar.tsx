"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchNavTabs, getActiveNavTabKey, type NavTab } from "@/lib/navConfig";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";

const TAB_BUTTON_BASE =
  "px-3 py-2 text-sm border-b-2 -mb-px transition-colors";
const TAB_BUTTON_ACTIVE = "border-gray-800 text-gray-900 font-medium";
const TAB_BUTTON_INACTIVE =
  "border-transparent text-gray-500 hover:text-white hover:bg-green-800 hover:border-green-800";

type LogoAlign = "left" | "center" | "right";
type TextPosition = "left" | "right";
type CustomFont = "default" | "Graphire" | "Primor";

type MainLogoValue = {
  type: "text" | "image";
  text: string;
  imageUrl: string;
  heightPx: number;
  align: LogoAlign;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용. */
  extraText: string;
  fontFamily: string;
  bold: boolean;
  fontSizePx: number;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용. */
  textPosition: TextPosition;
  textCustomFont: CustomFont;
  textColor: string;
  leftText: string;
  rightText: string;
  fontFileUrl: string;
};

type SidebarIconsValue = {
  leftIconUrl: string;
  rightIconUrl: string;
  iconSizePx: number;
};

const DEFAULT_LOGO_TEXT = "사일로 스토어";
const DEFAULT_LOGO_HEIGHT_PX = 64;
const DEFAULT_LOGO_FONT_SIZE_PX = 16;
// EPIC-036: 사이드바(green-800, #166534)와 맞춘 기본 추가 텍스트 색상.
const DEFAULT_LOGO_TEXT_COLOR = "#166534";
// EPIC-041: 사이드바 여닫이 아이콘 기본 크기 — 기존 하드코딩 w-8 h-8(32px)과 맞춤.
const DEFAULT_ICON_SIZE_PX = 32;
// EPIC-041: main_logo.fontFileUrl 업로드 시 주입할 @font-face의 font-family 이름.
const UPLOADED_FONT_FAMILY_NAME = "SiloCustomLogoFont";

// EPIC-034-Ext: 커스텀 폰트(Graphire/Primor)는 아직 실제 폰트 파일이
// 없어(globals.css @font-face 뼈대만 존재) serif로 자연스럽게 대체된다.
const CUSTOM_FONT_STACK: Record<Exclude<CustomFont, "default">, string> = {
  Graphire: "'Graphire', serif",
  Primor: "'Primor', serif",
};

export function Navbar() {
  const { session, member, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTabKey = getActiveNavTabKey(
    pathname,
    searchParams.get("category"),
  );

  // 인증 상태(session/member)는 브라우저 localStorage 세션 기준이라 서버는 항상
  // "비로그인"으로 렌더링한다. 클라이언트에서 실제 세션이 채워지기 전까지는
  // mounted=false로 서버와 동일하게(계정 영역 미노출) 렌더링해 hydration
  // mismatch를 방지한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // EPIC-023: 탭/사이드바/드롭다운 구성을 site_navigations(DB)에서 조회.
  // 로딩 중이거나 조회 실패 시 navConfig.ts의 FALLBACK_NAV_TABS로 자동 대체되어
  // 화면에 탭이 아예 비는 일은 없다.
  const [navTabs, setNavTabs] = useState<NavTab[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchNavTabs().then((tabs) => {
      if (!cancelled) setNavTabs(tabs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // EPIC-032: admin/navigation/settings("홈페이지 설정 관리")가 저장한
  // site_settings.main_logo를 조회해 로고를 대체한다. 테이블이 아직 라이브에
  // 없거나(EPIC-026 후속) 값이 비어 있으면 기존 하드코딩 텍스트로 대체되어
  // 로고가 아예 비는 일은 없다.
  const [mainLogo, setMainLogo] = useState<MainLogoValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "main_logo")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const value = data?.setting_value as Partial<MainLogoValue> | null;
        if (value && (value.text || value.imageUrl)) {
          let leftText = value.leftText ?? "";
          let rightText = value.rightText ?? "";
          // EPIC-039: 구버전 extraText+textPosition을 leftText/rightText로 1회 이전.
          if (!leftText && !rightText && value.extraText) {
            if (value.textPosition === "left") {
              leftText = value.extraText;
            } else {
              rightText = value.extraText;
            }
          }
          setMainLogo({
            type: value.type === "image" ? "image" : "text",
            text: value.text ?? "",
            imageUrl: value.imageUrl ?? "",
            heightPx: value.heightPx || DEFAULT_LOGO_HEIGHT_PX,
            align: value.align ?? "left",
            extraText: value.extraText ?? "",
            fontFamily: value.fontFamily ?? "",
            bold: value.bold ?? false,
            fontSizePx: value.fontSizePx || DEFAULT_LOGO_FONT_SIZE_PX,
            textPosition: value.textPosition ?? "right",
            textCustomFont: value.textCustomFont ?? "default",
            textColor: value.textColor || DEFAULT_LOGO_TEXT_COLOR,
            leftText,
            rightText,
            fontFileUrl: value.fontFileUrl ?? "",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // EPIC-039: 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘.
  // 값이 없으면(테이블 미적용 포함) LeftSidebar/RightSidebar가 기존
  // 🔑/🚪 이모지로 자동 대체하므로 아이콘이 아예 비는 일은 없다.
  const [sidebarIcons, setSidebarIcons] = useState<SidebarIconsValue | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "sidebar_icons")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const value = data?.setting_value as Partial<SidebarIconsValue> | null;
        if (value) {
          setSidebarIcons({
            leftIconUrl: value.leftIconUrl ?? "",
            rightIconUrl: value.rightIconUrl ?? "",
            iconSizePx: value.iconSizePx || DEFAULT_ICON_SIZE_PX,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // EPIC-041: 상단 탭(dropdown/sidebar-left/sidebar-right 공통) hover 시
  // 1차 하위 카테고리만 작은 팝업으로 노출한다. EPIC-037~040이 썼던
  // "클릭으로 고정(pinned)" 개념은 완전히 제거했다 — 클릭에 의존하거나
  // 마우스가 벗어난 뒤에도 팝업이 남아있는 문제의 근본 원인이 바로 그
  // pinnedKey 상태였기 때문. 이제 openTab/popupPos는 오직 마우스 진입/이탈
  // (`handleTabMouseEnter`/`handlePopupMouseLeave`)로만 바뀌고, 탭 버튼에는
  // onClick이 아예 없다 — 마우스가 완전히 벗어나면 예외 없이 즉시 닫힌다.
  // 팝업을 `position: fixed`로 유지하는 이유: 상단 nav가 작은 화면에서
  // 가로 스크롤되도록 `overflow-x-auto`를 쓰는데, CSS 스펙상 overflow-x가
  // visible이 아니면 overflow-y도 auto로 강제 계산되어 `position: absolute`
  // 팝업은 그 안에서 잘려 보인다 — `fixed`는 (transform/filter 없는 한)
  // 조상의 overflow에 잘리지 않아 이 문제를 피한다.
  const [openTab, setOpenTab] = useState<NavTab | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const popupRef = useRef<HTMLDivElement | null>(null);

  const leftSidebarTab = navTabs.find((t) => t.type === "sidebar-left");
  const rightSidebarTab = navTabs.find((t) => t.type === "sidebar-right");

  // EPIC-040: 좌/우 전체 높이 사이드바(LeftSidebar/RightSidebar)는 위 상단 탭
  // hover/pin 상태(openTab/pinnedKey)와 완전히 분리된 독립 state로 되돌린다.
  // EPIC-039에서는 이 둘을 하나로 파생시켰는데, 그러면 상단 탭 hover가 항상
  // 전체 사이드바를 열어버려 "탭 hover 시 1차 하위 카테고리만 작은 팝업으로,
  // 2차는 그 안에서 다시 펼쳐지는" 다단계 드롭다운을 상단 탭에 둘 수 없었다
  // (하나의 hover가 두 가지 다른 UI를 동시에 열 수는 없다). 이제 전체
  // 사이드바는 오직 LeftSidebar/RightSidebar 자신의 여닫이 아이콘 버튼으로만
  // 열고 닫는다 — 예전(EPIC-036 이전) 방식 그대로.
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  function closeSidebars() {
    setLeftOpen(false);
    setRightOpen(false);
  }

  function closeTabPopup() {
    setOpenTab(null);
    setPopupPos(null);
  }

  function handleTabMouseEnter(
    tab: NavTab,
    e: React.MouseEvent<HTMLButtonElement>,
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPos({ top: rect.bottom, left: rect.left });
    setOpenTab(tab);
  }

  function handlePopupMouseLeave() {
    setOpenTab(null);
    setPopupPos(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // EPIC-041: 업로드된 커스텀 폰트 파일(fontFileUrl)이 있으면 최우선 적용 —
  // textCustomFont(Graphire/Primor)나 자유 입력 fontFamily보다 우선한다.
  const fontFamilyValue = mainLogo?.fontFileUrl
    ? `'${UPLOADED_FONT_FAMILY_NAME}', sans-serif`
    : mainLogo?.textCustomFont && mainLogo.textCustomFont !== "default"
      ? CUSTOM_FONT_STACK[mainLogo.textCustomFont]
      : mainLogo?.fontFamily || undefined;

  // EPIC-039: 좌/우 로고 텍스트가 공유하는 서체/굵기/크기/색상 스타일.
  const logoSideTextStyle: React.CSSProperties = {
    fontFamily: fontFamilyValue,
    fontWeight: mainLogo?.bold ? "bold" : "normal",
    fontSize: `${mainLogo?.fontSizePx || DEFAULT_LOGO_FONT_SIZE_PX}px`,
    color: mainLogo?.textColor || DEFAULT_LOGO_TEXT_COLOR,
  };

  return (
    <header className="border-b border-gray-200">
      {/* EPIC-041: 관리자가 업로드한 커스텀 폰트 파일을 @font-face로 동적
          주입 — 로고 좌/우 텍스트가 즉시 이 서체를 쓸 수 있게 한다. */}
      {mainLogo?.fontFileUrl && (
        <style>{`
          @font-face {
            font-family: '${UPLOADED_FONT_FAMILY_NAME}';
            src: url('${mainLogo.fontFileUrl}');
            font-display: swap;
          }
        `}</style>
      )}
      <div className="flex items-center p-4 gap-4">
        {/* EPIC-039: 로고 이미지를 중앙에 두고 좌/우 텍스트를 대칭으로
            배치 — 양옆을 동일한 flex-1 컨테이너로 감싸 텍스트 길이가 달라도
            로고 자체는 항상 가운데 유지된다. 이 대칭 레이아웃이 EPIC-034의
            좌/중앙/우 "정렬 위치"(align)를 대체하므로 align은 더 이상 쓰지
            않는다(구버전 데이터 호환을 위해 필드 자체는 남겨둠). */}
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <div className="flex-1 min-w-0 text-right truncate" style={logoSideTextStyle}>
            {mainLogo?.leftText}
          </div>
          <Link href="/" className="font-bold shrink-0">
            {mainLogo?.type === "image" && mainLogo.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainLogo.imageUrl}
                alt={mainLogo.text || DEFAULT_LOGO_TEXT}
                className="w-auto"
                style={{ height: mainLogo.heightPx || DEFAULT_LOGO_HEIGHT_PX }}
              />
            ) : (
              mainLogo?.text || DEFAULT_LOGO_TEXT
            )}
          </Link>
          <div className="flex-1 min-w-0 text-left truncate" style={logoSideTextStyle}>
            {mainLogo?.rightText}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {mounted && !loading && session && member?.is_admin && (
            <Link
              href="/admin/payments"
              className="text-sm text-gray-600 hover:underline"
            >
              관리자
            </Link>
          )}

          {mounted && !loading && session && (
            <Link
              href="/mypage"
              className="text-sm text-gray-600 hover:underline"
            >
              {member
                ? `${member.name}님 · ${member.tier_name}`
                : "회원 정보 불러오는 중..."}
            </Link>
          )}

          {mounted &&
            !loading &&
            (session ? (
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm"
              >
                로그인
              </Link>
            ))}
        </div>
      </div>

      {/* 상단 탭: DB(site_navigations)에서 조회한 navTabs를 그대로 순회하며
          type에 따라 상호작용 방식만 분기. 라벨/링크/그룹 구성은 전부
          DB(관리자 CMS, /admin/navigation)에서 온다.
          EPIC-037: dropdown/sidebar-left/sidebar-right 3개 타입 모두 hover 시
          1차 하위 카테고리 팝업을 노출하는 동일한 상호작용으로 통일 — 예전의
          화면 전체 높이 슬라이드인 사이드바 대신 탭 바로 아래에 작은 팝업만
          뜬다(아래 팝업 렌더링 참고). */}
      <nav className="flex justify-center gap-1 px-4 overflow-x-auto whitespace-nowrap border-t border-gray-100">
        {navTabs.map((tab) => {
          if (tab.type === "link") {
            const className = `${TAB_BUTTON_BASE} ${
              activeTabKey === tab.key ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE
            }`;
            return (
              <Link key={tab.key} href={tab.href!} className={className}>
                {tab.label}
              </Link>
            );
          }

          const isRouteActive = activeTabKey === tab.key;
          const isOpen = openTab?.key === tab.key;
          // 열려 있는 동안(순수 hover)은 사이드바와 동일한 테마 색상
          // (green-800)으로, 그 외엔 hover 시에만 같은 색으로 바뀌도록 한다.
          const className = [
            TAB_BUTTON_BASE,
            isRouteActive ? "border-gray-800 font-medium" : "border-transparent",
            isOpen
              ? "bg-green-800 text-white border-green-800"
              : isRouteActive
                ? "text-gray-900 hover:bg-green-800 hover:text-white hover:border-green-800"
                : "text-gray-500 hover:text-white hover:bg-green-800 hover:border-green-800",
          ].join(" ");

          return (
            <button
              key={tab.key}
              type="button"
              onMouseEnter={(e) => handleTabMouseEnter(tab, e)}
              className={className}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* EPIC-041: 상단 탭 순수 hover 팝업 — dropdown/sidebar-left/sidebar-right
          공통. groups가 있으면(사이드바 타입) 그룹 라벨을 1차 목록으로 보여
          주고, 각 행에 마우스를 올리면 그 그룹의 items가 2차 플라이아웃으로
          옆에 튀어나오는 다단계(Nested) 드롭다운이 된다(2차는 Tailwind
          group/group-hover, 별도 JS state 없이 순수 CSS). groups가 없으면
          (dropdown 타입, 예: 스튜디오) 예전처럼 평평한 items 목록. 전체 높이
          사이드바(LeftSidebar/RightSidebar)와는 완전히 별개다. 클릭으로
          닫는 배경(backdrop)은 두지 않는다 — pinned 상태가 없어 클릭으로
          닫아야 할 일이 없고, 예전엔 이 배경이 hover 중 페이지의 다른 클릭을
          가로채는 부작용이 있었다. */}
      {openTab && popupPos && (
        <div
          ref={popupRef}
          onMouseLeave={handlePopupMouseLeave}
          style={{ top: popupPos.top, left: popupPos.left }}
          className="fixed z-40 w-64 rounded-md border border-gray-200 bg-white shadow-md py-2"
        >
          {openTab.groups && openTab.groups.length > 0
              ? openTab.groups.map((group) => (
                  <div key={group.groupLabel} className="group relative">
                    <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 cursor-default hover:bg-gray-50">
                      <span>{group.groupLabel}</span>
                      <span className="text-gray-400 text-xs">›</span>
                    </div>
                    {/* 2차 플라이아웃 — group-hover로만 노출, JS state 없음. */}
                    <div className="hidden group-hover:block absolute left-full top-0 z-50 ml-1 w-56 rounded-md border border-gray-200 bg-white shadow-md py-2">
                      {group.items.map((item, idx) => (
                        <Link
                          key={`${item.href}-${idx}`}
                          href={item.href}
                          onClick={closeTabPopup}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              : (openTab.items ?? []).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeTabPopup}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                ))}
        </div>
      )}

      {/* EPIC-040: 전체 높이 사이드바 열림 중 뒷배경을 어둡게 — 위 상단 탭
          팝업과는 별개 state(leftOpen/rightOpen)이므로 별도 backdrop. */}
      {(leftOpen || rightOpen) && (
        <div
          onClick={closeSidebars}
          className="fixed inset-0 z-30 bg-black/30"
        />
      )}

      <LeftSidebar
        tab={leftSidebarTab}
        open={leftOpen}
        onIconMouseEnter={() => setLeftOpen(true)}
        onIconClick={() => setLeftOpen(true)}
        onClose={() => setLeftOpen(false)}
        onAmbientLeave={() => setLeftOpen(false)}
        iconUrl={sidebarIcons?.leftIconUrl || undefined}
        iconSizePx={sidebarIcons?.iconSizePx || DEFAULT_ICON_SIZE_PX}
      />
      <RightSidebar
        tab={rightSidebarTab}
        open={rightOpen}
        onIconMouseEnter={() => setRightOpen(true)}
        onIconClick={() => setRightOpen(true)}
        onClose={() => setRightOpen(false)}
        onAmbientLeave={() => setRightOpen(false)}
        iconUrl={sidebarIcons?.rightIconUrl || undefined}
        iconSizePx={sidebarIcons?.iconSizePx || DEFAULT_ICON_SIZE_PX}
      />
    </header>
  );
}
