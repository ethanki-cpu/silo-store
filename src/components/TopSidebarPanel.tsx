"use client";

// HOTFIX-137.9(사용자 지시 — Kinfolk 레퍼런스: "맨위 오른쪽에 아이콘을
// 누르면 사이드바가 아래로 슬라이드돼면서" + 3-컬럼 스펙): 화면 위에서
// 아래로 슬라이드하는 전체너비 메가 메뉴. column 1(이름/등급/팔로워/활동/
// 메시지)은 실제 로그인 세션 데이터 — MembershipPopover.tsx와 같은 방식으로
// 직접 조회한다(관리자가 편집할 콘텐츠가 아님). column 2는 관리자가
// site_settings.top_sidebar에 저장한 링크 목록, column 3은 그중 마우스를
// 올린 링크의 하위 목록(hover cascade). "column 1/2/3"이라는 텍스트
// 라벨 자체는 화면에 표시하지 않는다(사용자 지시대로).
//
// HOTFIX-140.2(사용자 지시 — 스크린샷 2장 첨부, "column 1: 사용자 이름,
// 사용자 등급, 팔로우 & 팔로워, 최근 활동(아래에 최근 활동 3개 & 전체보기),
// 메시지, 그 아래에 Mind Diary/Studio/Silo Planet" + "오른쪽칼럼에 hover
// 하거나 클릭하면 랜덤으로 이미지 뱅크의 이미지가 나오는것" + "배경색,
// 텍스트 색 & 폰트, 모션여러개, hover 모션옵션"): column 1에 팔로잉 수·
// 실제 최근 활동 3개·Mind Diary/Studio/Silo Planet 고정 링크를 추가하고,
// column 0 이미지를 "그 링크의 지정 이미지" 대신 관리자가 올린 이미지
// 풀(imageBankUrls)에서 무작위로 고르도록 바꿨다(풀이 비어있으면 기존
// 링크별 imageUrl로 폴백). 패널 배경/텍스트색/서체/hover 모션도 새로
// 설정 가능해졌다. editable일 때 패널 내부 클릭은(닫기 버튼 제외) 실제
// 링크 이동 대신 "top-sidebar" 설정 선택으로 가로챈다(HeaderSlot의
// HOTFIX-137.1/HOTFIX-140.2와 같은 이유 — 관리자 화면에서 실수로 페이지를
// 벗어나지 않게).
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import type { TopSidebarConfig } from "@/lib/topSidebarSettings";
import { tabHoverMotionCss } from "@/lib/tabHoverMotion";

const REASON_LABELS: Record<string, string> = {
  post: "글 작성",
  comment: "댓글 작성",
  like_received: "좋아요 받음",
  best_post: "개념글 승격",
  shop_purchase: "상점 구매",
  shop_rental: "상점 대여",
  venue_rental: "공간 대관",
  club_participation: "클럽 참여",
  attendance: "출석체크",
};

type ActivityEntry = { id: string; createdAt: string; label: string; detail?: string };

// column 1 하단 고정 바로가기 — 관리자가 편집하는 column 2 링크 목록과는
// 별개(세션 정보 블록의 일부로 취급, 사용자 지시).
export const FIXED_LINKS = [
  { label: "Mind Diary", href: "/salon/mind-diary" },
  { label: "Studio", href: "/studio" },
  // HOTFIX-141.1(사용자 지시 — 3D 우주를 About Silo에서 새 /silo-planet
  // 페이지로 옮김): 이 링크도 함께 옮긴다.
  { label: "Silo Planet", href: "/silo-planet" },
];

const LINK_HOVER_CLASS = "silo-top-sidebar-link";
// HOTFIX-141.2: 계정 영역에서 옮겨온 로그인/로그아웃 버튼 전용 hover 모션
// 클래스 — 패널 전체 링크(LINK_HOVER_CLASS)와 별도로 다른 모션을 걸 수 있다.
const LOGIN_BUTTON_CLASS = "silo-top-sidebar-login-btn";

export function TopSidebarPanel({
  config,
  open,
  onClose,
  editable = false,
  selected = false,
  onSelect,
  isMobileViewport = false,
}: {
  config: TopSidebarConfig;
  open: boolean;
  onClose: () => void;
  /** HOTFIX-137.9: Navbar.tsx의 topBarRef와 동일한 이유 — 관리자 편집
      캔버스 안에서 position:fixed를 쓰면 뷰포트 최상단으로 튀어올라
      캔버스 박스 밖에서 렌더링된다(EPIC-136에서 이미 겪은 버그와 동일
      원인). editable일 때는 absolute로 바꿔 캔버스 안에 자연스럽게
      자리잡게 한다. */
  editable?: boolean;
  /** HOTFIX-140.2: 편집 모드에서 패널 안을 클릭하면 왼쪽 Controls를
      "top-sidebar"로 전환하기 위한 선택 상태 표시(테두리). */
  selected?: boolean;
  onSelect?: () => void;
  // HOTFIX-141.21(사용자 신고 — "모바일 버전에서 상단 사이드바에 4가지
  // 컬럼들중 '세션정보' 컬럼만 나오고 있어, 모든 컬럼이 나오게 해줘"):
  // 컬럼 0(이미지)은 `hidden md:block`으로 항상 CSS 뷰포트 폭(실제
  // 브라우저 창 폭)만 봤는데, "홈페이지 설정 관리"의 모바일 프리뷰는
  // 390px 프레임을 흉내낼 뿐 실제 브라우저 창은 그보다 넓을 수 있어
  // `md:`가 그 시뮬레이션과 무관하게 반응했다(HOTFIX-141.9 계열과 동일한
  // "실제 폭 vs 시뮬레이션 폭" 불일치). Navbar.tsx가 이미 계산해둔
  // isMobileViewport(디바이스 탭 오버라이드 반영)를 그대로 받아 컬럼
  // 레이아웃을 명시적으로 분기한다 — 모바일이면 가로 스크롤 대신 4개
  // 컬럼을 세로로 쌓아 전부 화면 안에서 보이게 한다.
  isMobileViewport?: boolean;
}) {
  const { session, member } = useAuth();
  const router = useRouter();
  // HOTFIX-141.2: Navbar.tsx의 handleLogout과 동일한 동작 — 계정 영역에서
  // 옮겨왔을 뿐 로그아웃 자체의 의미는 그대로 유지한다.
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [bankImageUrl, setBankImageUrl] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // HOTFIX-141(사용자 지시 — "상단 사이드바도, 좌, 우 사이드바와
  // 마찬가지로, 사이드바 이외의 영역을 누르면 사이드바가 해제 될수
  // 있게 해줘"): LeftSidebar/RightSidebar.tsx의 패턴 그대로(pointerdown은
  // 패널의 onClickCapture와 다른 이벤트라 안전) — 여기 실제 사이트에는
  // 지금까지 ✕ 버튼/Escape 말고는 닫는 방법이 아예 없었다(L/R 사이드바와
  // 달리 backdrop도 없었음). 트리거 버튼은 이 컴포넌트가 직접 렌더링하지
  // 않으므로(Navbar.tsx) ref 대신 data-top-sidebar-trigger 마커로 식별.
  // 버그 수정(2026-08-30, 사용자 신고 — "사이드바 설정을 바꾸기 위해
  // 어딘가를 클릭하는 순간 사이드바가 닫혀"): Controls/Elements
  // 패널(data-admin-controls-panel)을 클릭해도 이 패널은 열린 채로
  // 유지 — LeftSidebar.tsx와 동일한 이유(자세한 배경은 그쪽 주석 참고).
  // 이 컴포넌트는 전역 "상단 사이드바"(data-top-sidebar-trigger)와
  // HOTFIX-152.6의 아이콘별 메가 메뉴(data-icon-sidebar-trigger) 둘 다
  // 재사용하므로 두 트리거 마커 모두 예외 처리한다.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-top-sidebar-trigger]")) return;
      if ((target as HTMLElement).closest?.("[data-icon-sidebar-trigger]")) return;
      if ((target as HTMLElement).closest?.("[data-admin-controls-panel]")) return;
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !member) return;
    let cancelled = false;
    Promise.all([
      supabase.from("member_follows").select("id", { count: "exact", head: true }).eq("following_id", member.id),
      supabase.from("member_follows").select("id", { count: "exact", head: true }).eq("follower_id", member.id),
      supabase
        .from("points_ledger")
        .select("id, reason, points, created_at")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]).then(([followerRes, followingRes, ledgerRes]) => {
      if (cancelled) return;
      setFollowerCount(followerRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setActivity(
        ((ledgerRes.data ?? []) as { id: string; reason: string; points: number; created_at: string }[]).map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          label: REASON_LABELS[row.reason] ?? row.reason,
          detail: `+${row.points}P`,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, member]);

  // HOTFIX-140.2: column 2 항목에 마우스를 올릴 때마다 이미지 풀에서
  // 무작위로 하나 골라 column 0에 보여준다 — 풀이 비어있으면 그 링크
  // 자신의 imageUrl로 폴백(구버전 동작 유지).
  // react-hooks/purity(React Compiler)가 컴포넌트 함수 스코프 안의
  // Math.random() 호출을 정적으로 다 걸러낸다 — 이 함수는 실제로는 렌더
  // 도중이 아니라 오직 handleLinkHover(마우스 이벤트 핸들러)에서만
  // 호출되므로 안전하다(EPIC-115가 같은 이유로 시드 PRNG로 우회한 것과
  // 달리, 여기는 매 hover마다 진짜 무작위값이 필요해 시드 방식을 쓸 수 없다).
  function pickBankImage() {
    if (config.imageBankUrls.length === 0) return null;
    const pool = config.imageBankUrls;
    // eslint-disable-next-line react-hooks/purity
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }
  function handleLinkHover(linkId: string) {
    setHoveredLinkId(linkId);
    setBankImageUrl(pickBankImage());
  }

  const hoveredLink = config.links.find((l) => l.id === hoveredLinkId) ?? null;
  const displayImageUrl = bankImageUrl ?? hoveredLink?.imageUrl ?? null;

  const motionCss = useMemo(() => tabHoverMotionCss(LINK_HOVER_CLASS, config.hoverMotion), [config.hoverMotion]);

  // HOTFIX-141(사용자 지시 — "이건 다른 모든 상단 사이드바의 서체를
  // 내가 업로드하는 기능이 없네"): mainLogo/topTabStyle의 customFonts와
  // 동일한 패턴 — 활성 폰트를 font-family 폴백 체인 맨 앞에 걸고,
  // 각각을 독립된 font-family 이름으로 @font-face 등록한다(다른 곳의
  // 커스텀 폰트와 이름이 겹치지 않게 접두사를 둔다).
  const activeFonts = useMemo(() => config.customFonts.filter((f) => f.isActive && f.url), [config.customFonts]);
  const resolvedFontFamily = useMemo(() => {
    if (activeFonts.length === 0) return config.fontFamily || undefined;
    return activeFonts
      .map((f) => `'silo-top-sidebar-font-${f.id}'`)
      .concat(config.fontFamily ? [config.fontFamily] : ["inherit"])
      .join(", ");
  }, [activeFonts, config.fontFamily]);
  const fontFaceCss = useMemo(
    () =>
      activeFonts
        .map((f) => `@font-face { font-family: 'silo-top-sidebar-font-${f.id}'; src: url('${f.url}'); font-display: swap; }`)
        .join("\n"),
    [activeFonts],
  );

  // HOTFIX-141.2: 로그인/로그아웃 버튼 전용 서체/크기/색상/hover 모션 —
  // 위 패널 전체 서체(resolvedFontFamily)와 완전히 독립된 자체 폰트 업로드를
  // 지원한다(사용자 지시 — "그 버튼을 내가 마음대로 설정할수 있게, 폰트
  // 파일 업로드, 폰트 크기, 색깔, hover 모션옵션 을 설정하게 해줘").
  const loginStyle = config.loginButtonStyle;
  const activeLoginFonts = useMemo(
    () => loginStyle.customFonts.filter((f) => f.isActive && f.url),
    [loginStyle.customFonts],
  );
  const resolvedLoginFontFamily = useMemo(() => {
    if (activeLoginFonts.length === 0) return loginStyle.fontFamily || undefined;
    return activeLoginFonts
      .map((f) => `'silo-top-sidebar-login-font-${f.id}'`)
      .concat(loginStyle.fontFamily ? [loginStyle.fontFamily] : ["inherit"])
      .join(", ");
  }, [activeLoginFonts, loginStyle.fontFamily]);
  const loginFontFaceCss = useMemo(
    () =>
      activeLoginFonts
        .map((f) => `@font-face { font-family: 'silo-top-sidebar-login-font-${f.id}'; src: url('${f.url}'); font-display: swap; }`)
        .join("\n"),
    [activeLoginFonts],
  );
  const loginMotionCss = useMemo(
    () => tabHoverMotionCss(LOGIN_BUTTON_CLASS, loginStyle.hoverMotion),
    [loginStyle.hoverMotion],
  );
  const loginButtonInlineStyle = {
    fontFamily: resolvedLoginFontFamily,
    fontSize: loginStyle.fontSizePx ? `${loginStyle.fontSizePx}px` : undefined,
    color: loginStyle.color || undefined,
  };
  const loginLogoutButton = session && member ? (
    <button type="button" onClick={handleLogout} className={`block text-left font-medium ${LOGIN_BUTTON_CLASS}`} style={loginButtonInlineStyle}>
      로그아웃
    </button>
  ) : (
    <Link href="/login" onClick={onClose} className={`block font-medium ${LOGIN_BUTTON_CLASS}`} style={loginButtonInlineStyle}>
      로그인
    </Link>
  );

  return (
    <div
      ref={panelRef}
      className={`${editable ? "absolute" : "fixed"} inset-x-0 top-0 z-50 transform border-b transition-transform duration-300 ${
        selected ? "border-blue-400 ring-2 ring-blue-400 ring-inset" : "border-gray-200"
      } shadow-xl ${open ? "translate-y-0" : "-translate-y-full"}`}
      style={{ maxHeight: "80vh", backgroundColor: config.backgroundColor || "#ffffff" }}
      onMouseLeave={() => setHoveredLinkId(null)}
      // HOTFIX-140.2: 편집 모드에서 패널 내부 클릭은 실제 링크 이동 대신
      // "top-sidebar" 선택으로 가로챈다 — 단, 캡처 단계는 target에 도달하기
      // "전에" 먼저 실행되므로 여기서 무조건 stopPropagation하면 닫기
      // 버튼 자신의 onClick(타깃/버블 단계)까지 아예 도달하지 못해 닫기가
      // 완전히 죽어버린다(처음 구현에서 실제로 이 버그를 만들었다가 발견해
      // 수정) — data-panel-close 마커로 닫기 버튼 클릭만 가로채지 않고
      // 그대로 통과시킨다.
      onClickCapture={
        editable
          ? (e) => {
              if ((e.target as HTMLElement).closest("[data-panel-close]")) return;
              e.preventDefault();
              e.stopPropagation();
              onSelect?.();
            }
          : undefined
      }
    >
      {motionCss && <style>{motionCss}</style>}
      {fontFaceCss && <style>{fontFaceCss}</style>}
      {loginMotionCss && <style>{loginMotionCss}</style>}
      {loginFontFaceCss && <style>{loginFontFaceCss}</style>}
      <button
        type="button"
        data-panel-close
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 text-xl text-gray-400 hover:text-gray-700"
      >
        ✕
      </button>
      {/* HOTFIX-141(사용자 지시 — "'모바일' preview 에 column 3,4는
          아예 안나오고 있어"): 컬럼 4개 합친 너비(기본 800px+gap)가
          모바일 프레임(390px)보다 넓어 잘려나가 있었다 — 세로 방향
          스크롤(overflow-y-auto)만 있고 가로는 그냥 잘렸기 때문. 이제
          가로도 자체적으로 스크롤(overflow-x-auto)돼 좁은 화면에서도
          옆으로 밀어서 모든 컬럼에 닿을 수 있다.
          HOTFIX-152.11(사용자 신고 — "모바일에서도 이미지|세션정보 /
          링크목록|하위목록 이렇게 왼쪽 오른쪽으로 칼럼이 나올수 있게
          해줘야지"): HOTFIX-141.21은 4개 컬럼을 전부 세로 한 줄씩(1열)
          쌓았는데, 이는 "적어도 뭔가는 보이게" 하려던 임시 대응이었고
          사용자가 원한 건 처음부터 2열(가로 두 칸씩 짝지어 2행) 배치였다
          — 세로 한 줄만 쌓는 대신 columnOrder를 앞에서부터 2개씩 짝지어
          한 행에 나란히 놓는다(기본 순서라면 0·1이 1행, 2·3이 2행). */}
      <div
        className={
          isMobileViewport
            ? "mx-auto flex w-full flex-col gap-4 overflow-y-auto px-4 py-8"
            : "mx-auto flex max-w-5xl gap-10 overflow-x-auto overflow-y-auto px-8 py-12"
        }
        style={{ maxHeight: "80vh", color: config.textColor || undefined, fontFamily: resolvedFontFamily }}
      >
        {/* HOTFIX-141(사용자 지시 — "상단 사이드바의 컬럼과 컬럼의 영역을
            내가... 조절하는 기능을 만들어줘... 컬럼을... 좌우 순서를
            변경가능하게 해줘"): 4개 컬럼을 배열로 만들어 config.columnOrder
            순서대로, config.columnWidthsPx 너비로 그린다 — 기본값은 원래
            하드코딩이었던 w-40/w-48/w-56/w-56(160/192/224/224px)과
            동일해 무변화 마이그레이션.
            HOTFIX-152.11: 컬럼 내용 자체(columnContents)는 데스크톱/모바일이
            공유하고, 바깥 래퍼(너비 방식)만 갈라진다 — 데스크톱은 기존처럼
            컬럼 하나당 지정 px 너비를 그대로 쓰고, 모바일은 2개씩 묶은 행
            안에서 그 두 컬럼의 px 값을 비율(%)로 환산해 나눠 가진다(예:
            100px/224px 두 컬럼이면 약 31%/69%) — 실제 픽셀값은 390px
            프레임에 다 안 들어가 그대로 못 쓰지만, 관리자가 설정한 "상대적
            비중"은 이렇게 반영된다. */}
        {(() => {
          const columnContents: Record<number, React.ReactNode> = {
            // column 0: 이미지 뱅크에서 무작위로 고른 이미지(hover/클릭 시마다 갱신).
            0: displayImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImageUrl}
                alt=""
                className="w-full rounded object-cover"
                style={{ height: isMobileViewport ? 160 : 224, width: isMobileViewport ? "100%" : config.columnWidthsPx[0] }}
              />
            ) : null,
            // column 1: 실제 세션 데이터 + 고정 바로가기.
            1: (
              <div className="space-y-3 text-sm">
                {/* HOTFIX-141.2(사용자 지시 — "지금 현재 '로그인/로그아웃'
                    버튼을 없애고 '상단 사이드바' 에 로그인 / 로그아웃 버튼이
                    보이면 좋겠어"): 계정 영역에 있던 로그인/로그아웃 버튼을
                    여기로 옮겼다 — 로그인 여부와 무관하게 항상 column 1 맨
                    위에 보인다. */}
                {loginLogoutButton}
                {session && member ? (
                  <>
                    <p className="font-medium" style={{ color: config.textColor || "#111827" }}>{member.name}</p>
                    <p className="text-gray-500">{member.tier_name}</p>
                    <div className="flex gap-3">
                      <Link href="/mypage/follow" onClick={onClose} className="hover:underline">
                        팔로잉 {followingCount ?? "-"}
                      </Link>
                      <Link href="/mypage/follow" onClick={onClose} className="hover:underline">
                        팔로워 {followerCount ?? "-"}
                      </Link>
                    </div>
                    <div className="space-y-1 border-t border-gray-100 pt-2">
                      <p className="text-xs text-gray-400">최근 활동</p>
                      {activity.length === 0 ? (
                        <p className="text-xs text-gray-300">아직 활동이 없어요.</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {activity.map((a) => (
                            <li key={a.id} className="flex items-center justify-between text-xs">
                              <span>{a.label}</span>
                              <span className="text-gray-400">{a.detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link href="/mypage/timeline" onClick={onClose} className="inline-block text-xs text-blue-600 hover:underline">
                        전체보기
                      </Link>
                    </div>
                    <p className="text-gray-400">메시지 (준비 중)</p>
                  </>
                ) : null}
                <div className="space-y-1.5 border-t border-gray-100 pt-2">
                  {/* HOTFIX-141.1: column 2로 옮긴(hiddenFixedLinkHrefs에 포함된)
                      항목은 여기서 더 이상 그리지 않는다 — column 2 쪽에 관리자가
                      만든 사본이 대신 나타난다. */}
                  {FIXED_LINKS.filter((f) => !config.hiddenFixedLinkHrefs.includes(f.href)).map((f) => (
                    <Link key={f.href} href={f.href} onClick={onClose} className="block hover:underline">
                      {f.label}
                    </Link>
                  ))}
                </div>
              </div>
            ),
            // column 2: 관리자가 등록한 링크 목록.
            2: (
              <div className="space-y-2 text-sm">
                {config.links.map((link) => {
                  const hasChildren = link.children.length > 0;
                  const isArmed = hoveredLinkId === link.id;
                  return (
                    <div key={link.id} onMouseEnter={() => handleLinkHover(link.id)}>
                      {/* HOTFIX-141(사용자 지시 — "상단 사이드바의 '링크 hover
                          모션'을 다른걸로 바꿧는데도 적용이 안되고 있어"): 이
                          hover:underline이 어떤 모션을 골라도 항상 똑같이 밑줄을
                          그려 실제 모션 CSS(motionCss, 아래 <style>)를 가리고
                          있었다 — 이 자리의 hover 표현은 이제 전적으로 config.
                          hoverMotion이 담당한다(기본값 underline-glow가 이미
                          비슷한 밑줄 효과를 준다).
                          HOTFIX-152.12(사용자 지시 — "탭(터치)으로도 갱신되게
                          바꿔줘"): 모바일은 마우스가 없어 onMouseEnter가 한
                          번도 안 일어난다 — 하위 목록이 있는 링크는 첫 탭에서
                          곧장 이동하지 않고 handleLinkHover만 실행해(column 0
                          이미지·column 3 하위 목록이 즉시 갱신) "미리 보기"
                          상태로 만들고, 이미 미리 보기 중인(같은 링크를 다시
                          탭한) 경우에만 실제로 이동한다. 하위 목록이 없는
                          링크·데스크톱(마우스로 이미 hover를 마쳤을 것)은
                          기존처럼 탭/클릭 즉시 이동. */}
                      <Link
                        href={link.href}
                        onClick={(e) => {
                          if (isMobileViewport && hasChildren && !isArmed) {
                            e.preventDefault();
                            handleLinkHover(link.id);
                            return;
                          }
                          onClose();
                        }}
                        className={`flex items-center justify-between gap-2 ${LINK_HOVER_CLASS}`}
                      >
                        <span>{link.label}</span>
                        {isMobileViewport && hasChildren && (
                          <span className="shrink-0 text-xs text-gray-400">{isArmed ? "▾" : "▸"}</span>
                        )}
                      </Link>
                    </div>
                  );
                })}
              </div>
            ),
            // column 3: hover 중인 column2 링크의 하위 목록.
            3: (
              <div className="space-y-2 text-sm">
                {hoveredLink?.children.map((child) => (
                  <Link key={child.id} href={child.href} onClick={onClose} className={`block ${LINK_HOVER_CLASS}`}>
                    {child.label}
                  </Link>
                ))}
              </div>
            ),
          };

          if (!isMobileViewport) {
            return config.columnOrder.map((idx) => (
              <div
                key={`col-${idx}`}
                className={idx === 0 ? "hidden shrink-0 md:block" : "shrink-0"}
                style={{ width: config.columnWidthsPx[idx] }}
              >
                {columnContents[idx]}
              </div>
            ));
          }

          // HOTFIX-152.11: columnOrder를 앞에서부터 2개씩 묶어 한 행(가로
          // flex)으로 그린다 — 각 컬럼은 그 행 안 두 컬럼의 px 너비 비율만큼
          // flex-basis를 가져가 "너비 설정이 상대적으로는 반영"되게 한다.
          const rows: number[][] = [];
          for (let i = 0; i < config.columnOrder.length; i += 2) {
            rows.push(config.columnOrder.slice(i, i + 2));
          }
          return rows.map((row, rowIdx) => (
            <div key={`row-${rowIdx}`} className="flex gap-4">
              {row.map((idx) => {
                const rowTotalPx = row.reduce((sum, i) => sum + (config.columnWidthsPx[i] || 1), 0);
                const pct = ((config.columnWidthsPx[idx] || 1) / rowTotalPx) * 100;
                return (
                  <div key={`col-${idx}`} className="min-w-0" style={{ flexBasis: `${pct}%`, flexGrow: 0, flexShrink: 1 }}>
                    {columnContents[idx]}
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
