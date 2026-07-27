"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchNavTabs, getActiveNavTabKey, type NavTab } from "@/lib/navConfig";

const TAB_BUTTON_BASE =
  "px-3 py-2 text-sm border-b-2 -mb-px";
const TAB_BUTTON_ACTIVE = "border-gray-800 text-gray-900 font-medium";
const TAB_BUTTON_INACTIVE =
  "border-transparent text-gray-500 hover:text-gray-700";

type LogoAlign = "left" | "center" | "right";
type TextPosition = "left" | "right";
type CustomFont = "default" | "Graphire" | "Primor";

type MainLogoValue = {
  type: "text" | "image";
  text: string;
  imageUrl: string;
  heightPx: number;
  align: LogoAlign;
  extraText: string;
  fontFamily: string;
  bold: boolean;
  fontSizePx: number;
  textPosition: TextPosition;
  textCustomFont: CustomFont;
  textColor: string;
};

const DEFAULT_LOGO_TEXT = "사일로 스토어";
const DEFAULT_LOGO_HEIGHT_PX = 64;
const DEFAULT_LOGO_FONT_SIZE_PX = 16;
// EPIC-036: 사이드바(green-800, #166534)와 맞춘 기본 추가 텍스트 색상.
const DEFAULT_LOGO_TEXT_COLOR = "#166534";

const LOGO_ALIGN_CLASS: Record<LogoAlign, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

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
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // EPIC-037: 상단 탭(dropdown/sidebar-left/sidebar-right 공통) hover 시
  // 1차 하위 카테고리만 작은 팝업으로 노출하고, 클릭 시에는 그 팝업이
  // "고정(pinned)"되어 바깥을 클릭하기 전까지 열려 있는다. openTab이 실제로
  // 화면에 뜨는 팝업의 내용을, pinnedKey는 그 팝업이 hover가 아니라 클릭으로
  // 고정된 상태인지를 나타낸다 — pinned 상태에서는 다른 탭에 마우스를 올려도
  // 팝업이 바뀌지 않고(의도치 않은 깜빡임 방지), 바깥을 클릭해야만 닫힌다.
  const [openTab, setOpenTab] = useState<NavTab | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  function closeTabPopup() {
    setOpenTab(null);
    setPopupPos(null);
    setPinnedKey(null);
  }

  function handleTabMouseEnter(
    tab: NavTab,
    e: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (pinnedKey) return; // 다른 탭이 클릭으로 고정돼 있으면 hover로 바꾸지 않는다.
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPos({ top: rect.bottom, left: rect.left });
    setOpenTab(tab);
  }

  function handleTabClick(tab: NavTab, e: React.MouseEvent<HTMLButtonElement>) {
    if (pinnedKey === tab.key) {
      closeTabPopup();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPos({ top: rect.bottom, left: rect.left });
    setOpenTab(tab);
    setPinnedKey(tab.key);
  }

  function handlePopupMouseLeave() {
    if (pinnedKey) return; // 고정된 상태는 바깥 클릭으로만 닫는다.
    setOpenTab(null);
    setPopupPos(null);
  }

  // 고정(pinned) 상태에서 팝업/탭 바깥을 클릭하면 고정을 해제하고 닫는다.
  useEffect(() => {
    if (!pinnedKey) return;
    function handleDocumentMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if (navRef.current?.contains(target)) return;
      setOpenTab(null);
      setPopupPos(null);
      setPinnedKey(null);
    }
    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [pinnedKey]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200">
      <div className="flex items-center p-4 gap-4">
        {/* EPIC-034: 로고+추가텍스트를 계정 영역과 별개의 flex-1 컨테이너로
            감싸, "정렬 위치" 설정이 로그인/마이페이지 등 계정 영역 배치는
            건드리지 않고 로고 블록 안에서만 좌/중앙/우측으로 움직이게 한다. */}
        <div
          className={`flex items-center gap-2 flex-1 min-w-0 ${
            LOGO_ALIGN_CLASS[mainLogo?.align ?? "left"]
          } ${
            // EPIC-034-Ext: textPosition="left"면 추가 텍스트가 로고보다 먼저
            // 오도록 렌더링 순서를 뒤집는다.
            mainLogo?.textPosition === "left" ? "flex-row-reverse" : ""
          }`}
        >
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
          {mainLogo?.extraText && (
            <span
              style={{
                fontFamily:
                  mainLogo.textCustomFont && mainLogo.textCustomFont !== "default"
                    ? CUSTOM_FONT_STACK[mainLogo.textCustomFont]
                    : mainLogo.fontFamily || undefined,
                fontWeight: mainLogo.bold ? "bold" : "normal",
                fontSize: `${mainLogo.fontSizePx || DEFAULT_LOGO_FONT_SIZE_PX}px`,
                color: mainLogo.textColor || DEFAULT_LOGO_TEXT_COLOR,
              }}
            >
              {mainLogo.extraText}
            </span>
          )}
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
      <nav
        ref={navRef}
        className="flex justify-center gap-1 px-4 overflow-x-auto whitespace-nowrap border-t border-gray-100"
      >
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
          const isOpen =
            pinnedKey === tab.key || (!pinnedKey && openTab?.key === tab.key);
          // 열려 있을 때(hover 미리보기 포함)는 사이드바와 동일한 테마 색상
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
              onClick={(e) => handleTabClick(tab, e)}
              onMouseEnter={(e) => handleTabMouseEnter(tab, e)}
              className={className}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* EPIC-037: dropdown/sidebar-left/sidebar-right 공통 하위 카테고리 팝업.
          groups(사이드바 타입)가 있으면 그룹 라벨+항목을, 없으면(dropdown 타입)
          평평한 items 목록을 보여준다. 배경(fixed inset-0)은 클릭 시 팝업을
          닫는 용도 — hover만으로는 열리고 닫히되, 클릭으로 고정된 뒤에는 이
          배경을 포함한 바깥 클릭이 있어야 닫힌다(위 useEffect 참고). */}
      {openTab && popupPos && (
        <>
          <div onClick={closeTabPopup} className="fixed inset-0 z-30" />
          <div
            ref={popupRef}
            onMouseLeave={handlePopupMouseLeave}
            style={{ top: popupPos.top, left: popupPos.left }}
            className="fixed z-40 w-64 max-h-[70vh] overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md py-2"
          >
            {openTab.groups && openTab.groups.length > 0 ? (
              openTab.groups.map((group) => (
                <div key={group.groupLabel} className="mb-2 last:mb-0">
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {group.groupLabel}
                  </p>
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
              ))
            ) : (
              (openTab.items ?? []).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeTabPopup}
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </header>
  );
}
