"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchNavTabs, getActiveNavTabKey, type NavTab } from "@/lib/navConfig";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { MembershipPopover } from "@/components/MembershipPopover";

const TAB_BUTTON_BASE =
  "px-3 py-2 text-sm border-b-2 -mb-px transition-colors";
const TAB_BUTTON_ACTIVE = "border-gray-800 text-gray-900 font-medium";
const TAB_BUTTON_INACTIVE =
  "border-transparent text-gray-500 hover:text-white hover:bg-green-800 hover:border-green-800";

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
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용. */
  extraText: string;
  fontFamily: string;
  bold: boolean;
  fontSizePx: number;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용. */
  textPosition: TextPosition;
  textColor: string;
  leftText: string;
  rightText: string;
  /** @deprecated EPIC-043: customFonts(배열)로 대체. 구버전 데이터 호환용. */
  fontFileUrl: string;
  customFonts: CustomFontEntry[];
};

// EPIC-078: 기본(default)/호버(hover) 2종 미디어로 확장 — settings/page.tsx
// 참고. 구버전 leftIconUrl/rightIconUrl(단일 URL)은 아래 fetch 시
// leftIconDefaultUrl/rightIconDefaultUrl로 폴백한다.
type SidebarIconsValue = {
  leftIconDefaultUrl: string;
  leftIconHoverUrl: string;
  rightIconDefaultUrl: string;
  rightIconHoverUrl: string;
  iconSizePx: number;
  backgroundColor: string;
  triggerMode: "click" | "hover";
};

// EPIC-079-PHASE-4: /admin/navigation/settings("홈페이지 설정 관리")의
// "상단 탭 디자인" 섹션이 저장하는 값 — admin/navigation/settings/page.tsx의
// 동명 타입과 구조가 동일하다(이 저장소의 다른 site_settings 값들처럼 두
// 파일에 각자 선언, MainLogoValue/SidebarIconsValue와 같은 기존 관례).
type TopTabStyleEntry = {
  labelOverride: string;
  fontFamily: string;
  fontSizePx: number | null;
  bold: boolean;
  color: string;
  customFonts: CustomFontEntry[];
};
type TopTabStyleValue = {
  tabs: Record<string, TopTabStyleEntry>;
};

const DEFAULT_LOGO_TEXT = "사일로 스토어";
const DEFAULT_LOGO_HEIGHT_PX = 64;
const DEFAULT_LOGO_FONT_SIZE_PX = 16;
// EPIC-036: 사이드바(green-800, #166534)와 맞춘 기본 추가 텍스트 색상.
const DEFAULT_LOGO_TEXT_COLOR = "#166534";
// EPIC-041: 사이드바 여닫이 아이콘 기본 크기 — 기존 하드코딩 w-8 h-8(32px)과 맞춤.
const DEFAULT_ICON_SIZE_PX = 32;
// EPIC-076: 사이드바 여닫이 버튼 배경색 기본값 — 기존 하드코딩 bg-green-800(#166534)과 맞춤.
const DEFAULT_ICON_BG_COLOR = "#166534";
// EPIC-077: 사이드바 여닫이 트리거 모드 기본값 — 호버 시 아르누보 애니메이션만
// 재생되고 클릭해야 패널이 열리도록 "click"을 기본으로 한다.
const DEFAULT_TRIGGER_MODE: "click" | "hover" = "click";
// EPIC-043: main_logo.customFonts의 각 활성 항목에 주입할 @font-face의
// font-family 이름 접두사 — 항목 id로 구분해 여러 개를 동시에 등록한다.
const CUSTOM_FONT_FAMILY_PREFIX = "SiloCustomLogoFont";
// EPIC-079-PHASE-4: 상단 탭 커스텀 폰트의 @font-face 접두사 — 탭 id도
// 함께 섞어 탭마다 독립된 font-family 이름을 만든다(다른 탭이 같은 폰트
// 파일 URL을 써도 이름이 안 겹치게).
const TOP_TAB_FONT_FAMILY_PREFIX = "SiloTopTabFont";

export function Navbar() {
  const { session, member, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTabKey = getActiveNavTabKey(
    pathname,
    searchParams.get("category"),
  );

  // EPIC-084: Contextual Write — 게시판 상세(/boards/[slug](/...)?)에서 전역
  // "글쓰기" 버튼을 누르면 지금 보고 있던 게시판이 /write?boardId=<slug>로
  // 자동 전달돼 에디터가 그 게시판을 기본 선택해둔다. 게시판 컨텍스트가
  // 없는 곳(홈페이지 등)에서는 파라미터 없이 /write로 이동해 사용자가
  // WriteBoardForm의 "게시될 페이지 선택" 드롭다운에서 직접 고른다.
  const boardSlugMatch = pathname.match(/^\/boards\/([^/]+)/);
  const writeHref = boardSlugMatch ? `/write?boardId=${encodeURIComponent(boardSlugMatch[1])}` : "/write";

  // 인증 상태(session/member)는 브라우저 localStorage 세션 기준이라 서버는 항상
  // "비로그인"으로 렌더링한다. 클라이언트에서 실제 세션이 채워지기 전까지는
  // mounted=false로 서버와 동일하게(계정 영역 미노출) 렌더링해 hydration
  // mismatch를 방지한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // EPIC-087-PHASE-F: GNB "멤버십 등급"/"회원 이름" 클릭 시 여는 팝오버.
  const [popoverOpen, setPopoverOpen] = useState(false);

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
          // EPIC-043: 구버전 단일 fontFileUrl을 customFonts 배열로 1회 이전.
          const customFonts =
            value.customFonts && value.customFonts.length > 0
              ? value.customFonts
              : value.fontFileUrl
                ? [{ id: "legacy", url: value.fontFileUrl, isActive: true }]
                : [];
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
            textColor: value.textColor || DEFAULT_LOGO_TEXT_COLOR,
            leftText,
            rightText,
            fontFileUrl: value.fontFileUrl ?? "",
            customFonts,
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
        // EPIC-078: 구버전 leftIconUrl/rightIconUrl(단일 URL)을
        // leftIconDefaultUrl/rightIconDefaultUrl로 폴백한다.
        const value = data?.setting_value as
          | (Partial<SidebarIconsValue> & { leftIconUrl?: string; rightIconUrl?: string })
          | null;
        if (value) {
          setSidebarIcons({
            leftIconDefaultUrl: value.leftIconDefaultUrl || value.leftIconUrl || "",
            leftIconHoverUrl: value.leftIconHoverUrl ?? "",
            rightIconDefaultUrl: value.rightIconDefaultUrl || value.rightIconUrl || "",
            rightIconHoverUrl: value.rightIconHoverUrl ?? "",
            iconSizePx: value.iconSizePx || DEFAULT_ICON_SIZE_PX,
            backgroundColor: value.backgroundColor || DEFAULT_ICON_BG_COLOR,
            triggerMode: value.triggerMode === "hover" ? "hover" : DEFAULT_TRIGGER_MODE,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // EPIC-079-PHASE-4: 상단 탭 개별 디자인(표시 텍스트/서체/크기/색상) —
  // /admin/navigation/settings의 "상단 탭 디자인" 섹션이 저장한다. 값이
  // 없거나 특정 탭에 대한 항목이 없으면 그 탭은 기존처럼 원래 제목/기본
  // 스타일 그대로 렌더링된다(완전히 optional한 오버레이).
  const [topTabStyle, setTopTabStyle] = useState<TopTabStyleValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "top_tab_style")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const value = data?.setting_value as Partial<TopTabStyleValue> | null;
        if (value?.tabs) setTopTabStyle({ tabs: value.tabs });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // EPIC-054D(성능 감사 §12): Navbar는 mounted/navTabs/mainLogo/sidebarIcons
  // 등 여러 독립 state를 갖고 있어 어느 하나만 바뀌어도 전체가 리렌더된다 —
  // navTabs가 최대 ~96개 항목을 갖는 배열이라(§15) find/filter/map을 매
  // 렌더마다 재계산하지 않도록 그 결과만 메모이즈한다(로직/출력은 동일).
  const leftSidebarTab = useMemo(
    () => navTabs.find((t) => t.type === "sidebar-left"),
    [navTabs],
  );
  const rightSidebarTab = useMemo(
    () => navTabs.find((t) => t.type === "sidebar-right"),
    [navTabs],
  );

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // EPIC-043: "적용" 켜진 커스텀 폰트들을 등록 순서대로 font-family 폴백
  // 체인으로 연결 — 맨 앞 폰트가 우선이고, 로드 실패 시 다음 활성 폰트로,
  // 전부 실패하면 자유 입력 fontFamily/sans-serif로 자연스럽게 대체된다.
  // EPIC-054D: 이 두 값은 eslint-config-next에 포함된 React Compiler 대비
  // lint 규칙과 충돌해(수동 useMemo의 의존성 배열이 컴파일러 추론과
  // 어긋남) 원래 형태(일반 계산)로 유지한다 — leftSidebarTab/rightSidebarTab처럼
  // 단순 배열 조회가 아니라 마지막 값이 여러 소스에서 합성되는 파생값이라
  // 발생하는 문제. `next.config.ts`에 `experimental.reactCompiler`가 아직
  // 켜져 있지 않아 실제 컴파일러 최적화는 없으므로 동작 차이는 없다.
  const activeCustomFonts = (mainLogo?.customFonts ?? []).filter(
    (f) => f.isActive && f.url,
  );
  const fontFamilyValue =
    activeCustomFonts.length > 0
      ? activeCustomFonts
          .map((f) => `'${CUSTOM_FONT_FAMILY_PREFIX}-${f.id}'`)
          .concat(mainLogo?.fontFamily ? [mainLogo.fontFamily] : ["sans-serif"])
          .join(", ")
      : mainLogo?.fontFamily || undefined;

  // EPIC-039: 좌/우 로고 텍스트가 공유하는 서체/굵기/크기/색상 스타일.
  const logoSideTextStyle: React.CSSProperties = {
    fontFamily: fontFamilyValue,
    fontWeight: mainLogo?.bold ? "bold" : "normal",
    fontSize: `${mainLogo?.fontSizePx || DEFAULT_LOGO_FONT_SIZE_PX}px`,
    color: mainLogo?.textColor || DEFAULT_LOGO_TEXT_COLOR,
  };

  // EPIC-079-PHASE-4: 상단 탭 개별 디자인 파생값들 — 탭 id(NavTab.key)마다
  // 독립된 className(silo-top-tab-<id>)을 만들고, 그 className에 대한
  // font-family/size/weight/color 규칙을 <style> 블록 하나로 동적 주입한다.
  // 인라인 style prop 대신 className+<style> 방식을 쓰는 이유: 인라인
  // style은 특정도가 가장 높아 hover 시 흰 글씨로 바뀌는 기존 동작
  // (group-hover/tab:text-white)까지 영구히 덮어써버린다 — 별도 클래스로
  // 분리해야 "평소엔 커스텀 색, hover 땐 그대로 흰색"을 둘 다 지킬 수 있다.
  const topTabEntries = topTabStyle?.tabs ?? {};
  function topTabClassSuffix(tabKey: string) {
    return tabKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  function topTabFontFamilyValue(tabKey: string, entry: TopTabStyleEntry) {
    const active = entry.customFonts.filter((f) => f.isActive && f.url);
    if (active.length === 0) return entry.fontFamily || undefined;
    return active
      .map((f) => `'${TOP_TAB_FONT_FAMILY_PREFIX}-${topTabClassSuffix(tabKey)}-${f.id}'`)
      .concat(entry.fontFamily ? [entry.fontFamily] : ["inherit"])
      .join(", ");
  }
  const topTabStyleCss = Object.entries(topTabEntries)
    .map(([tabId, entry]) => {
      const rules: string[] = [];
      const ff = topTabFontFamilyValue(tabId, entry);
      if (ff) rules.push(`font-family: ${ff} !important;`);
      if (entry.fontSizePx) rules.push(`font-size: ${entry.fontSizePx}px !important;`);
      if (entry.bold) rules.push(`font-weight: bold !important;`);
      if (entry.color) rules.push(`color: ${entry.color} !important;`);
      if (rules.length === 0) return "";
      const cls = `silo-top-tab-${topTabClassSuffix(tabId)}`;
      // hover 시엔 기존 배경(green-800)과의 대비를 위해 커스텀 색상 대신
      // 항상 흰 글씨를 유지한다 — 서체/크기/굵기는 hover에서도 그대로.
      return `.${cls} { ${rules.join(" ")} }\n.${cls}:hover { color: #fff !important; }`;
    })
    .filter(Boolean)
    .join("\n");

  return (
    <header className="border-b border-gray-200">
      {/* EPIC-043: "적용" 켜진 커스텀 폰트마다 각각 @font-face를 동적 주입 —
          로고 좌/우 텍스트가 즉시 이 서체들을(폴백 체인으로) 쓸 수 있게 한다. */}
      {activeCustomFonts.length > 0 && (
        <style>{`
          ${activeCustomFonts
            .map(
              (f) => `@font-face {
            font-family: '${CUSTOM_FONT_FAMILY_PREFIX}-${f.id}';
            src: url('${f.url}');
            font-display: swap;
          }`,
            )
            .join("\n")}
        `}</style>
      )}
      {/* EPIC-079-PHASE-4: 상단 탭별 커스텀 폰트 @font-face + 탭별 스타일
          규칙(topTabStyleCss) — 로고 폰트 블록과 동일한 패턴, 탭 id별로
          독립된 font-family 이름을 쓴다(다른 탭이 같은 폰트 URL을 등록해도
          서로 안 겹침). */}
      {Object.entries(topTabEntries).some(([, e]) => e.customFonts.some((f) => f.isActive && f.url)) && (
        <style>{`
          ${Object.entries(topTabEntries)
            .flatMap(([tabId, entry]) =>
              entry.customFonts
                .filter((f) => f.isActive && f.url)
                .map(
                  (f) => `@font-face {
              font-family: '${TOP_TAB_FONT_FAMILY_PREFIX}-${topTabClassSuffix(tabId)}-${f.id}';
              src: url('${f.url}');
              font-display: swap;
            }`,
                ),
            )
            .join("\n")}
        `}</style>
      )}
      {topTabStyleCss && <style>{topTabStyleCss}</style>}
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

        <div className="flex items-center gap-3 shrink-0 relative">
          {mounted && !loading && session && member?.is_admin && (
            <Link
              href="/admin/payments"
              className="text-sm text-gray-600 hover:underline"
            >
              관리자
            </Link>
          )}

          {/* EPIC-087-PHASE-F: GNB 우측 순서 — [멤버십 신청/등급] |
              [마이페이지] | [회원 이름] | [로그아웃]. 이전엔 등급+이름이
              "/mypage" 링크 하나로 합쳐져 있었다 — 요구사항대로 3개 항목으로
              분리. 등급 항목/이름 항목 모두 클릭하면 같은 멤버십 팝오버가
              열린다(요구사항 원문 그대로) — member가 아직 없으면(로딩 중
              또는 회원 행 없음) 팝오버를 띄울 데이터가 없어 대신 /membership
              으로 보낸다. */}
          {mounted && !loading && session && (
            member ? (
              <button
                type="button"
                onClick={() => setPopoverOpen((o) => !o)}
                className="text-sm text-gray-600 hover:underline"
              >
                {member.tier_name}
              </button>
            ) : (
              <Link href="/membership" className="text-sm text-gray-600 hover:underline">
                멤버십 신청
              </Link>
            )
          )}

          {mounted && !loading && session && (
            <Link href="/mypage" className="text-sm text-gray-600 hover:underline">
              마이페이지
            </Link>
          )}

          {mounted && !loading && session && member && (
            <button
              type="button"
              onClick={() => setPopoverOpen((o) => !o)}
              className="text-sm text-gray-600 hover:underline"
            >
              {member.name}
            </button>
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

          {popoverOpen && member && (
            <MembershipPopover
              memberId={member.id}
              memberName={member.name}
              tierName={member.tier_name}
              onClose={() => setPopoverOpen(false)}
            />
          )}
        </div>
      </div>

      {/* 상단 탭: DB(site_navigations)에서 조회한 navTabs를 그대로 순회하며
          type에 따라 상호작용 방식만 분기. 라벨/링크/그룹 구성은 전부
          DB(관리자 CMS, /admin/navigation)에서 온다.
          EPIC-041-042-HOTFIX: 드롭다운을 JS state(openTab/popupPos + mouse
          enter/leave 핸들러) 대신 순수 Tailwind `group`/`group-hover`로
          재구현 — 마우스가 이동하는 서로 다른 두 DOM 요소(버튼과, 별도로
          렌더링되던 fixed 팝업) 사이에서 enter/leave 타이밍이 어긋나
          "벗어나도 안 닫히는" 버그가 있었다. 이제 트리거(버튼)와 팝업이
          같은 `relative group/tab` 컨테이너 안에 중첩된 DOM 자식이라 CSS
          :hover가 이 컨테이너 전체를 기준으로 계산되고, 여기서 완전히
          벗어나는 즉시 브라우저가 알아서 닫는다 — JS는 전혀 관여하지
          않는다. 탭↔팝업, 그룹↔플라이아웃 사이의 시각적 간격은 그 간격을
          팝업/플라이아웃 wrapper 자신의 padding(pt-4/pl-2)으로 만들어
          "투명한 다리" 역할을 하게 했다 — 그 패딩도 같은 hover 대상 박스의
          일부라 마우스가 빈 공간을 지나도 hover가 끊기지 않는다. 이름 있는
          그룹(`group/tab`, `group/row`)을 쓰는 이유: 이름 없는 `group`을
          중첩하면 Tailwind가 "가장 가까운 조상"이 아니라 "어떤 조상이든
          .group이고 hover 중이면" 매칭하므로, 상위 탭에 마우스를 올리기만
          해도 모든 하위 그룹의 2차 플라이아웃이 한꺼번에 열려버린다. */}
      <nav className="flex flex-wrap justify-center gap-1 px-4 border-t border-gray-100">
        {navTabs.map((tab) => {
          // EPIC-079-PHASE-4: "상단 탭 디자인"에서 저장한 표시 텍스트
          // 오버라이드/커스텀 클래스 — 값이 없으면 완전히 기존과 동일.
          const tabStyleEntry = topTabEntries[tab.key];
          const tabLabel = tabStyleEntry?.labelOverride || tab.label;
          const tabStyleClassName = tabStyleEntry ? `silo-top-tab-${topTabClassSuffix(tab.key)}` : "";

          // EPIC-084-REVISED: 전역 "글쓰기" 버튼 — "마이 페이지" 탭 바로
          // 오른쪽에 노출한다(요구사항 갱신: 기존 EPIC-084는 왼쪽에 뒀었는데
          // "마이 페이지 오른쪽"으로 정정됨 — 최종 순서 About Silo | 사일로
          // 상점 | 살롱데상 | 스튜디오 | 마이 페이지 | 글쓰기). 이 탭 순서가
          // 항상 고정은 아니지만(§1 문서 기준 DOM 순서일 뿐 site_navigations
          // sort_order로 바뀔 수 있음) key === "mypage"인 탭 바로 뒤에
          // 끼워 넣는 것이 "마이 페이지 오른쪽"이라는 요구를 가장 안정적으로
          // 만족한다.
          const writeButtonEl =
            tab.key === "mypage" ? (
              <Link
                key="global-write-button"
                href={writeHref}
                className={`${TAB_BUTTON_BASE} ${TAB_BUTTON_INACTIVE}`}
              >
                글쓰기
              </Link>
            ) : null;

          if (tab.type === "link") {
            const className = `${TAB_BUTTON_BASE} ${
              activeTabKey === tab.key ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE
            } ${tabStyleClassName}`;
            return (
              <Fragment key={tab.key}>
                <Link href={tab.href!} className={className}>
                  {tabLabel}
                </Link>
                {writeButtonEl}
              </Fragment>
            );
          }

          const isRouteActive = activeTabKey === tab.key;
          const hasChildren =
            (tab.groups && tab.groups.length > 0) ||
            (tab.items && tab.items.length > 0);

          // hover 중(group-hover/tab)에는 사이드바와 동일한 테마 색상
          // (green-800)으로, 그 외엔 route-active 여부만 반영한다.
          const className = [
            tabStyleClassName,
            TAB_BUTTON_BASE,
            isRouteActive ? "border-gray-800 font-medium" : "border-transparent",
            isRouteActive ? "text-gray-900" : "text-gray-500",
            "group-hover/tab:bg-green-800 group-hover/tab:text-white group-hover/tab:border-green-800",
          ].join(" ");

          return (
            <Fragment key={tab.key}>
              <div className="relative group/tab">
              {/* EPIC-058: href가 있는 드롭다운 트리거(예: 스튜디오 →
                  /studio)는 클릭하면 Hub Page로 이동한다 — 펼침(hover)은
                  기존 그대로 별도 동작이라 이동 여부와 섞이지 않는다. href가
                  없는 탭은 기존처럼 클릭 불가한 버튼. */}
              {tab.href ? (
                <Link
                  href={tab.href}
                  onClick={(e) => e.currentTarget.blur()}
                  className={className}
                  aria-haspopup={hasChildren ? "true" : undefined}
                >
                  {tabLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  className={className}
                  aria-haspopup={hasChildren ? "true" : undefined}
                >
                  {tabLabel}
                </button>
              )}

              {hasChildren && (
                // 브릿지: top-full로 버튼 바로 아래에 붙이고, pt-4를 이
                // wrapper 자신의 padding으로 둬 hover 시 그 여백까지 hover
                // 판정 영역에 포함시킨다(마우스가 버튼→메뉴로 내려가는
                // 동안 hover가 끊기지 않게).
                // EPIC-054D(접근성 감사 §13): group-focus-within도 함께
                // 걸어 키보드 Tab만으로도 열리게 한다 — 트리거 버튼에
                // 포커스가 오면 :focus-within이 매칭돼 패널이 보이고, 그
                // 다음 Tab이 자연스럽게 안쪽 링크로 이어진다(JS state 없이
                // 순수 CSS로, EPIC-041-042-HOTFIX가 피하려던 JS hover 버그를
                // 재도입하지 않음).
                <div className="hidden group-hover/tab:block group-focus-within/tab:block absolute left-0 top-full pt-4 z-40">
                  <div className="w-64 rounded-md border border-gray-200 bg-white shadow-md py-2">
                    {tab.groups && tab.groups.length > 0
                      ? tab.groups.map((group) => (
                          <div key={group.groupLabel} className="relative group/row">
                            {/* EPIC-054D(접근성 감사 §13): 순수 텍스트 div였던
                                그룹 라벨을 포커스 가능한 버튼으로 바꿔 Tab으로도
                                도달 가능하게 한다 — 그래야 group-focus-within/row가
                                트리거될 수 있다(숨겨진(hidden) 자손은 애초에 Tab으로
                                포커스를 받을 수 없어, 트리거 자체가 포커스 가능해야
                                2차 플라이아웃이 키보드로도 열린다).
                                EPIC-063: group.href가 있으면(사일로 보물들→/treasures,
                                온라인 도슨트→/docent, 사일로 유산→/heritage,
                                커뮤니티→/community, 멤버십→/membership,
                                갤러리→/gallery, 아카이브→/archive 등) 클릭 시 해당
                                Hub Page로 이동하는 Link로 렌더링 — LeftSidebar.tsx/
                                RightSidebar.tsx와 동일한 분기(href 없으면 클릭 불가
                                버튼 그대로 유지). 펼침(hover)은 이동과 무관하게
                                기존 그대로 group-hover/row로 동작한다.
                                EPIC-069 후속 핫픽스: 클릭하면 브라우저가 이 Link에
                                포커스를 주는데, Next.js 클라이언트 사이드 라우팅은
                                포커스를 초기화하지 않아 이동 후에도 이 Link가 계속
                                포커스를 쥐고 있었다 — group-focus-within/row(그리고
                                조상인 group-focus-within/tab)가 계속 참으로 남아
                                마우스가 벗어나도 이 그룹(과 상위 탭 메가메뉴)이
                                펼쳐진 채로 "고정"되는 버그의 실제 원인이었다.
                                onClick에서 즉시 blur()해 해결. */}
                            {group.href ? (
                              <Link
                                href={group.href}
                                onClick={(e) => e.currentTarget.blur()}
                                aria-haspopup="true"
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                              >
                                <span>{group.groupLabel}</span>
                                <span className="text-gray-400 text-xs">›</span>
                              </Link>
                            ) : (
                              <button
                                type="button"
                                aria-haspopup="true"
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 cursor-default hover:bg-gray-50 text-left"
                              >
                                <span>{group.groupLabel}</span>
                                <span className="text-gray-400 text-xs">›</span>
                              </button>
                            )}
                            {/* 2차 플라이아웃 — group-hover/row 또는
                                group-focus-within/row로 노출, JS 없음.
                                pl-2가 그룹 행↔플라이아웃 사이의 브릿지 역할. */}
                            <div className="hidden group-hover/row:block group-focus-within/row:block absolute left-full top-0 pl-2 z-50">
                              <div className="w-56 rounded-md border border-gray-200 bg-white shadow-md py-2">
                                {group.items.map((item, idx) => (
                                  <Link
                                    key={`${item.href}-${idx}`}
                                    href={item.href}
                                    onClick={(e) => e.currentTarget.blur()}
                                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {item.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      : (tab.items ?? []).map((item) =>
                          item.children && item.children.length > 0 ? (
                            // EPIC-079-PHASE-2: 드롭다운 항목도 서브카테고리(손자)가
                            // 있으면 group과 동일한 2차 플라이아웃 패턴으로 렌더링.
                            <div key={item.href} className="relative group/row">
                              <Link
                                href={item.href}
                                onClick={(e) => e.currentTarget.blur()}
                                aria-haspopup="true"
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                              >
                                <span>{item.label}</span>
                                <span className="text-gray-400 text-xs">›</span>
                              </Link>
                              <div className="hidden group-hover/row:block group-focus-within/row:block absolute left-full top-0 pl-2 z-50">
                                <div className="w-56 rounded-md border border-gray-200 bg-white shadow-md py-2">
                                  {item.children.map((child, idx) => (
                                    <Link
                                      key={`${child.href}-${idx}`}
                                      href={child.href}
                                      onClick={(e) => e.currentTarget.blur()}
                                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      {child.label}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={(e) => e.currentTarget.blur()}
                              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {item.label}
                            </Link>
                          ),
                        )}
                  </div>
                </div>
              )}
              </div>
              {writeButtonEl}
            </Fragment>
          );
        })}
      </nav>

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
        onIconClick={() => setLeftOpen(true)}
        onClose={() => setLeftOpen(false)}
        iconDefaultUrl={sidebarIcons?.leftIconDefaultUrl || undefined}
        iconHoverUrl={sidebarIcons?.leftIconHoverUrl || undefined}
        iconSizePx={sidebarIcons?.iconSizePx || DEFAULT_ICON_SIZE_PX}
        triggerMode={sidebarIcons?.triggerMode || DEFAULT_TRIGGER_MODE}
      />
      <RightSidebar
        tab={rightSidebarTab}
        open={rightOpen}
        onIconClick={() => setRightOpen(true)}
        onClose={() => setRightOpen(false)}
        iconDefaultUrl={sidebarIcons?.rightIconDefaultUrl || undefined}
        iconHoverUrl={sidebarIcons?.rightIconHoverUrl || undefined}
        iconSizePx={sidebarIcons?.iconSizePx || DEFAULT_ICON_SIZE_PX}
        triggerMode={sidebarIcons?.triggerMode || DEFAULT_TRIGGER_MODE}
      />
    </header>
  );
}
