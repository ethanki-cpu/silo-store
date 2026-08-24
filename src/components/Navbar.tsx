"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchNavTabs, getActiveNavTabKey, mergeSidebarTabs, type NavTab, type NavItem } from "@/lib/navConfig";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { MembershipPopover } from "@/components/MembershipPopover";
import { UserMenuDropdown } from "@/components/UserMenuDropdown";
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
import {
  normalizeHeaderLayout,
  headerItemInlineStyle,
  HEADER_MENU_ITEM_KEYS,
  HEADER_MENU_ITEM_LABELS,
  type HeaderLayoutValue,
  type HeaderMenuItemKey,
} from "@/lib/headerLayoutSettings";
import {
  normalizeHeaderPositions,
  getSlotOffset,
  type HeaderPositionsConfig,
  type HeaderSlotOffset,
} from "@/lib/headerLayoutPositions";
import { HeaderSlot } from "@/components/HeaderSlot";
import { SidebarTriggerMedia } from "@/components/SidebarTriggerMedia";
import { TopSidebarPanel } from "@/components/TopSidebarPanel";
import { normalizeTopSidebar, type TopSidebarConfig, type TopSidebarLink } from "@/lib/topSidebarSettings";

const TAB_BUTTON_BASE =
  "px-3 py-2 text-sm border-b-2 -mb-px transition-colors";
const TAB_BUTTON_ACTIVE = "border-gray-800 text-gray-900 font-medium";
const TAB_BUTTON_INACTIVE =
  "border-transparent text-gray-500 hover:text-white hover:bg-green-800 hover:border-green-800";

const DEFAULT_LOGO_TEXT = "사일로 스토어";
// EPIC-043: main_logo.customFonts의 각 활성 항목에 주입할 @font-face의
// font-family 이름 접두사 — 항목 id로 구분해 여러 개를 동시에 등록한다.
const CUSTOM_FONT_FAMILY_PREFIX = "SiloCustomLogoFont";
// HOTFIX-141.12: 로고 좌/우 텍스트 각각의 독립 커스텀 폰트 @font-face
// 접두사 — 로고 자체 폰트(CUSTOM_FONT_FAMILY_PREFIX)와 겹치지 않게 분리.
const LOGO_LEFT_TEXT_FONT_FAMILY_PREFIX = "SiloLogoLeftTextFont";
const LOGO_RIGHT_TEXT_FONT_FAMILY_PREFIX = "SiloLogoRightTextFont";
// EPIC-079-PHASE-4: 상단 탭 커스텀 폰트의 @font-face 접두사 — 탭 id도
// 함께 섞어 탭마다 독립된 font-family 이름을 만든다(다른 탭이 같은 폰트
// 파일 URL을 써도 이름이 안 겹치게).
const TOP_TAB_FONT_FAMILY_PREFIX = "SiloTopTabFont";
// HOTFIX-141.7: 드롭다운/하위 카테고리 전용 커스텀 폰트 @font-face 접두사
// — 탭 자체의 폰트(TOP_TAB_FONT_FAMILY_PREFIX)와 별개로 독립 설정한다.
const TOP_TAB_DROPDOWN_FONT_FAMILY_PREFIX = "SiloTopTabDropdownFont";

// HOTFIX-144.3(사용자 지시 — "1차 & 2차 드롭다운 카테고리의 상/하 위치를
// 설정할수 있게 해줘 모든 요소들에게"): dropdownOffsetXPx/subDropdownOffsetXPx
// 옆에 Y축 짝(dropdownOffsetYPx/subDropdownOffsetYPx)이 추가돼, 드롭다운
// 위치 style을 만드는 3곳(1차 컨테이너, 2차 flyout ×2)이 전부 X/Y 둘 다
// 반영해야 한다 — translateX만 만들던 것을 이 헬퍼로 통일.
function dropdownOffsetTransform(xPx?: number | null, yPx?: number | null): string | undefined {
  if (!xPx && !yPx) return undefined;
  return `translate(${xPx ?? 0}px, ${yPx ?? 0}px)`;
}

// EPIC-136(사용자 지시 — "드래그앤 드롭으로 버튼이든, 이미지, 영상, 무슨
// 요소든지 자유롭게 내가 선택하면 그 화면 안에서 마음대로 움직일수 있게
// 해달라"): "홈페이지 설정 관리" 관리자 화면이 이 컴포넌트를 그대로,
// 편집 모드 prop만 얹어서 렌더링한다 — 별도 "미리보기 클론"을 만들지
// 않는다(EPIC-135까지의 접근과 근본적으로 다른 점). 캔버스가 곧 실제
// 사이트라 완벽히 일치하고, 로그인 상태/드롭다운 메가메뉴 같은 실제 기능도
// 관리자 화면 안에서 그대로 동작한다. 기본값(모든 props 생략)은 100%
// 예전과 동일하게 렌더링된다.
export function Navbar({
  editable = false,
  selectedSlotKey = null,
  onSelectSlot,
  positionsOverride,
  onOffsetChange,
  deviceOverride,
  topSidebarOverride,
  mainLogoOverride,
  sidebarIconsOverride,
  topTabStyleOverride,
  accountMenuStyleOverride,
}: {
  editable?: boolean;
  selectedSlotKey?: string | null;
  onSelectSlot?: (slotKey: string) => void;
  /** 관리자 화면이 "아직 저장 전, 지금 편집 중인" 값을 곧바로 반영하려고 site_settings 조회 대신 직접 넘긴다. */
  positionsOverride?: HeaderPositionsConfig;
  onOffsetChange?: (slotKey: string, next: HeaderSlotOffset) => void;
  /** 관리자 화면의 PC/태블릿/모바일 토글 — 실제 뷰포트 폭 대신 이 값으로 강제한다(태블릿은 PC 데이터를 그대로 씀). */
  deviceOverride?: "pc" | "mobile";
  /** positionsOverride와 동일한 이유 — 상단 사이드바(TopSidebarPanel) 편집 중인 값을 즉시 반영. */
  topSidebarOverride?: TopSidebarConfig;
  // HOTFIX-141.11(사용자 신고로 발견 — dropdownAlign 등 탭 스타일 필드를
  // Controls에서 바꿔도 캔버스에 전혀 반영되지 않음): positionsOverride/
  // topSidebarOverride와 동일한 override-우선 패턴이 로고/사이드바 아이콘/
  // 상단 탭 스타일/계정 영역 스타일에는 애초에 없었다 — 이 네 설정은
  // EPIC-136 이전 iframe+postMessage 시절의 흔적(아래 handleMessage
  // effect, 지금 캔버스는 iframe이 아니라 no-op)만 남아있었고, "저장하기"
  // 눌러 DB에 실제로 쓴 뒤 새로고침해야만 캔버스에 반영됐다 — "live
  // preview가 실제 사이트와 다르다"는 반복 신고의 상당 부분이 실은 이
  // 네 설정에 한해 "아직 저장 안 한 편집 내용"이었던 것. 나머지 두
  // override와 동일한 패턴으로 맞춘다.
  mainLogoOverride?: MainLogoValue;
  sidebarIconsOverride?: SidebarIconsValue;
  topTabStyleOverride?: TopTabStyleValue;
  accountMenuStyleOverride?: AccountMenuStyleValue;
} = {}) {
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
  // EPIC-136: 관리자 편집 캔버스 안에서는 fixed+숨김 스크롤 동작이 필요
  // 없다(오히려 아래 fixed 해제와 짝을 이뤄야 정상적으로 캔버스 박스
  // 안에 자리를 잡는다) — 훅 자체는 항상 호출하되(Hooks 규칙) 결과만
  // 편집 모드에서 무시한다.
  const hiddenByScroll = useHideOnScroll();
  const hidden = editable ? false : hiddenByScroll;
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
  // EPIC-138(사용자 지시): "마이페이지" 클릭 시 여는 드롭다운 — "사용자
  // 메뉴"로 태그된 카테고리 링크가 여기 담긴다. 회원 등급/이름 팝오버와
  // 같은 자리(계정 영역 relative wrapper) 위에 뜨므로 동시에 둘 다 열려
  // 있으면 서로 겹쳐 보인다 — 하나를 열면 다른 하나는 닫는다.
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // EPIC-023: 탭/사이드바/드롭다운 구성을 site_navigations(DB)에서 조회.
  // 로딩 중이거나 조회 실패 시 navConfig.ts의 FALLBACK_NAV_TABS로 자동 대체되어
  // 화면에 탭이 아예 비는 일은 없다.
  const [navTabs, setNavTabs] = useState<NavTab[]>([]);
  // EPIC-138: "사용자 메뉴"로 태그된 카테고리 — 계정 영역 "마이페이지"
  // 드롭다운(UserMenuDropdown)에 노출된다.
  const [userMenuItems, setUserMenuItems] = useState<NavItem[]>([]);
  // HOTFIX-141.1(사용자 지시 — "'노출위치'에 '상단 사이드바'도
  // 포함해줘"): userMenuItems와 동일한 패턴 — "상단 사이드바"로 태그된
  // 카테고리.
  const [topSidebarNavItems, setTopSidebarNavItems] = useState<NavItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchNavTabs().then(({ tabs, userMenuItems, topSidebarItems }) => {
      if (cancelled) return;
      setNavTabs(tabs);
      setUserMenuItems(userMenuItems);
      setTopSidebarNavItems(topSidebarItems);
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
  const isMobileViewportReal = useIsMobileViewport();
  const isMobileViewport = deviceOverride ? deviceOverride === "mobile" : isMobileViewportReal;

  // EPIC-032: admin/navigation/settings("홈페이지 설정 관리")가 저장한
  // site_settings.main_logo를 조회해 로고를 대체한다. 값이 비어 있으면
  // 기존 하드코딩 텍스트로 대체되어 로고가 아예 비는 일은 없다.
  const [mainLogoValue, setMainLogoValue] = useState<MainLogoValue | null>(null);
  useEffect(() => {
    if (mainLogoOverride) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainLogoOverride]);
  const resolvedMainLogoValue = mainLogoOverride ?? mainLogoValue;
  const mainLogo: MainLogoConfig | null = resolvedMainLogoValue ? (isMobileViewport ? resolvedMainLogoValue.mobile : resolvedMainLogoValue.pc) : null;

  // EPIC-039: 좌/우 사이드바 여닫이 버튼에 쓰이는 커스텀 아이콘.
  // 값이 없으면(테이블 미적용 포함) LeftSidebar/RightSidebar가 기존
  // 🔑/🚪 이모지로 자동 대체하므로 아이콘이 아예 비는 일은 없다.
  const [sidebarIconsValue, setSidebarIconsValue] = useState<SidebarIconsValue | null>(null);
  useEffect(() => {
    if (sidebarIconsOverride) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarIconsOverride]);
  const resolvedSidebarIconsValue = sidebarIconsOverride ?? sidebarIconsValue;
  const sidebarIcons = resolvedSidebarIconsValue ? (isMobileViewport ? resolvedSidebarIconsValue.mobile : resolvedSidebarIconsValue.pc) : null;

  // EPIC-079-PHASE-4: 상단 탭 개별 디자인(표시 텍스트/서체/크기/색상) —
  // /admin/navigation/settings의 "상단 탭 디자인" 섹션이 저장한다. 값이
  // 없거나 특정 탭에 대한 항목이 없으면 그 탭은 기존처럼 원래 제목/기본
  // 스타일 그대로 렌더링된다(완전히 optional한 오버레이).
  const [topTabStyleValue, setTopTabStyleValue] = useState<TopTabStyleValue | null>(null);
  useEffect(() => {
    if (topTabStyleOverride) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTabStyleOverride]);
  const resolvedTopTabStyleValue = topTabStyleOverride ?? topTabStyleValue;
  const topTabStyle = resolvedTopTabStyleValue ? (isMobileViewport ? resolvedTopTabStyleValue.mobile : resolvedTopTabStyleValue.pc) : null;

  // HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 맨 위의 '관리자, (회원
  // 등급), 마이페이지, (사용자이름), 로그아웃' 이런 메뉴의 디자인을
  // 설정하는 또다른 탭을 만들어줘"): 계정 영역(우측 상단 5개 항목) 전체에
  // 적용되는 서체/크기/색상/hover 모션 — 값이 없으면 완전히 기존과
  // 동일하게 렌더링된다(optional한 오버레이, topTabStyle과 동일한 패턴).
  const [accountMenuStyleValue, setAccountMenuStyleValue] = useState<AccountMenuStyleValue | null>(null);
  useEffect(() => {
    if (accountMenuStyleOverride) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountMenuStyleOverride]);
  const resolvedAccountMenuStyleValue = accountMenuStyleOverride ?? accountMenuStyleValue;
  const accountMenuStyle = resolvedAccountMenuStyleValue ? (isMobileViewport ? resolvedAccountMenuStyleValue.mobile : resolvedAccountMenuStyleValue.pc) : null;

  // EPIC-134(사용자 지시 — "GrapesJS로... 로그아웃 버튼 옆에 스튜디오 탭을
  // 끌어다 놓을 수 있어야 함"): /admin/navigation/settings의 새 "헤더"
  // 섹션(HeaderGrapesEditor)이 저장한, 탭과 계정 메뉴 항목을 뒤섞은 순서
  // 목록 — 값이 있으면(관리자가 한 번이라도 저장했으면) 아래 렌더링에서
  // 기존 tier1/tier2/계정 영역 3분할 레이아웃 대신 이 순서로 한 줄에
  // 렌더링한다. 값이 없으면(기본 상태) 기존 3분할 레이아웃 그대로 —
  // 완전히 optional한 오버레이라 이 기능을 쓰지 않으면 100% 기존과 동일.
  const [headerLayoutValue, setHeaderLayoutValue] = useState<HeaderLayoutValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "unified_header_layout")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setHeaderLayoutValue(normalizeHeaderLayout(data?.setting_value));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  // HOTFIX(사용자 지시 — "pc/모바일 독립으로 설정할 수 있게 해야지"): 다른
  // 설정들과 동일하게 {pc, mobile}에서 지금 뷰포트에 맞는 쪽만 고른다.
  const headerLayout = headerLayoutValue ? (isMobileViewport ? headerLayoutValue.mobile : headerLayoutValue.pc) : null;

  // EPIC-136: 각 요소(로고/탭/계정 메뉴 항목)의 자유 드래그 위치 오프셋.
  // positionsOverride가 오면(관리자 편집 화면) 그 값을 항상 우선하고,
  // 없으면(공개 사이트) site_settings.header_positions를 직접 조회한다 —
  // 다른 site_settings 기반 오버레이(main_logo 등)와 동일한 패턴.
  const [headerPositionsValue, setHeaderPositionsValue] = useState<HeaderPositionsConfig | null>(null);
  useEffect(() => {
    if (positionsOverride) return;
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "header_positions")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const normalized = normalizeHeaderPositions(data?.setting_value);
        setHeaderPositionsValue(isMobileViewport ? normalized.mobile : normalized.pc);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsOverride, isMobileViewport]);
  const resolvedPositions = positionsOverride ?? headerPositionsValue ?? undefined;

  // HOTFIX-137.9: 상단 사이드바(TopSidebarPanel) 설정 — 다른 site_settings
  // 기반 오버레이와 동일한 override-우선 패턴.
  const [topSidebarValue, setTopSidebarValue] = useState<TopSidebarConfig | null>(null);
  useEffect(() => {
    if (topSidebarOverride) return;
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "top_sidebar")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const normalized = normalizeTopSidebar(data?.setting_value);
        setTopSidebarValue(isMobileViewport ? normalized.mobile : normalized.pc);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topSidebarOverride, isMobileViewport]);
  const resolvedTopSidebar = topSidebarOverride ?? topSidebarValue ?? undefined;
  // HOTFIX-141.1(사용자 지시 — "'노출위치'에 '상단 사이드바'도
  // 포함해줘"): "상단 사이드바"로 태그된 site_navigations 카테고리를
  // admin이 수동으로 만든 links 뒤에 이어붙인다 — 저장된 topSidebarValue
  // 자체는 건드리지 않고 렌더링 시점에만 합친다(저장을 누를 때 이
  // 파생 항목까지 site_settings.top_sidebar에 같이 저장되는 걸 방지).
  const mergedTopSidebar = useMemo(() => {
    if (!resolvedTopSidebar) return undefined;
    if (topSidebarNavItems.length === 0) return resolvedTopSidebar;
    const derivedLinks: TopSidebarLink[] = topSidebarNavItems.map((item) => ({
      id: `nav:${item.href}`,
      label: item.label,
      href: item.href,
      imageUrl: "",
      children: [],
    }));
    return { ...resolvedTopSidebar, links: [...resolvedTopSidebar.links, ...derivedLinks] };
  }, [resolvedTopSidebar, topSidebarNavItems]);
  const [topSidebarOpen, setTopSidebarOpen] = useState(false);

  function slotOffset(slotKey: string): HeaderSlotOffset {
    return getSlotOffset(resolvedPositions, slotKey);
  }
  function handleSelectSlot(slotKey: string) {
    onSelectSlot?.(slotKey);
  }
  function handleSlotOffsetChange(slotKey: string, next: HeaderSlotOffset) {
    onOffsetChange?.(slotKey, next);
  }

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
  // HOTFIX-144.2: 여러 카테고리가 동시에 sidebar-left/sidebar-right로
  // 태그될 수 있어(EPIC-138) find() 하나만으로는 나머지가 무시된다 —
  // mergeSidebarTabs가 같은 슬롯을 공유하는 탭들의 groups를 전부 합친다.
  const leftSidebarTab = useMemo(
    () => mergeSidebarTabs(navTabs.filter((t) => t.type === "sidebar-left")),
    [navTabs],
  );
  const rightSidebarTab = useMemo(
    () => mergeSidebarTabs(navTabs.filter((t) => t.type === "sidebar-right")),
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

  // HOTFIX-141.12(사용자 지시 — "모바일 버전에 I'm your, Silo 텍스트의
  // 요소들도 세부 설정이 가능하게 연결해줘, pc 버전처럼"): 좌/우 텍스트가
  // 예전엔 이 하나의 공유 스타일(로고 자체 서체/굵기/크기/색상)만 그대로
  // 물려받았다 — 이제 각자 독립 필드(leftText*/rightText*)가 비어있지
  // 않으면 그 값으로 덮어쓰고, 비어있으면(기존 데이터) 지금까지와 동일하게
  // 로고 스타일을 그대로 상속한다.
  function sideTextStyle(side: "left" | "right"): React.CSSProperties {
    const custom = side === "left" ? mainLogo?.leftTextCustomFonts : mainLogo?.rightTextCustomFonts;
    const family = side === "left" ? mainLogo?.leftTextFontFamily : mainLogo?.rightTextFontFamily;
    const bold = side === "left" ? mainLogo?.leftTextBold : mainLogo?.rightTextBold;
    const sizePx = side === "left" ? mainLogo?.leftTextFontSizePx : mainLogo?.rightTextFontSizePx;
    const color = side === "left" ? mainLogo?.leftTextColor : mainLogo?.rightTextColor;
    const activeSideFonts = (custom ?? []).filter((f) => f.isActive && f.url);
    const prefix = side === "left" ? LOGO_LEFT_TEXT_FONT_FAMILY_PREFIX : LOGO_RIGHT_TEXT_FONT_FAMILY_PREFIX;
    const sideFontFamilyValue =
      activeSideFonts.length > 0
        ? activeSideFonts
            .map((f) => `'${prefix}-${f.id}'`)
            .concat(family ? [family] : ["inherit"])
            .join(", ")
        : family || undefined;
    return {
      fontFamily: sideFontFamilyValue ?? fontFamilyValue,
      fontWeight: (bold ?? mainLogo?.bold) ? "bold" : "normal",
      fontSize: `${sizePx || mainLogo?.fontSizePx || DEFAULT_LOGO_FONT_SIZE_PX}px`,
      color: color || mainLogo?.textColor || DEFAULT_LOGO_TEXT_COLOR,
      whiteSpace: "pre-line",
    };
  }
  const leftTextStyle = sideTextStyle("left");
  const rightTextStyle = sideTextStyle("right");

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
      // HOTFIX-141.7(사용자 신고 — "상단 탭에 hover 할때 아무 글씨도
      // 안보이는거"): 이 hover 강제 흰색 규칙은 원래 탭 hover 시 뜨던
      // 진한 초록 배경(green-800)과 대비시키기 위한 것이었는데, 바로 아래
      // hoverNeutralizeRule(HOTFIX-141)이 그 배경 자체를 투명하게 지워버려
      // — 흰 배경 위에 강제로 흰 글씨가 남는 흰-바탕-흰-글씨 조합이 돼
      // 완전히 안 보이게 됐다. 배경이 더 이상 어둡지 않으므로 글자색을
      // 강제할 이유가 없다 — hover 표현은 이제 hoverMotion(모션 CSS)이
      // 전담한다.
      const colorRule = rules.length > 0 ? `.${cls} { ${rules.join(" ")} }` : "";
      // HOTFIX-141(사용자 지시 — "상단탭 버튼들에 호버모션이 다른걸로
      // 바뀌어도 적용이안되고 있어"): TAB_BUTTON_INACTIVE/dropdown 탭의
      // hover:bg-green-800(또는 group-hover/tab:bg-green-800) 배경 전환이
      // !important 없이도 색만 안 겹치면 항상 이겨서, 6종 모션 중 뭘 골라도
      // 초록 배경 전환에 가려 안 보였다(진짜 원인 — 배경색 자체는 어떤
      // 모션도 건드리지 않으므로 계속 그대로 통과됨). 탭 자신을 직접
      // hover할 때만큼은(:hover) 이 배경/테두리를 강제로 지워 모션이 실제
      // 유일한 hover 효과가 되게 한다 — group-hover 브릿지 영역(하위
      // 드롭다운으로 이어지는 여백)처럼 탭 자체가 아닌 곳을 hover할 때는
      // 기존 초록 배경이 여전히 뜬다(의도된 범위 밖 — 그 경우는 "이 탭이
      // 열려있다"는 신호라 남겨둔다).
      const hoverNeutralizeRule = `.${cls}:hover { background-color: transparent !important; border-color: transparent !important; }`;
      const motionCss = tabHoverMotionCss(cls, entry?.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION);
      return [colorRule, hoverNeutralizeRule, motionCss].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n");

  // HOTFIX-141.7(사용자 지시 — "드롭다운과 하위 카테고리의... 폰트업로드/
  // 크기/색상을 설정할수 있게 해줘"): 탭 자체의 스타일(위)과 별개로,
  // 드롭다운/하위 카테고리 플라이아웃 안의 텍스트에 적용되는 서체/크기/
  // 색상 — topTabDropdownClassName()이 각 플라이아웃 컨테이너에 붙인다.
  function topTabDropdownClassName(tabKey: string) {
    return `silo-top-tab-dropdown-${topTabClassSuffix(tabKey)}`;
  }
  function topTabDropdownFontFamilyValue(tabKey: string, entry: TopTabStyleEntry) {
    const active = (entry.dropdownCustomFonts ?? []).filter((f) => f.isActive && f.url);
    if (active.length === 0) return entry.dropdownFontFamily || undefined;
    return active
      .map((f) => `'${TOP_TAB_DROPDOWN_FONT_FAMILY_PREFIX}-${topTabClassSuffix(tabKey)}-${f.id}'`)
      .concat(entry.dropdownFontFamily ? [entry.dropdownFontFamily] : ["inherit"])
      .join(", ");
  }
  const topTabDropdownStyleCss = navTabs
    .map((tab) => {
      const entry = topTabEntries[tab.key];
      if (!entry) return "";
      const cls = topTabDropdownClassName(tab.key);
      const rules: string[] = [];
      const ff = topTabDropdownFontFamilyValue(tab.key, entry);
      if (ff) rules.push(`font-family: ${ff} !important;`);
      if (entry.dropdownFontSizePx) rules.push(`font-size: ${entry.dropdownFontSizePx}px !important;`);
      if (entry.dropdownColor) rules.push(`color: ${entry.dropdownColor} !important;`);
      return rules.length > 0 ? `.${cls} { ${rules.join(" ")} }` : "";
    })
    .filter(Boolean)
    .join("\n");

  // HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 맨 위의 '관리자, (회원
  // 등급), 마이페이지, (사용자이름), 로그아웃' 이런 메뉴의 디자인을
  // 설정하는 또다른 탭을 만들어줘"): 계정 영역 5개 항목이 전부 공유하는
  // 클래스 하나(silo-account-menu-item) — topTabStyleCss와 동일한
  // 패턴으로 서체/크기/굵기/색상 + hover 모션 규칙을 <style>로 주입한다.
  // HOTFIX-141: 이 클래스가 붙는 항목들(관리자/등급/마이페이지/이름)이
  // 전부 hover:underline을 하드코딩으로 갖고 있어 hoverMotion을 뭘
  // 골라도 항상 똑같은 밑줄만 보였다 — 아래 렌더 코드에서 hover:underline을
  // 뺐고, 이제 hover 표현은 이 클래스의 motionCss(기본값 underline-glow)가
  // 전담한다.
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

  // EPIC-138(사용자 지시): "1단"(로고 줄과 겹치는 자리)/"2단"(기존 탭 줄)
  // 배치는 이제 "사이트 구성 관리 > 사이트 메뉴"에서 카테고리별
  // target_types(tier1_tab/tier2_tab)로 직접 고른다 — 예전처럼
  // /admin/navigation/settings에 별도 tier 설정이 있는 게 아니다(이중
  // 설정 방지). 복수 선택이면(tier1_tab과 tier2_tab 둘 다) 두 줄 모두에
  // 나타나고, 둘 다 선택 안 하면(사이드바 전용/사용자 메뉴 전용 카테고리)
  // 상단 탭 줄에는 아예 나타나지 않는다. tiers가 없으면(FALLBACK_NAV_TABS
  // 스냅샷 등) 예전 기본값과 동일하게 2단으로 취급한다.
  function tabTiers(tab: NavTab): (1 | 2)[] {
    return tab.tiers ?? [2];
  }
  // HOTFIX-134(사용자 지시 — "1단과 2단을... 드래그앤드랍으로 각 버튼
  // 위치를 정하는거"): 관리자가 "홈페이지 설정 관리"의 캔버스에서 탭
  // 칩을 드래그해 같은 단 안의 좌우 순서를 바꾸면 topTabEntries[key].order
  // 에 값이 채워진다 — 없으면(한 번도 드래그로 옮긴 적 없음) 원래
  // site_navigations 순서(navTabs 배열 인덱스)를 그대로 쓴다.
  function tabOrderValue(tab: NavTab, naturalIndex: number): number {
    const explicit = topTabEntries[tab.key]?.order;
    return explicit !== null && explicit !== undefined ? explicit : naturalIndex * 1000;
  }
  const orderedNavTabs = navTabs.map((tab, i) => ({ tab, order: tabOrderValue(tab, i) }));
  const tier1Tabs = orderedNavTabs
    .filter(({ tab }) => tabTiers(tab).includes(1))
    .sort((a, b) => a.order - b.order)
    .map(({ tab }) => tab);
  const tier2Tabs = orderedNavTabs
    .filter(({ tab }) => tabTiers(tab).includes(2))
    .sort((a, b) => a.order - b.order)
    .map(({ tab }) => tab);

  // EPIC-084-REVISED: 전역 "글쓰기" 버튼.
  // HOTFIX-141.2(사용자 신고 — "홈페이지 설정 관리에 '글쓰기' 와 '마이페이지
  // (드롭다운)' 요소가 사라졌어"): 예전엔 이 버튼이 "마이 페이지" 탭
  // 렌더링(tab.key === "mypage") 안에 끼워 넣는 방식이었다 — "마이 페이지
  // 옆"이라는 원래 요구는 만족했지만, 관리자가 "마이 페이지" 탭 자체의
  // 노출 위치(site_navigations.target_types)를 전부 해제해 탭이 아예
  // 렌더링되지 않게 되자(예: 계정 영역 드롭다운으로만 쓰고 싶어서) 글쓰기
  // 버튼까지 부수 효과로 통째로 사라져버렸다 — 두 UI가 같은 "마이페이지"
  // 라는 이름을 공유할 뿐 실제로는 독립된 요소(하나는 site_navigations
  // 탭, 하나는 로그인 세션에 묶인 계정 영역 버튼)라 이 결합 자체가
  // 설계상 취약점이었다. 글쓰기 버튼은 이미 자기 자신의 드래그 위치
  // (slotKey "write-button")를 저장하므로 특정 탭에 안 붙어도 관리자가
  // 원하는 자리로 옮길 수 있다 — 탭 렌더링과 완전히 분리해 항상 한 번만
  // 그린다(tier1Tabs가 아니라 tier2Tabs 뒤에 — 지금까지 "마이 페이지"가
  // 주로 tier2였던 것과 가장 비슷한 자리).
  const writeButtonHidden = resolvedAccountMenuStyleValue?.writeButtonHidden ?? false;
  const extraWriteButtonIds = resolvedAccountMenuStyleValue?.extraWriteButtonIds ?? [];
  function writeButtonNode(slotKey: string, label: string) {
    return (
      <HeaderSlot
        key={slotKey}
        slotKey={slotKey}
        label={label}
        offset={slotOffset(slotKey)}
        editable={editable}
        selected={selectedSlotKey === slotKey}
        onSelect={handleSelectSlot}
        onOffsetChange={handleSlotOffsetChange}
        as="span"
      >
        <Link href={writeHref} className={`${TAB_BUTTON_BASE} ${TAB_BUTTON_INACTIVE}`}>
          글쓰기
        </Link>
      </HeaderSlot>
    );
  }
  const writeButtonEl = (
    <>
      {!writeButtonHidden && writeButtonNode("write-button", "글쓰기")}
      {extraWriteButtonIds.map((id) => writeButtonNode(`write-button:extra:${id}`, "글쓰기 사본"))}
    </>
  );

  // EPIC-079-PHASE-4/EPIC-117: 탭 하나(type이 "link"인 단순 링크, 또는
  // 드롭다운/메가메뉴가 있는 버튼)를 렌더링 — 원래 <nav> 안의 map 콜백
  // 이었는데, 1단/2단 두 자리에서 똑같이 재사용하려고 함수로 뽑았다.
  function renderTab(tab: NavTab) {
    // EPIC-079-PHASE-4: "상단 탭 디자인"에서 저장한 표시 텍스트
    // 오버라이드/커스텀 클래스 — 값이 없으면 완전히 기존과 동일.
    const tabStyleEntry = topTabEntries[tab.key];
    const tabLabel = tabStyleEntry?.labelOverride || tab.label;
    // HOTFIX-141.12(사용자 지시 — "최상위 카테고리와 하위 카테고리의
    // 텍스트를 각각 수정하게 해달라, 줄바꿈이라던지"): 그룹/항목 하나하나의
    // 표시 텍스트 오버라이드 — 원본 텍스트를 키로 찾는다(그룹은
    // groupLabel, 항목은 href). \n을 pre-line으로 실제 줄바꿈으로 렌더링해
    // 버튼 폭이 좁아도 텍스트에 맞춰 여러 줄로 접히게 한다.
    function subLabel(originalLabel: string, overrideKey: string): string {
      return tabStyleEntry?.subLabelOverrides?.[overrideKey] || originalLabel;
    }
    const preLineStyle: React.CSSProperties = { whiteSpace: "pre-line" };
    // HOTFIX: hover 모션 CSS는 커스텀 엔트리 여부와 무관하게 모든 탭에
    // 붙으므로(위 topTabStyleCss 참고) 클래스도 항상 적용한다.
    const tabStyleClassName = `silo-top-tab-${topTabClassSuffix(tab.key)}`;

    if (tab.type === "link") {
      const className = `${TAB_BUTTON_BASE} ${
        activeTabKey === tab.key ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE
      } ${tabStyleClassName}`;
      return (
        <Fragment key={tab.key}>
          <HeaderSlot
            slotKey={`tab:${tab.key}`}
            label={tabLabel}
            offset={slotOffset(`tab:${tab.key}`)}
            editable={editable}
            selected={selectedSlotKey === `tab:${tab.key}`}
            onSelect={handleSelectSlot}
            onOffsetChange={handleSlotOffsetChange}
            as="span"
          >
            <GatedNavLink href={tab.href!} minRankToRead={tab.minRankToRead} className={className}>
              <span style={preLineStyle}>{tabLabel}</span>
            </GatedNavLink>
          </HeaderSlot>
        </Fragment>
      );
    }

    const isRouteActive = activeTabKey === tab.key;
    const hasChildren =
      (tab.groups && tab.groups.length > 0) ||
      (tab.items && tab.items.length > 0);
    // HOTFIX-137.5(사용자 지시 — "한번에 여러 카테고리를 보이는 '메가
    // 드롭다운'도 가능한 옵션으로 넣어줘"): 탭별 스타일 설정에 저장된
    // megaDropdown 플래그 — true면 아래 flyout을 열마다 그룹/항목을
    // 나란히 펼쳐 한 번에 다 보여주는 그리드로 렌더링한다(기존 중첩
    // 리스트는 항목에 마우스를 올려야 2차 플라이아웃이 열림).
    const isMega = !!topTabEntries[tab.key]?.megaDropdown;
    // HOTFIX-141.15: 2차(하위 카테고리의 하위 카테고리) 플라이아웃 펼치는
    // 방향 — 비어있으면 1차(dropdownAlign)를 그대로 상속.
    const subAlign = tabStyleEntry?.subDropdownAlign ?? tabStyleEntry?.dropdownAlign;
    const megaColumns = isMega
      ? tab.groups && tab.groups.length > 0
        ? tab.groups.map((g) => ({
            label: g.groupLabel,
            href: g.href,
            minRankToRead: g.minRankToRead,
            sub: g.items,
          }))
        : (tab.items ?? []).map((i) => ({
            label: i.label,
            href: i.href,
            minRankToRead: i.minRankToRead,
            sub: i.children ?? [],
          }))
      : [];

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
        <HeaderSlot
          slotKey={`tab:${tab.key}`}
          label={tabLabel}
          offset={slotOffset(`tab:${tab.key}`)}
          editable={editable}
          selected={selectedSlotKey === `tab:${tab.key}`}
          onSelect={handleSelectSlot}
          onOffsetChange={handleSlotOffsetChange}
          as="span"
        >
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
            <span style={preLineStyle}>{tabLabel}</span>
          </GatedNavLink>
        ) : (
          <button
            type="button"
            className={className}
            aria-haspopup={hasChildren ? "true" : undefined}
          >
            <span style={preLineStyle}>{tabLabel}</span>
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
          <div
            className={`hidden group-hover/tab:block group-focus-within/tab:block absolute top-full pt-4 z-40 ${
              tabStyleEntry?.dropdownAlign === "right" ? "right-0" : "left-0"
            }`}
          >
            {isMega ? (
              // HOTFIX-137.5: 메가 드롭다운 — 컬럼(그룹 또는 1차 항목)을
              // 전부 나란히 펼쳐, 마우스를 올리지 않아도 하위 항목까지
              // 한 번에 보인다. 컬럼 헤더는 href가 있으면 Hub Page 링크.
              <div className="flex flex-wrap gap-8 rounded-md border border-gray-200 bg-white shadow-md p-5 min-w-[28rem]">
                {megaColumns.map((col, idx) => (
                  <div key={`${col.label}-${idx}`} className="min-w-[9rem]">
                    {col.href ? (
                      <GatedNavLink
                        href={col.href}
                        minRankToRead={col.minRankToRead}
                        onClick={(e) => e.currentTarget.blur()}
                        className="mb-2 block text-sm font-semibold text-gray-800 hover:underline"
                      >
                        <span style={preLineStyle}>{subLabel(col.label, col.label)}</span>
                      </GatedNavLink>
                    ) : (
                      <p className="mb-2 text-sm font-semibold text-gray-800" style={preLineStyle}>{subLabel(col.label, col.label)}</p>
                    )}
                    <div className="space-y-1.5">
                      {col.sub.map((item, subIdx) => (
                        <GatedNavLink
                          key={`${item.href}-${subIdx}`}
                          href={item.href}
                          minRankToRead={item.minRankToRead}
                          onClick={(e) => e.currentTarget.blur()}
                          className="block text-sm text-gray-600 hover:text-gray-900 hover:underline"
                        >
                          <span style={preLineStyle}>{subLabel(item.label, item.href)}</span>
                        </GatedNavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div
              className={`w-64 rounded-md border border-gray-200 bg-white shadow-md py-2 ${topTabDropdownClassName(tab.key)}`}
              style={{
                ...(tabStyleEntry?.dropdownWidthPx ? { width: tabStyleEntry.dropdownWidthPx } : undefined),
                ...(dropdownOffsetTransform(tabStyleEntry?.dropdownOffsetXPx, tabStyleEntry?.dropdownOffsetYPx)
                  ? { transform: dropdownOffsetTransform(tabStyleEntry?.dropdownOffsetXPx, tabStyleEntry?.dropdownOffsetYPx) }
                  : undefined),
              }}
            >
              {tab.groups && tab.groups.length > 0
                ? tab.groups.map((group, groupIdx) => {
                    // HOTFIX-141.14(사용자 신고 — "'사일로의 취향' 하위
                    // 카테고리를 보려고 hover 하면 잘려서 안보여, 화살표처럼
                    // 위쪽으로 올라갈수 있게 해줘"): 목록 맨 아래쪽 그룹의
                    // 2차 플라이아웃이 화면 아래로 펼쳐지면 뷰포트 바닥에
                    // 잘리기 쉽다 — 마지막 그룹만 트리거 기준 아래(top-0)
                    // 대신 위(bottom-0)로 펼쳐 항상 화면 안쪽으로 열리게 한다.
                    const isLastGroup = groupIdx === tab.groups!.length - 1;
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
                          <span style={preLineStyle}>{subLabel(group.groupLabel, group.groupLabel)}</span>
                          {hasItems && <span className="text-gray-400 text-xs">›</span>}
                        </GatedNavLink>
                      ) : (
                        <button
                          type="button"
                          aria-haspopup={hasItems ? "true" : undefined}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 cursor-default hover:bg-gray-50 text-left"
                        >
                          <span style={preLineStyle}>{subLabel(group.groupLabel, group.groupLabel)}</span>
                          {hasItems && <span className="text-gray-400 text-xs">›</span>}
                        </button>
                      )}
                      {/* 2차 플라이아웃 — group-hover/row 또는
                          group-focus-within/row로 노출, JS 없음.
                          pl-2가 그룹 행↔플라이아웃 사이의 브릿지 역할.
                          hasItems일 때만 렌더링(위 HOTFIX-096 참고). */}
                      {hasItems && (
                        <div
                          className={`hidden group-hover/row:block group-focus-within/row:block absolute z-50 ${isLastGroup ? "bottom-0" : "top-0"} ${
                            subAlign === "right" ? "right-full pr-2" : "left-full pl-2"
                          }`}
                        >
                          <div
                            className={`w-56 rounded-md border border-gray-200 bg-white shadow-md py-2 ${topTabDropdownClassName(tab.key)}`}
                            style={{
                              ...((tabStyleEntry?.subDropdownWidthPx ?? tabStyleEntry?.dropdownWidthPx) ? { width: tabStyleEntry!.subDropdownWidthPx ?? tabStyleEntry!.dropdownWidthPx! } : undefined),
                              ...(dropdownOffsetTransform(tabStyleEntry?.subDropdownOffsetXPx, tabStyleEntry?.subDropdownOffsetYPx)
                                ? { transform: dropdownOffsetTransform(tabStyleEntry?.subDropdownOffsetXPx, tabStyleEntry?.subDropdownOffsetYPx) }
                                : undefined),
                            }}
                          >
                            {group.items.map((item, idx) => (
                              <GatedNavLink
                                key={`${item.href}-${idx}`}
                                href={item.href}
                                minRankToRead={item.minRankToRead}
                                onClick={(e) => e.currentTarget.blur()}
                                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <span style={preLineStyle}>{subLabel(item.label, item.href)}</span>
                              </GatedNavLink>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })
                : (tab.items ?? []).map((item, itemIdx) => {
                    const isLastItem = itemIdx === (tab.items?.length ?? 0) - 1;
                    return item.children && item.children.length > 0 ? (
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
                          <span style={preLineStyle}>{subLabel(item.label, item.href)}</span>
                          <span className="text-gray-400 text-xs">›</span>
                        </GatedNavLink>
                        <div
                          className={`hidden group-hover/row:block group-focus-within/row:block absolute z-50 ${isLastItem ? "bottom-0" : "top-0"} ${
                            subAlign === "right" ? "right-full pr-2" : "left-full pl-2"
                          }`}
                        >
                          <div
                            className={`w-56 rounded-md border border-gray-200 bg-white shadow-md py-2 ${topTabDropdownClassName(tab.key)}`}
                            style={{
                              ...((tabStyleEntry?.subDropdownWidthPx ?? tabStyleEntry?.dropdownWidthPx) ? { width: tabStyleEntry!.subDropdownWidthPx ?? tabStyleEntry!.dropdownWidthPx! } : undefined),
                              ...(dropdownOffsetTransform(tabStyleEntry?.subDropdownOffsetXPx, tabStyleEntry?.subDropdownOffsetYPx)
                                ? { transform: dropdownOffsetTransform(tabStyleEntry?.subDropdownOffsetXPx, tabStyleEntry?.subDropdownOffsetYPx) }
                                : undefined),
                            }}
                          >
                            {item.children.map((child, idx) => (
                              <GatedNavLink
                                key={`${child.href}-${idx}`}
                                href={child.href}
                                minRankToRead={child.minRankToRead}
                                onClick={(e) => e.currentTarget.blur()}
                                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <span style={preLineStyle}>{subLabel(child.label, child.href)}</span>
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
                        <span style={preLineStyle}>{subLabel(item.label, item.href)}</span>
                      </GatedNavLink>
                    );
                  })}
            </div>
            )}
          </div>
        )}
        </div>
        </HeaderSlot>
      </Fragment>
    );
  }

  // EPIC-134: 계정 영역 5개 항목 중 하나를 key로 렌더링 — 기존에는 이
  // 조건들이 JSX 안에 직접 나열돼 있었는데(아래 return 안, 통합 레이아웃이
  // 아닐 때의 기본 경로), 통합 헤더 레이아웃(headerLayoutValue)이 이
  // 항목들을 탭과 뒤섞어 임의 순서로 배치할 수 있어야 해서 함수로 뽑아
  // 재사용한다 — 로그인 상태 게이팅/클래스/팝오버 여닫이 로직은 100%
  // 그대로.
  function renderMenuItem(key: HeaderMenuItemKey) {
    if (!mounted || loading) return null;
    switch (key) {
      case "admin":
        return session && member?.is_admin ? (
          <Link key="admin" href="/admin/payments" className={`text-sm text-gray-600 ${ACCOUNT_MENU_ITEM_CLASS}`}>
            관리자
          </Link>
        ) : null;
      case "tier":
        if (!session) return null;
        return member ? (
          <button
            key="tier"
            type="button"
            onClick={() => {
              setPopoverOpen((o) => !o);
              setUserMenuOpen(false);
            }}
            className={`text-sm text-gray-600 ${ACCOUNT_MENU_ITEM_CLASS}`}
          >
            {member.tier_name}
          </button>
        ) : (
          <Link key="tier" href="/membership" className={`text-sm text-gray-600 ${ACCOUNT_MENU_ITEM_CLASS}`}>
            멤버십 신청
          </Link>
        );
      case "mypage":
        return session ? (
          <button
            key="mypage"
            type="button"
            onClick={() => {
              setUserMenuOpen((o) => !o);
              setPopoverOpen(false);
            }}
            className={`text-sm text-gray-600 ${ACCOUNT_MENU_ITEM_CLASS}`}
          >
            마이페이지
          </button>
        ) : null;
      case "name":
        return session && member ? (
          <button
            key="name"
            type="button"
            onClick={() => {
              setPopoverOpen((o) => !o);
              setUserMenuOpen(false);
            }}
            className={`text-sm text-gray-600 ${ACCOUNT_MENU_ITEM_CLASS}`}
          >
            {member.name}
          </button>
        ) : null;
      case "logout":
        return session ? (
          <button key="logout" onClick={handleLogout} className={`rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm ${ACCOUNT_MENU_ITEM_CLASS}`}>
            로그아웃
          </button>
        ) : (
          <Link key="logout" href="/login" className={`rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm ${ACCOUNT_MENU_ITEM_CLASS}`}>
            로그인
          </Link>
        );
      default:
        return null;
    }
  }

  // EPIC-134: headerLayout.items(탭+계정 메뉴 뒤섞인 순서, 지금 뷰포트의
  // pc/mobile 값)를 실제 렌더 가능한 노드 목록으로 변환 — 삭제된 탭을
  // 가리키는 stale 항목은 조용히 건너뛴다(사이트 구성 관리에서 탭이
  // 삭제됐는데 예전 저장값이 남아있는 경우, 에러 없이 자연스럽게 무시).
  const navTabsByKey = new Map(navTabs.map((t) => [t.key, t]));
  const unifiedHeaderItems = headerLayout?.items.length
    ? headerLayout.items
        .map((item) => {
          const node =
            item.type === "tab"
              ? navTabsByKey.has(item.refId)
                ? renderTab(navTabsByKey.get(item.refId)!)
                : null
              : renderMenuItem(item.refId as HeaderMenuItemKey);
          if (!node) return null;
          const style = headerItemInlineStyle(item.style);
          return style ? (
            <span key={item.id} style={style}>
              {node}
            </span>
          ) : (
            <Fragment key={item.id}>{node}</Fragment>
          );
        })
        .filter(Boolean)
    : null;

  // EPIC-136: 편집 모드(관리자 캔버스)에서는 실제 <Link>/<a> 클릭이 그대로
  // 페이지를 이동시켜 관리자 화면을 벗어나 버린다 — capture 단계에서 클릭
  // 이벤트의 기본 동작만 막는다(전파는 막지 않으므로 HeaderSlot 자신의
  // onClick(선택)은 그대로 이어서 동작한다).
  return (
    <header
      className={editable ? "relative" : undefined}
      onClickCapture={editable ? (e) => e.preventDefault() : undefined}
    >
      {/* EPIC-104: 로고 줄+탭 줄만 fixed+transform으로 띄워 스크롤 방향에
          따라 숨김/노출한다 — LeftSidebar/RightSidebar(자체적으로 이미
          position:fixed)는 이 wrapper 밖(형제)에 둔다. transform이 걸린
          조상은 자손 fixed 요소의 containing block을 바꿔버려 화면 좌표가
          아니라 이 wrapper 기준으로 어긋나게 되므로, 사이드바를 안에 넣지
          않는 것이 중요하다. */}
      {/* EPIC-136: 관리자 편집 캔버스 안에서는 position:fixed를 그대로
          쓰면 뷰포트 최상단으로 튀어올라 실제(진짜) 사이트 헤더 뒤에
          가려진다(캔버스 박스 안이 아니라 화면 자체 기준으로 고정되므로)
          — editable일 때는 일반 문서 흐름(static)으로 렌더링해 캔버스
          박스 안에 자연스럽게 자리잡게 한다. */}
      {/* HOTFIX(사용자 신고 — "상단 탭 드롭다운이 슬라이드쇼에 가려서 안
          보여"): EPIC-136이 position:fixed만 걷어내려다 z-40까지 함께
          지웠다 — editable일 때 이 wrapper가 z-index:auto인 채로 남아
          더 이상 독립된 stacking context가 아니게 되면서, 내부의 z-40
          드롭다운 flyout이 DOM 순서상 뒤에 오는 슬라이드쇼(역시
          position:relative, z-index:auto)에 그대로 덮여버렸다(둘 다
          "auto" 레벨이라 나중에 그려지는 쪽이 위로 올라옴). editable
          여부와 무관하게 z-40은 항상 유지해야 원래(비-editable) 사이트와
          동일한 stacking이 보장된다. */}
      <div
        ref={topBarRef}
        className={`${editable ? "relative z-40" : "fixed inset-x-0 top-0 z-40"} border-b border-gray-200 bg-white transition-transform duration-300 ${
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
      {/* HOTFIX-141.12: 로고 좌/우 텍스트 전용 커스텀 폰트 @font-face —
          로고 자체 폰트 블록과 동일한 패턴, 좌/우 각각 독립 접두사. */}
      {(mainLogo?.leftTextCustomFonts ?? []).some((f) => f.isActive && f.url) && (
        <style>{`
          ${(mainLogo?.leftTextCustomFonts ?? [])
            .filter((f) => f.isActive && f.url)
            .map(
              (f) => `@font-face {
            font-family: '${LOGO_LEFT_TEXT_FONT_FAMILY_PREFIX}-${f.id}';
            src: url('${f.url}');
            font-display: swap;
          }`,
            )
            .join("\n")}
        `}</style>
      )}
      {(mainLogo?.rightTextCustomFonts ?? []).some((f) => f.isActive && f.url) && (
        <style>{`
          ${(mainLogo?.rightTextCustomFonts ?? [])
            .filter((f) => f.isActive && f.url)
            .map(
              (f) => `@font-face {
            font-family: '${LOGO_RIGHT_TEXT_FONT_FAMILY_PREFIX}-${f.id}';
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
      {/* HOTFIX-141.7: 드롭다운/하위 카테고리 전용 커스텀 폰트 @font-face
          — 위 탭 자체 폰트 블록과 동일한 패턴, 별도 접두사로 안 겹치게. */}
      {Object.entries(topTabEntries).some(([, e]) => (e.dropdownCustomFonts ?? []).some((f) => f.isActive && f.url)) && (
        <style>{`
          ${Object.entries(topTabEntries)
            .flatMap(([tabId, entry]) =>
              (entry.dropdownCustomFonts ?? [])
                .filter((f) => f.isActive && f.url)
                .map(
                  (f) => `@font-face {
              font-family: '${TOP_TAB_DROPDOWN_FONT_FAMILY_PREFIX}-${topTabClassSuffix(tabId)}-${f.id}';
              src: url('${f.url}');
              font-display: swap;
            }`,
                ),
            )
            .join("\n")}
        `}</style>
      )}
      {topTabDropdownStyleCss && <style>{topTabDropdownStyleCss}</style>}
      {accountMenuStyleCss && <style>{accountMenuStyleCss}</style>}
      <div
        className="relative flex items-center p-4 gap-4"
        style={mainLogo?.rowHeightPx ? { minHeight: mainLogo.rowHeightPx } : undefined}
      >
        {/* EPIC-039: 로고 이미지를 중앙에 두고 좌/우 텍스트를 대칭으로
            배치하던 원래 설계 — 양옆을 동일한 flex-1 컨테이너로 감싸
            텍스트 길이가 달라도 로고가 항상 가운데 유지되게 했다.
            HOTFIX-141.10(사용자 신고 — "모바일 preview 에 메인 로고
            왼쪽 오른쪽에 I'm your Silo 안나오는거 고쳐줘, 그리고 차라리
            모바일에서는 메인로고 양옆의 텍스트를 독립적으로 움직일수
            있게 해줘 드래그 & 드롭으로"): 이 flex-1/min-w-0 조합은 로고
            그래픽(shrink-0, 안 줄어듦)이 좁은 화면(모바일 390px)에서
            남는 공간을 다 차지해버리면 두 텍스트가 폭 0으로 완전히
            찌그러지는 문제가 있었다 — "안 보인다"가 실제로는 렌더링은
            되는데 너비가 0이라 보이는 픽셀이 없었던 것. 좌/우 텍스트를
            로고 자체(여전히 flex-1 — tier1 탭/계정 영역을 오른쪽으로
            미는 역할은 그대로 유지)에서 완전히 분리해 각자 독립된
            HeaderSlot(다른 헤더 요소와 동일한 자유 드래그)으로 만들었다
            — 더 이상 flex-1 형제에 눌려 찌그러지지 않고, PC/모바일 각각
            원하는 자리로 직접 옮길 수 있다. */}
        {/* HOTFIX-141.17(사용자 지시 — "로고 좌 텍스트 + 메인 로고 + 우
            텍스트를 하나로 그룹화 하는 기능을 줘 고정되게"): 셋을 각각
            독립적으로 드래그하면서 반복적으로 간격이 어긋났다(HOTFIX-
            141.13~141.15) — groupSideTexts가 켜져 있으면 셋을 하나의
            HeaderSlot(위치/드래그/잠금이 단 하나)으로 묶어 렌더링한다.
            텍스트 내용/서체 등은 여전히 "로고 왼쪽 텍스트"/"로고"/"로고
            오른쪽 텍스트" 각각의 Controls에서 따로 편집하되(Elements
            패널에서 선택), 위치만 그룹 하나로 합쳐 항상 같은 간격을
            유지한다. */}
        {mainLogo?.groupSideTexts ? (
          <HeaderSlot
            slotKey="logo-group"
            label="로고 그룹(왼쪽 텍스트+로고+오른쪽 텍스트)"
            offset={slotOffset("logo-group")}
            editable={editable}
            selected={selectedSlotKey === "logo-group"}
            onSelect={handleSelectSlot}
            onOffsetChange={handleSlotOffsetChange}
            className="flex items-center justify-center flex-1 min-w-0"
            style={{ gap: mainLogo.groupGapPx ?? 16 }}
          >
            {mainLogo.leftText && (
              <span className="shrink-0 whitespace-nowrap" style={leftTextStyle}>
                {mainLogo.leftText}
              </span>
            )}
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
            {mainLogo.rightText && (
              <span className="shrink-0 whitespace-nowrap" style={rightTextStyle}>
                {mainLogo.rightText}
              </span>
            )}
          </HeaderSlot>
        ) : (
          <>
            {mainLogo?.leftText && (
              <HeaderSlot
                slotKey="logo-left-text"
                label="로고 왼쪽 텍스트"
                offset={slotOffset("logo-left-text")}
                editable={editable}
                selected={selectedSlotKey === "logo-left-text"}
                onSelect={handleSelectSlot}
                onOffsetChange={handleSlotOffsetChange}
                as="span"
                className="shrink-0 whitespace-nowrap self-center"
              >
                <span style={leftTextStyle}>{mainLogo.leftText}</span>
              </HeaderSlot>
            )}
            <HeaderSlot
              slotKey="logo"
              label="로고"
              offset={slotOffset("logo")}
              editable={editable}
              selected={selectedSlotKey === "logo"}
              onSelect={handleSelectSlot}
              onOffsetChange={handleSlotOffsetChange}
              className="flex items-center justify-center flex-1 min-w-0"
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
            </HeaderSlot>
            {mainLogo?.rightText && (
              <HeaderSlot
                slotKey="logo-right-text"
                label="로고 오른쪽 텍스트"
                offset={slotOffset("logo-right-text")}
                editable={editable}
                selected={selectedSlotKey === "logo-right-text"}
                onSelect={handleSelectSlot}
                onOffsetChange={handleSlotOffsetChange}
                as="span"
                className="shrink-0 whitespace-nowrap self-center"
              >
                <span style={rightTextStyle}>{mainLogo.rightText}</span>
              </HeaderSlot>
            )}
          </>
        )}

        {/* EPIC-118(사용자 지시): 이전엔 이 자리를 absolute+right-4로 페이지
            맨 오른쪽에 고정했는데, 로그인 상태(관리자/등급/이름/로그아웃
            버튼들)와 겹쳐버리는 버그가 있었다 — 계정 영역 바로 앞에 오는
            일반 flex 형제로 바꿔 가로 위치는 flexbox가 자동으로(계정 영역과
            절대 안 겹치게) 잡아주고, translateY만 줘서 세로로는 여전히
            로고 줄 하단 경계선에 걸치는(straddle) 효과를 낸다. */}
        {/* EPIC-134: 통합 헤더 레이아웃이 활성화돼 있으면(headerLayoutValue
            저장됨) 이 1단 자리는 비운다 — 탭이 계정 메뉴와 뒤섞여 아래
            unifiedHeaderItems 한 줄로 대신 렌더링된다. */}
        {!unifiedHeaderItems && tier1Tabs.length > 0 && (
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
        {/* EPIC-134: 통합 헤더 레이아웃이 활성화돼 있으면 이 계정 영역도
            비운다(항목들이 renderMenuItem을 통해 아래 unifiedHeaderItems
            줄에 섞여 렌더링된다) — 팝오버만 위치 기준(relative)이 필요해
            빈 wrapper를 유지한다. */}
        <div className="flex items-center gap-3 shrink-0 relative">
          {!unifiedHeaderItems && (
            <>
              {/* HOTFIX-141(사용자 지시 — "관리자, lautrec, Ethan Ki, 마이
                  페이지 같은 '사용자 메뉴' 요소들을 복제/삭제 하는 기능이
                  없어"): 예전엔 5개 항목이 여기 손으로 하나씩 나열돼 있어
                  "복제"가 불가능한 구조였다 — renderMenuItem(위에서 이미
                  headerLayout용으로 정의된 동일 렌더 함수)을 그대로
                  재사용해 콘텐츠는 한 곳에서만 정의하고, "숨김"(hiddenKinds)
                  과 "사본"(extraItems)만 데이터로 얹는다. */}
              {HEADER_MENU_ITEM_KEYS.filter((k) => !(resolvedAccountMenuStyleValue?.hiddenKinds ?? []).includes(k)).map((k) => {
                const node = renderMenuItem(k);
                if (!node) return null;
                return (
                  <HeaderSlot
                    key={k}
                    slotKey={`account:${k}`}
                    label={HEADER_MENU_ITEM_LABELS[k]}
                    offset={slotOffset(`account:${k}`)}
                    editable={editable}
                    selected={selectedSlotKey === `account:${k}`}
                    onSelect={handleSelectSlot}
                    onOffsetChange={handleSlotOffsetChange}
                    as="span"
                  >
                    {node}
                  </HeaderSlot>
                );
              })}
              {(resolvedAccountMenuStyleValue?.extraItems ?? []).map((extra) => {
                const node = renderMenuItem(extra.kind);
                if (!node) return null;
                return (
                  <HeaderSlot
                    key={extra.id}
                    slotKey={`account:extra:${extra.id}`}
                    label={`${HEADER_MENU_ITEM_LABELS[extra.kind]} 사본`}
                    offset={slotOffset(`account:extra:${extra.id}`)}
                    editable={editable}
                    selected={selectedSlotKey === `account:extra:${extra.id}`}
                    onSelect={handleSelectSlot}
                    onOffsetChange={handleSlotOffsetChange}
                    as="span"
                  >
                    {node}
                  </HeaderSlot>
                );
              })}

              {/* HOTFIX(사용자 신고 — "상단 사이드바 아이콘이 실제
                  홈페이지에는 안보여"): 처음엔 top_sidebar.enabled가 켜져
                  있을 때만 아이콘을 보이게 했는데, 이건 다른 모든 헤더
                  요소(사이드바 아이콘/로고/탭/계정 메뉴)가 "항상 보이고
                  내용은 관리자가 채운다"는 것과 다른 예외적인 패턴이라 —
                  기본값이 꺼짐이라는 걸 관리자가 몰랐을 뿐인데 "안 보인다"는
                  버그로 보였다. enabled 개념 자체를 없애고 다른 요소들과
                  똑같이 항상 보이게 통일한다(링크가 0개여도 컬럼1 실제
                  세션 정보는 항상 의미가 있어 빈 패널이 되지 않는다). */}
              {mounted && !loading && (
                <HeaderSlot
                  slotKey="top-sidebar-trigger"
                  label="상단 사이드바 열기 버튼"
                  offset={slotOffset("top-sidebar-trigger")}
                  editable={editable}
                  selected={selectedSlotKey === "top-sidebar-trigger"}
                  onSelect={handleSelectSlot}
                  onOffsetChange={handleSlotOffsetChange}
                  as="span"
                  interactive
                >
                  {/* HOTFIX-141(사용자 지시 — "상단 사이드바 아이콘 설정
                      (이미지), hover 했을때 이미지를 설정하는게 없네
                      만들어"): LeftSidebar/RightSidebar 트리거와 동일한
                      기본/hover 크로스페이드 패턴 — 이미지가 하나도
                      없으면(기본값) 예전처럼 "☰" 텍스트 아이콘 그대로. */}
                  <button
                    type="button"
                    data-top-sidebar-trigger
                    onClick={() => setTopSidebarOpen((o) => !o)}
                    aria-label="상단 사이드바 열기"
                    className="group/topsb relative flex items-center justify-center text-lg text-gray-600 hover:text-gray-900"
                  >
                    {resolvedTopSidebar?.triggerIconDefaultUrl || resolvedTopSidebar?.triggerIconHoverUrl ? (
                      <span
                        className="relative block"
                        style={{ width: resolvedTopSidebar?.triggerIconSizePx ?? 20, height: resolvedTopSidebar?.triggerIconSizePx ?? 20 }}
                      >
                        <SidebarTriggerMedia
                          url={resolvedTopSidebar?.triggerIconDefaultUrl ?? ""}
                          alt="상단 사이드바 열기"
                          className="absolute inset-0 h-full w-full object-contain opacity-100 transition-opacity duration-300 group-hover/topsb:opacity-0"
                        />
                        <SidebarTriggerMedia
                          url={resolvedTopSidebar?.triggerIconHoverUrl || resolvedTopSidebar?.triggerIconDefaultUrl || ""}
                          alt="상단 사이드바 열기"
                          className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover/topsb:opacity-100"
                        />
                      </span>
                    ) : (
                      <span style={{ fontSize: resolvedTopSidebar?.triggerIconSizePx ?? 20 }}>☰</span>
                    )}
                  </button>
                </HeaderSlot>
              )}
            </>
          )}

          {popoverOpen && member && (
            <MembershipPopover
              memberId={member.id}
              memberName={member.name}
              tierName={member.tier_name}
              onClose={() => setPopoverOpen(false)}
            />
          )}

          {userMenuOpen && (
            <UserMenuDropdown items={userMenuItems} onClose={() => setUserMenuOpen(false)} />
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
        style={
          unifiedHeaderItems
            ? undefined
            : {
                ...(topTabStyle?.rowHeightPx ? { minHeight: topTabStyle.rowHeightPx } : undefined),
                ...(topTabStyle?.tier2OffsetPx ? { transform: `translateY(-${topTabStyle.tier2OffsetPx}px)` } : undefined),
              }
        }
      >
        {/* EPIC-134: unifiedHeaderItems가 있으면(관리자가 GrapesJS 통합
            헤더 캔버스에서 저장한 적 있으면) 탭과 계정 메뉴 항목을 뒤섞은
            그 순서 그대로 이 한 줄에 렌더링 — 없으면(기본 상태) 기존
            tier2Tabs 그대로, 100% 이전과 동일하게 동작한다. */}
        {unifiedHeaderItems ?? tier2Tabs.map(renderTab)}
        {/* HOTFIX-141.2: 이제 "마이 페이지" 탭 렌더링에 더 이상 묶이지
            않는 독립 요소 — 탭 노출 여부와 무관하게 항상 한 번 그린다. */}
        {!unifiedHeaderItems && writeButtonEl}
      </nav>
      {/* HOTFIX-137.9: topBarRef 자신이 이미 실 사이트에서는 position:fixed,
          편집 모드에서는 position:relative — 둘 다 유효한 포지셔닝
          기준(containing block)이라 이 안에 두면 TopSidebarPanel도 같은
          기준을 그대로 물려받는다(별도 앵커를 새로 만들 필요 없음). */}
      {mergedTopSidebar && (
        <TopSidebarPanel
          config={mergedTopSidebar}
          open={topSidebarOpen}
          onClose={() => setTopSidebarOpen(false)}
          editable={editable}
          selected={selectedSlotKey === "top-sidebar"}
          onSelect={() => handleSelectSlot("top-sidebar")}
          isMobileViewport={isMobileViewport}
        />
      )}
      </div>
      {/* fixed로 뜬 topBarRef 만큼 문서 흐름에서 빈 공간을 대신 채워 본문이
          위로 붙지 않게 한다(topBarHeight는 ResizeObserver 실측값).
          EPIC-136: editable일 때는 위 wrapper가 이미 static(문서 흐름 안)
          이라 이 spacer가 오히려 그만큼 이중으로 빈 공간을 만든다 —
          편집 모드에서는 렌더링하지 않는다. */}
      {!editable && <div style={{ height: topBarHeight }} />}

      {/* EPIC-040: 전체 높이 사이드바 열림 중 뒷배경을 어둡게 — 위 상단 탭
          팝업과는 별개 state(leftOpen/rightOpen)이므로 별도 backdrop. */}
      {/* EPIC-104: topBarRef가 이제 fixed z-40이라, 원래 z-30이던 이 backdrop
          을 z-45로 올려야 사이드바가 열렸을 때 헤더도 함께 어둡게 덮인다
          (전에는 헤더가 static이라 backdrop보다 항상 아래였음). */}
      {/* HOTFIX-140.2(사용자 지시 — "왼쪽 오른쪽 사이드바도, 아이콘이 live
          preview 에서 보이고... 클릭하면 사이드바가 열리고, 그 사이드바를
          설정할수 있게 해야해"): EPIC-136 시점엔 "화면 가장자리 fixed
          트리거라 캔버스 대상이 아님"이라 편집 모드에서 아예 렌더링을
          껐었는데, 그게 정확히 이 요청으로 뒤집혔다 — LeftSidebar/
          RightSidebar에 새로 추가한 editable prop(내부에서 fixed↔absolute
          전환)으로 실제 컴포넌트를 그대로 캔버스 안에 그린다(TopSidebarPanel/
          top-sidebar-trigger와 동일한 패턴). 어두운 backdrop만은 편집
          모드에서 계속 끈다 — 전체 화면을 덮으면 왼쪽 Controls 패널까지
          가려 편집을 막아버리므로. */}
      {(leftOpen || rightOpen) && !editable && (
        <div
          onClick={closeSidebars}
          className="fixed inset-0 z-[45] bg-black/30"
        />
      )}

      <LeftSidebar
        tab={leftSidebarTab}
        open={leftOpen}
        onIconClick={() => {
          setLeftOpen(true);
          if (editable) handleSelectSlot("sidebar:left");
        }}
        onClose={() => setLeftOpen(false)}
        iconDefaultUrl={sidebarIcons?.leftIconDefaultUrl || undefined}
        iconHoverUrl={sidebarIcons?.leftIconHoverUrl || undefined}
        iconSizePx={sidebarIcons?.iconSizePx || DEFAULT_ICON_SIZE_PX}
        triggerMode={sidebarIcons?.triggerMode || DEFAULT_TRIGGER_MODE}
        topOffsetPx={sidebarIcons?.topOffsetPx || DEFAULT_TOP_OFFSET_PX}
        editable={editable}
        selected={selectedSlotKey === "sidebar:left"}
        offset={slotOffset("sidebar:left")}
        onOffsetChange={(next) => handleSlotOffsetChange("sidebar:left", next)}
        onSelectSlot={() => handleSelectSlot("sidebar:left")}
        panelStyle={
          sidebarIcons
            ? {
                backgroundColor: sidebarIcons.leftPanelBackgroundColor,
                textColor: sidebarIcons.leftPanelTextColor,
                fontFamily: sidebarIcons.leftPanelFontFamily,
                hoverMotion: sidebarIcons.leftPanelHoverMotion,
              }
            : undefined
        }
      />
      <RightSidebar
        tab={rightSidebarTab}
        open={rightOpen}
        onIconClick={() => {
          setRightOpen(true);
          if (editable) handleSelectSlot("sidebar:right");
        }}
        onClose={() => setRightOpen(false)}
        iconDefaultUrl={sidebarIcons?.rightIconDefaultUrl || undefined}
        iconHoverUrl={sidebarIcons?.rightIconHoverUrl || undefined}
        iconSizePx={sidebarIcons?.iconSizePx || DEFAULT_ICON_SIZE_PX}
        triggerMode={sidebarIcons?.triggerMode || DEFAULT_TRIGGER_MODE}
        topOffsetPx={sidebarIcons?.topOffsetPx || DEFAULT_TOP_OFFSET_PX}
        editable={editable}
        selected={selectedSlotKey === "sidebar:right"}
        offset={slotOffset("sidebar:right")}
        onOffsetChange={(next) => handleSlotOffsetChange("sidebar:right", next)}
        onSelectSlot={() => handleSelectSlot("sidebar:right")}
        panelStyle={
          sidebarIcons
            ? {
                backgroundColor: sidebarIcons.rightPanelBackgroundColor,
                textColor: sidebarIcons.rightPanelTextColor,
                fontFamily: sidebarIcons.rightPanelFontFamily,
                hoverMotion: sidebarIcons.rightPanelHoverMotion,
              }
            : undefined
        }
      />
    </header>
  );
}
