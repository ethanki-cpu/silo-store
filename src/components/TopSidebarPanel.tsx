"use client";

// HOTFIX-137.9(사용자 지시 — Kinfolk 레퍼런스: "맨위 오른쪽에 아이콘을
// 누르면 사이드바가 아래로 슬라이드돼면서" + 3-컬럼 스펙): 화면 위에서
// 아래로 슬라이드하는 전체너비 메가 메뉴. column 1(이름/등급/팔로워/활동/
// 메시지)은 실제 로그인 세션 데이터 — MembershipPopover.tsx와 같은 방식으로
// 직접 조회한다(관리자가 편집할 콘텐츠가 아님). column 2는 관리자가
// site_settings.top_sidebar에 저장한 링크 목록, column 3은 그중 마우스를
// 올린 링크의 하위 목록(hover cascade). "column 1/2/3"이라는 텍스트
// 라벨 자체는 화면에 표시하지 않는다(사용자 지시대로).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import type { TopSidebarLink } from "@/lib/topSidebarSettings";

export function TopSidebarPanel({
  links,
  open,
  onClose,
  editable = false,
}: {
  links: TopSidebarLink[];
  open: boolean;
  onClose: () => void;
  /** HOTFIX-137.9: Navbar.tsx의 topBarRef와 동일한 이유 — 관리자 편집
      캔버스 안에서 position:fixed를 쓰면 뷰포트 최상단으로 튀어올라
      캔버스 박스 밖에서 렌더링된다(EPIC-136에서 이미 겪은 버그와 동일
      원인). editable일 때는 absolute로 바꿔 캔버스 안에 자연스럽게
      자리잡게 한다. */
  editable?: boolean;
}) {
  const { session, member } = useAuth();
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !member) return;
    let cancelled = false;
    supabase
      .from("member_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", member.id)
      .then(({ count }) => {
        if (!cancelled) setFollowerCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [open, member]);

  const hoveredLink = links.find((l) => l.id === hoveredLinkId) ?? null;

  return (
    <div
      ref={panelRef}
      className={`${editable ? "absolute" : "fixed"} inset-x-0 top-0 z-50 transform border-b border-gray-200 bg-white shadow-xl transition-transform duration-300 ${
        open ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ maxHeight: "80vh" }}
      onMouseLeave={() => setHoveredLinkId(null)}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 text-xl text-gray-400 hover:text-gray-700"
      >
        ✕
      </button>
      <div className="mx-auto flex max-w-5xl gap-10 overflow-y-auto px-8 py-12" style={{ maxHeight: "80vh" }}>
        {/* 왼쪽 이미지 자리 — column2 링크에 마우스를 올렸을 때만 그 링크의 이미지가 보인다. */}
        <div className="hidden w-40 shrink-0 md:block">
          {hoveredLink?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hoveredLink.imageUrl} alt="" className="h-56 w-40 rounded object-cover" />
          )}
        </div>

        {/* column 1: 실제 세션 데이터 */}
        <div className="w-48 shrink-0 space-y-3 text-sm text-gray-700">
          {session && member ? (
            <>
              <p className="font-medium text-gray-900">{member.name}</p>
              <p className="text-gray-500">{member.tier_name}</p>
              <Link href="/mypage/follow" onClick={onClose} className="block hover:underline">
                팔로워 {followerCount ?? "-"}
              </Link>
              <Link href="/mypage/timeline" onClick={onClose} className="block hover:underline">
                최근 활동
              </Link>
              <p className="text-gray-400">메시지 (준비 중)</p>
            </>
          ) : (
            <Link href="/login" onClick={onClose} className="block font-medium text-gray-900 hover:underline">
              로그인
            </Link>
          )}
        </div>

        {/* column 2: 관리자가 등록한 링크 목록 */}
        <div className="w-56 shrink-0 space-y-2 text-sm">
          {links.map((link) => (
            <div key={link.id} onMouseEnter={() => setHoveredLinkId(link.id)}>
              <Link href={link.href} onClick={onClose} className="block text-gray-700 hover:text-gray-950 hover:underline">
                {link.label}
              </Link>
            </div>
          ))}
        </div>

        {/* column 3: hover 중인 column2 링크의 하위 목록 */}
        <div className="w-56 shrink-0 space-y-2 text-sm">
          {hoveredLink?.children.map((child) => (
            <Link key={child.id} href={child.href} onClick={onClose} className="block text-gray-700 hover:text-gray-950 hover:underline">
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
