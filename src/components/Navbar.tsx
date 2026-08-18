"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchNavTabs, getActiveNavTabKey, type NavTab } from "@/lib/navConfig";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { MembershipPopover } from "@/components/MembershipPopover";
import { GatedNavLink } from "@/components/common/GatedNavLink";
import { useHideOnScroll } from "@/lib/useHideOnScroll";
import { tabHoverMotionCss, DEFAULT_TAB_HOVER_MOTION } from "@/lib/tabHoverMotion";
import { useIsMobileViewport } from "@/lib/useIsMobileViewport";
import {
  normalizeMainLogo,
  DEFAULT_LOGO_HEIGHT_PX,
  DEFAULT_LOGO_FONT_SIZE_PX,
  DEFAULT_LOGO_TEXT_COLOR,
  type MainLogoValue,
  type MainLogoConfig,
} from "@/lib/mainLogoSettings";
import {
  normalizeSidebarIcons,
  DEFAULT_ICON_SIZE_PX,
  DEFAULT_TRIGGER_MODE,
  DEFAULT_TOP_OFFSET_PX,
  type SidebarIconsValue,
} from "@/lib/sidebarIconsSettings";
import { normalizeTopTabStyle, type TopTabStyleEntry, type TopTabStyleValue } from "@/lib/topTabStyleSettings";
import { normalizeAccountMenuStyle, type AccountMenuStyleValue } from "@/lib/accountMenuStyleSettings";

const TAB_BUTTON_BASE =
  "px-3 py-2 text-sm border-b-2 -mb-px transition-colors";
const TAB_BUTTON_ACTIVE = "border-gray-800 text-gray-900 font-medium";
const TAB_BUTTON_INACTIVE =
  "border-transparent text-gray-500 hover:text-white hover:bg-green-800 hover:border-green-800";

const DEFAULT_LOGO_TEXT = "사일로 스토어";
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

  const activeTabKey = getActiveNavTabKey(pathname);

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

  // EPIC-104: 헤더를 fixed로 띄우면서(스크롤 방향에 따라 숨김/노출) 원래
  // 문서 흐름에서 차지하던 공간이 사라져 본문이 위로 붙어버린다 — 실제
  // 렌더링된 헤더 높이를 ResizeObserver로 측정해 그만큼의 spacer를 대신
  // 넣는다. 로고 높이/탭 줄바꿈 수에 따라 높이가 가변적이라(고정값 하드코딩
  // 불가) 측정 방식을 택했다.
  const hidden = useHideOnScroll();
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);
  useEffect(() => {
    const node = topBarRef.current;
    if (!node) return;
    // 버그로 겪은 것: 스페이서(topBarHeight) 값이 바뀌면 문서 전체 높이가
    // 바뀌어 스크롤바 유무/폭이 미세하게 달라지고, 그게 이 헤더 자체의
    // 줄바꿈(가로폭)에 다시 영향을 줘 ResizeObserver가 또 발화 → 다시
    // setTopBarHeight → ... 로 이어지는 되먹임 루프가 생겼다. 그 루프가
    // 리렌더를 쉼 없이 돌리는 동안 다른 이펙트(navTabs fetch 등)의
    // cleanup(cancelled=true)이 응답이 오기 전에 계속 실행돼, 이 컴포넌트가
    // 영원히 "로딩 중" 상태로 멈춰버리는 걸 실제로 재현했다(로컬에서
    // 메뉴/로그인 영역이 전혀 안 뜸). requestAnimationFrame으로 측정을
    // 한 프레임 늦추고, 값이 실제로(반올림 기준) 바뀔 때만 setState해서
    // 루프 자체가 발생하지 않게 막는다.
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.round(entry.contentRect.height);
        setTopBarHeight((prev) => (prev === next ? prev : next));
      });
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

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

  // HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
  // 설정'이 따로 구분이 되게 해야지"): 메인 로고/사이드바 아이콘/상단 탭
  // 디자인 전부 { pc, mobile } 두 세트로 저장되고(mainLogoSettings.ts 등
  // 공용 정규화 로직 참고), 실제 뷰포트 폭에 따라 그중 하나를 골라 쓴다
  // — 아래 mainLogo/sidebarIcons/topTabStyle 변수는 "이미 뷰포트에 맞게
  // 골라진 단일 설정"이라 이후 렌더 코드는 이전과 동일하게 mainLogo?.text
  // 식으로 그대로 쓸 수 있다(필드 구조 자체는 안 바뀜).
  const isMobileViewport = useIsMobileViewport();

  // EPIC-032: admin/navigation/settings("홈페이지 설정 관리")가 저장한
  // site_settings.main_logo를 조회해 로고를 대체한다. 값이 비어 있으면
  // 기존 하드코딩 텍스트로 대체되어 로고가 아예 비는 일은 없다.
  const [mainLogoValue, setMainLogoValue] = useState<MainLogoValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "main_logo")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMainLogoValue(normalizeMainLogo(data?.setting_value));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const mainLogo: MainLogoConfig | null = mainLogoValue ? (isMobileViewport ? mainLogoValue.mobile : mainLogoValue.pc) : null;

  // EPIC-039: 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘.
  // 값이 없으면(테이블 미적용 포함) LeftSidebar/RightSidebar가 기존
  // 🔑/🚪 이모지로 자동 대체하므로 아이콘이 아예 비는 일은 없다.
  const [sidebarIconsValue, setSidebarIconsValue] = useState<SidebarIconsValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "sidebar_icons")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSidebarIconsValue(normalizeSidebarIcons(data?.setting_value));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const sidebarIcons = sidebarIconsValue ? (isMobileViewport ? sidebarIconsValue.mobile : sidebarIconsValue.pc) : null;

  // EPIC-079-PHASE-4: 상단 탭 개별 디자인(표시 텍스트/서체/크기/색상) —
  // /admin/navigation/settings의 "상단 탭 디자인" 섹션이 저장한다. 값이
  // 없거나 특정 탭에 대한 항목이 없으면 그 탭은 기존처럼 원래 제목/기본
  // 스타일 그대로 렌더링된다(완전히 optional한 오버레이).
  const [topTabStyleValue, setTopTabStyleValue] = useState<TopTabStyleValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "top_tab_style")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTopTabStyleValue(normalizeTopTabStyle(data?.setting_value));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const topTabStyle = topTabStyleValue ? (isMobileViewport ? topTabStyleValue.mobile : topTabStyleValue.pc) : null;

  // HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 맨 위의 '관리자, (회원
  // 등급), 마이페이지, (사용자이름), 로그아웃' 이런 메뉴의 디자인을
  // 설정하는 또다른 탭을 만들어줘"): 계정 영역(우측 상단 5개 항목) 전체에
  // 적용되는 서체/크기/색상/hover 모션 — 값이 없으면 완전히 기존과
  // 동일하게 렌더링된다(optional한 오버레이, topTabStyle과 동일한 패턴).
  const [accountMenuStyleValue, setAccountMenuStyleValue] = useState<AccountMenuStyleValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "account_menu_style")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAccountMenuStyleValue(normalizeAccountMenuStyle(data?.setting_value));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const accountMenuStyle = accountMenuStyleValue ? (isMobileViewport ? accountMenuStyleValue.mobile : accountMenuStyleValue.pc) : null;

  // HOTFIX(사용자 신고 — "홈페이지 설정관리에 프리뷰가 안 나오는데? PC와
  // 모바일 버전 실시간으로 보이게 해줘"): /admin/navigation/settings의
  // 미리보기 iframe이 URL에 `?__adminPreview=1`을 붙여 열렸을 때만,
  // 부모 창(관리자 설정 페이지)이 postMessage로 보내는 "아직 저장하지
  // 않은, 지금 타이핑 중인" { pc, mobile } 전체 값으로 mainLogo/
  // sidebarIcons/topTabStyle을 즉시 덮어쓴다 — DB 조회를 기다릴 필요 없이
  // 실시간으로 반영된다. 이 쿼리 파라미터가 없으면(일반 방문자, 즉
  // 사실상 항상) 이 effect는 완전히 no-op이라 실제 사이트 동작에는 아무
  // 영향이 없다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("__adminPreview") !== "1") return;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | {
            type?: string;
            mainLogo?: MainLogoValue;
            sidebarIcons?: SidebarIconsValue;
            topTabStyle?: TopTabStyleValue;
            accountMenuStyle?: AccountMenuStyleValue;
          }
        | null;
      if (!data || data.type !== "silo-admin-preview-override") return;
      if (data.mainLogo) setMainLogoValue(data.mainLogo);
      if (data.sidebarIcons) setSidebarIconsValue(data.sidebarIcons);
      if (data.topTabStyle) setTopTabStyleValue(data.topTabStyle);
      if (data.accountMenuStyle) setAccountMenuStyleValue(data.accountMenuStyle);
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "silo-admin-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", handleMessage);
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
  // HOTFIX(사용자 지시 — "각 탭 위에 커서가 hover 되었을 때의 모션들을
  // 6가지로 설정할 수 있게 해, 고급스러운 느낌이 나도록"): 예전엔
  // 커스텀 서체/크기/색상 등 다른 필드가 하나라도 설정된 탭에만 클래스+
  // CSS가 붙었다 — hover 모션은 그런 커스텀 여부와 무관하게 "모든" 탭에
  // 기본값(DEFAULT_TAB_HOVER_MOTION)이 적용돼야 하므로, navTabs 전체를
  // 순회하며 항상 클래스를 만든다.
  const topTabStyleCss = navTabs
    .map((tab) => {
      const entry = topTabEntries[tab.key];
      const cls = `silo-top-tab-${topTabClassSuffix(tab.key)}`;
      const rules: string[] = [];
      if (entry) {
        const ff = topTabFontFamilyValue(tab.key, entry);
        if (ff) rules.push(`font-family: ${ff} !important;`);
        if (entry.fontSizePx) rules.push(`font-size: ${entry.fontSizePx}px !important;`);
        if (entry.bold) rules.push(`font-weight: bold !important;`);
        if (entry.color) rules.push(`color: ${entry.color} !important;`);
      }
      // hover 시엔 기존 배경(green-800)과의 대비를 위해 커스텀 색상 대신
      // 항상 흰 글씨를 유지한다 — 서체/크기/굵기는 hover에서도 그대로.
      const colorRule = rules.length > 0 ? `.${cls} { ${rules.join(" ")} }\n.${cls}:hover { color: #fff !important; }` : "";
      const motionCss = tabHoverMotionCss(cls, entry?.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION);
      return [colorRule, motionCss].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n");

  // HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 맨 위의 '관리자, (회원
  // 등급), 마이페이지, (사용자이름), 로그아웃' 이런 메뉴의 디자인을
  // 설정하는 또다른 탭을 만들어줘"): 계정 영역 5개 항목이 전부 공유하는
  // 클래스 하나(silo-account-menu-item) — topTabStyleCss와 동일한
  // 패턴으로 서체/크기/굵기/색상 + hover 모션 규칙을 <style>로 주입한다.
  const ACCOUNT_MENU_ITEM_CLASS = "silo-account-menu-item";
  const accountMenuStyleCss = (() => {
    const rules: string[] = [];
    if (accountMenuStyle?.fontFamily) rules.push(`font-family: ${accountMenuStyle.fontFamily} !important;`);
    if (accountMenuStyle?.fontSizePx) rules.push(`font-size: ${accountMenuStyle.fontSizePx}px !important;`);
    if (accountMenuStyle?.bold) rules.push(`font-weight: bold !important;`);
    if (accountMenuStyle?.color) rules.push(`color: ${accountMenuStyle.color} !important;`);
    const colorRule = rules.length > 0 ? `.${ACCOUNT_MENU_ITEM_CLASS} { ${rules.join(" ")} }` : "";
    const motionCss = tabHoverMotionCss(ACCOUNT_MENU_ITEM_CLASS, accountMenuStyle?.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION);
    return [colorRule, motionCss].filter(Boolean).join("\n");
  })();

  // EPIC-117(사용자 지시): 탭을 "1단"(로고 줄과 겹치는 자리)/"2단"(기존
  // 탭 줄) 중 어디에 배치할지 — /admin/navigation/settings "상단 탭
  // 디자인"에서 탭별로 지정한다. 지정 안 하면(기존 데이터) 전부 2단.
  function tabTier(tab: NavTab): 1 | 2 {
    return topTabEntries[tab.key]?.tier === 1 ? 1 : 2;
  }
  const tier1Tabs = navTabs.filter((tab) => tabTier(tab) === 1);
  const tier2Tabs = navTabs.filter((tab) => tabTier(tab) !== 1);

  // EPIC-079-PHASE-4/EPIC-117: 탭 하나(type이 "link"인 단순 링크, 또는
  // 드롭다운/메가메뉴가 있는 버튼)를 렌더링 — 원래 <nav> 안의 map 콜백
  // 이었는데, 1단/2단 두 자리에서 똑같이 재사용하려고 함수로 뽑았다.
  function renderTab(tab: NavTab) {
    // EPIC-079-PHASE-4: "상단 탭 디자인"에서 저장한 표시 텍스트
    // 오버라이드/커스텀 클래스 — 값이 없으면 완전히 기존과 동일.
    const tabStyleEntry = topTabEntries[tab.key];
    const tabLabel = tabStyleEntry?.labelOverride || tab.label;
    // HOTFIX: hover 모션 CSS는 커스텀 엔트리 여부와 무관하게 모든 탭에
    // 붙으므로(위 topTabStyleCss 참고) 클래스도 항상 적용한다.
    const tabStyleClassName = `silo-top-tab-${topTabClassSuffix(tab.key)}`;

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
          <GatedNavLink href={tab.href!} minRankToRead={tab.minRankToRead} className={className}>
            {tabLabel}
          </GatedNavLink>
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
          <GatedNavLink
            href={tab.href}
            minRankToRead={tab.minRankToRead}
            onClick={(e) => e.currentTarget.blur()}
            className={className}
            aria-haspopup={hasChildren ? "true" : undefined}
          >
            {tabLabel}
          </GatedNavLink>
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
                ? tab.groups.map((group) => {
                    // HOTFIX-096(사용자 지시): group.items가 비어있는
                    // 그룹(예: "Silo's old Story", DB 자식 노드 0개)도
                    // 이 chevron(›)과 2차 플라이아웃을 무조건 렌더링해,
                    // 실제로는 펼칠 게 없는데도 화살표가 보이고
                    // hover하면 빈 흰색 박스만 뜨는("이상한 빈칸") 문제가
                    // 있었다. tab.items 분기(item.children.length > 0)와
                    // 동일하게 items가 있을 때만 chevron/플라이아웃을
                    // 렌더링한다.
                    const hasItems = group.items.length > 0;
                    return (
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
                        <GatedNavLink
                          href={group.href}
                          minRankToRead={group.minRankToRead}
                          onClick={(e) => e.currentTarget.blur()}
                          aria-haspopup={hasItems ? "true" : undefined}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <span>{group.groupLabel}</span>
                          {hasItems && <span className="text-gray-400 text-xs">›</span>}
                        </GatedNavLink>
                      ) : (
                        <button
                          type="button"
                          aria-haspopup={hasItems ? "true" : undefined}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 cursor-default hover:bg-gray-50 text-left"
                        >
                          <span>{group.groupLabel}</span>
                          {hasItems && <span className="text-gray-400 text-xs">›</span>}
                        </button>
                      )}
                      {/* 2차 플라이아웃 — group-hover/row 또는
                          group-focus-within/row로 노출, JS 없음.
                          pl-2가 그룹 행↔플라이아웃 사이의 브릿지 역할.
                          hasItems일 때만 렌더링(위 HOTFIX-096 참고). */}
                      {hasItems && (
                        <div className="hidden group-hover/row:block group-focus-within/row:block absolute left-full top-0 pl-2 z-50">
                          <div className="w-56 rounded-md border border-gray-200 bg-white shadow-md py-2">
                            {group.items.map((item, idx) => (
                              <GatedNavLink
                                key={`${item.href}-${idx}`}
                                href={item.href}
                                minRankToRead={item.minRankToRead}
                                onClick={(e) => e.currentTarget.blur()}
                                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {item.label}
                              </GatedNavLink>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })
                : (tab.items ?? []).map((item) =>
                    item.children && item.children.length > 0 ? (
                      // EPIC-079-PHASE-2: 드롭다운 항목도 서브카테고리(손자)가
                      // 있으면 group과 동일한 2차 플라이아웃 패턴으로 렌더링.
                      <div key={item.href} className="relative group/row">
                        <GatedNavLink
                          href={item.href}
                          minRankToRead={item.minRankToRead}
                          onClick={(e) => e.currentTarget.blur()}
                          aria-haspopup="true"
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <span>{item.label}</span>
                          <span className="text-gray-400 text-xs">›</span>
                        </GatedNavLink>
                        <div className="hidden group-hover/row:block group-focus-within/row:block absolute left-full top-0 pl-2 z-50">
                          <div className="w-56 rounded-md border border-gray-200 bg-white shadow-md py-2">
                            {item.children.map((child, idx) => (
                              <GatedNavLink
                                key={`${child.href}-${idx}`}
                                href={child.href}
                                minRankToRead={child.minRankToRead}
                                onClick={(e) => e.currentTarget.blur()}
                                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {child.label}
                              </GatedNavLink>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <GatedNavLink
                        key={item.href}
                        href={item.href}
                        minRankToRead={item.minRankToRead}
                        onClick={(e) => e.currentTarget.blur()}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {item.label}
                      </GatedNavLink>
                    ),
                  )}
            </div>
          </div>
        )}
        </div>
        {writeButtonEl}
      </Fragment>
    );
  }

  return (
    <header>
      {/* EPIC-104: 로고 줄+탭 줄만 fixed+transform으로 띄워 스크롤 방향에
          따라 숨김/노출한다 — LeftSidebar/RightSidebar(자체적으로 이미
          position:fixed)는 이 wrapper 밖(형제)에 둔다. transform이 걸린
          조상은 자손 fixed 요소의 containing block을 바꿔버려 화면 좌표가
          아니라 이 wrapper 기준으로 어긋나게 되므로, 사이드바를 안에 넣지
          않는 것이 중요하다. */}
      <div
        ref={topBarRef}
        className={`fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white transition-transform duration-300 ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
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
      {accountMenuStyleCss && <style>{accountMenuStyleCss}</style>}
      <div
        className="relative flex items-center p-4 gap-4"
        style={mainLogo?.rowHeightPx ? { minHeight: mainLogo.rowHeightPx } : undefined}
      >
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

        {/* EPIC-118(사용자 지시): 이전엔 이 자리를 absolute+right-4로 페이지
            맨 오른쪽에 고정했는데, 로그인 상태(관리자/등급/이름/로그아웃
            버튼들)와 겹쳐버리는 버그가 있었다 — 계정 영역 바로 앞에 오는
            일반 flex 형제로 바꿔 가로 위치는 flexbox가 자동으로(계정 영역과
            절대 안 겹치게) 잡아주고, translateY만 줘서 세로로는 여전히
            로고 줄 하단 경계선에 걸치는(straddle) 효과를 낸다. */}
        {tier1Tabs.length > 0 && (
          <div
            className="relative z-10 flex shrink-0 translate-y-1/2 items-center gap-1"
            style={topTabStyle?.tier1OffsetPx ? { transform: `translateY(calc(50% - ${topTabStyle.tier1OffsetPx}px))` } : undefined}
          >
            {tier1Tabs.map(renderTab)}
          </div>
        )}

        {/* HOTFIX(사용자 지시 — "맨 위의 '관리자, (회원 등급), 마이페이지,
            (사용자이름), 로그아웃' 이런 메뉴의 디자인을 설정하는 또다른
            탭을 만들어줘"): 아래 5개 항목(로그인 전 대체 항목 포함) 전부
            ACCOUNT_MENU_ITEM_CLASS를 공유 — /admin/navigation/settings의
            "사용자 메뉴 디자인" 섹션이 저장한 서체/크기/색상/hover 모션이
            함께 적용된다. */}
        <div className="flex items-center gap-3 shrink-0 relative">
          {mounted && !loading && session && member?.is_admin && (
            <Link
              href="/admin/payments"
              className={`text-sm text-gray-600 hover:underline ${ACCOUNT_MENU_ITEM_CLASS}`}
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
                className={`text-sm text-gray-600 hover:underline ${ACCOUNT_MENU_ITEM_CLASS}`}
              >
                {member.tier_name}
              </button>
            ) : (
              <Link href="/membership" className={`text-sm text-gray-600 hover:underline ${ACCOUNT_MENU_ITEM_CLASS}`}>
                멤버십 신청
              </Link>
            )
          )}

          {mounted && !loading && session && (
            <Link href="/mypage" className={`text-sm text-gray-600 hover:underline ${ACCOUNT_MENU_ITEM_CLASS}`}>
              마이페이지
            </Link>
          )}

          {mounted && !loading && session && member && (
            <button
              type="button"
              onClick={() => setPopoverOpen((o) => !o)}
              className={`text-sm text-gray-600 hover:underline ${ACCOUNT_MENU_ITEM_CLASS}`}
            >
              {member.name}
            </button>
          )}

          {mounted &&
            !loading &&
            (session ? (
              <button
                onClick={handleLogout}
                className={`rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm ${ACCOUNT_MENU_ITEM_CLASS}`}
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className={`rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm ${ACCOUNT_MENU_ITEM_CLASS}`}
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
      <nav
        className="relative flex flex-wrap items-center justify-center gap-1 px-4 border-t border-gray-100"
        style={{
          ...(topTabStyle?.rowHeightPx ? { minHeight: topTabStyle.rowHeightPx } : undefined),
          ...(topTabStyle?.tier2OffsetPx ? { transform: `translateY(-${topTabStyle.tier2OffsetPx}px)` } : undefined),
        }}
      >
        {tier2Tabs.map(renderTab)}
      </nav>
      </div>
      {/* fixed로 뜬 topBarRef 만큼 문서 흐름에서 빈 공간을 대신 채워 본문이
          위로 붙지 않게 한다(topBarHeight는 ResizeObserver 실측값). */}
      <div style={{ height: topBarHeight }} />

      {/* EPIC-040: 전체 높이 사이드바 열림 중 뒷배경을 어둡게 — 위 상단 탭
          팝업과는 별개 state(leftOpen/rightOpen)이므로 별도 backdrop. */}
      {/* EPIC-104: topBarRef가 이제 fixed z-40이라, 원래 z-30이던 이 backdrop
          을 z-45로 올려야 사이드바가 열렸을 때 헤더도 함께 어둡게 덮인다
          (전에는 헤더가 static이라 backdrop보다 항상 아래였음). */}
      {(leftOpen || rightOpen) && (
        <div
          onClick={closeSidebars}
          className="fixed inset-0 z-[45] bg-black/30"
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
        topOffsetPx={sidebarIcons?.topOffsetPx || DEFAULT_TOP_OFFSET_PX}
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
        topOffsetPx={sidebarIcons?.topOffsetPx || DEFAULT_TOP_OFFSET_PX}
      />
    </header>
  );
}
