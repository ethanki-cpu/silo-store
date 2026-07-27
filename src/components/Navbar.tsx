"use client";

import { useEffect, useState } from "react";
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
};

const DEFAULT_LOGO_TEXT = "사일로 스토어";
const DEFAULT_LOGO_HEIGHT_PX = 64;
const DEFAULT_LOGO_FONT_SIZE_PX = 16;

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
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<NavTab | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const leftSidebarTab = navTabs.find((t) => t.type === "sidebar-left");
  const rightSidebarTab = navTabs.find((t) => t.type === "sidebar-right");

  function openDropdown(tab: NavTab, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom, left: rect.left });
    setDropdownTab(tab);
  }

  function closeDropdown() {
    setDropdownTab(null);
    setDropdownPos(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function closeSidebars() {
    setLeftOpen(false);
    setRightOpen(false);
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
              className="text-gray-900"
              style={{
                fontFamily:
                  mainLogo.textCustomFont && mainLogo.textCustomFont !== "default"
                    ? CUSTOM_FONT_STACK[mainLogo.textCustomFont]
                    : mainLogo.fontFamily || undefined,
                fontWeight: mainLogo.bold ? "bold" : "normal",
                fontSize: `${mainLogo.fontSizePx || DEFAULT_LOGO_FONT_SIZE_PX}px`,
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
          DB(관리자 CMS, /admin/navigation)에서 온다. */}
      <nav className="flex justify-center gap-1 px-4 overflow-x-auto whitespace-nowrap border-t border-gray-100">
        {navTabs.map((tab) => {
          const className = `${TAB_BUTTON_BASE} ${
            activeTabKey === tab.key ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE
          }`;

          if (tab.type === "link") {
            return (
              <Link key={tab.key} href={tab.href!} className={className}>
                {tab.label}
              </Link>
            );
          }

          if (tab.type === "dropdown") {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={(e) => openDropdown(tab, e)}
                onMouseEnter={(e) => openDropdown(tab, e)}
                className={className}
              >
                {tab.label}
              </button>
            );
          }

          const openSidebar =
            tab.type === "sidebar-left"
              ? () => setLeftOpen(true)
              : () => setRightOpen(true);

          return (
            <button
              key={tab.key}
              type="button"
              onClick={openSidebar}
              onMouseEnter={openSidebar}
              className={className}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {dropdownTab && dropdownPos && (
        <>
          <div onClick={closeDropdown} className="fixed inset-0 z-30" />
          <div
            onMouseLeave={closeDropdown}
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            className="fixed z-40 w-56 rounded-md border border-gray-200 bg-white shadow-md py-1"
          >
            {(dropdownTab.items ?? []).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDropdown}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* 좌측 사이드바 (type: "sidebar-left") */}
      {leftSidebarTab && (
        <>
          {!leftOpen && (
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              onMouseEnter={() => setLeftOpen(true)}
              aria-label={`${leftSidebarTab.label} 메뉴 열기`}
              className="fixed left-0 top-1/2 -translate-y-1/2 z-40 rounded-r-md bg-green-800 text-white px-2 py-3 text-lg shadow-md"
            >
              🔑
            </button>
          )}

          <div
            onMouseLeave={() => setLeftOpen(false)}
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-800 text-white transform transition-transform duration-200 ${
              leftOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <span className="font-semibold">{leftSidebarTab.label}</span>
              <button
                type="button"
                onClick={() => setLeftOpen(false)}
                aria-label="닫기"
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="p-2 overflow-y-auto max-h-[calc(100vh-64px)]">
              {(leftSidebarTab.groups ?? []).map((group) => (
                <div key={group.groupLabel} className="mb-4">
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                    {group.groupLabel}
                  </p>
                  {group.items.map((item, idx) => (
                    <Link
                      key={`${item.href}-${idx}`}
                      href={item.href}
                      onClick={closeSidebars}
                      className="block px-3 py-2 rounded-md text-sm text-white hover:bg-white/10"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* 우측 사이드바 (type: "sidebar-right") */}
      {rightSidebarTab && (
        <>
          {!rightOpen && (
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              onMouseEnter={() => setRightOpen(true)}
              aria-label={`${rightSidebarTab.label} 메뉴 열기`}
              className="fixed right-0 top-1/2 -translate-y-1/2 z-40 rounded-l-md bg-green-800 text-white px-2 py-3 text-lg shadow-md"
            >
              🚪
            </button>
          )}

          <div
            onMouseLeave={() => setRightOpen(false)}
            className={`fixed inset-y-0 right-0 z-50 w-64 bg-green-800 text-white transform transition-transform duration-200 ${
              rightOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <span className="font-semibold">{rightSidebarTab.label}</span>
              <button
                type="button"
                onClick={() => setRightOpen(false)}
                aria-label="닫기"
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="p-2 overflow-y-auto max-h-[calc(100vh-64px)]">
              {(rightSidebarTab.groups ?? []).map((group) => (
                <div key={group.groupLabel} className="mb-4">
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                    {group.groupLabel}
                  </p>
                  {group.items.map((item, idx) => (
                    <Link
                      key={`${item.href}-${idx}`}
                      href={item.href}
                      onClick={closeSidebars}
                      className="block px-3 py-2 rounded-md text-sm text-white hover:bg-white/10"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </>
      )}

      {(leftOpen || rightOpen) && (
        <div
          onClick={closeSidebars}
          className="fixed inset-0 z-30 bg-black/30"
        />
      )}
    </header>
  );
}
