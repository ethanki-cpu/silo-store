"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { NAV_TABS, getActiveNavTabKey } from "@/lib/navConfig";

export function Navbar() {
  const { session, member, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTabKey = getActiveNavTabKey(
    pathname,
    searchParams.get("category"),
  );

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [spaceInquiryOpen, setSpaceInquiryOpen] = useState(false);
  const [spaceInquiryPos, setSpaceInquiryPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const spaceInquiryBtnRef = useRef<HTMLButtonElement>(null);

  const silostoreTab = NAV_TABS.find((t) => t.key === "silostore")!;
  const salonTab = NAV_TABS.find((t) => t.key === "salon")!;
  const rentalTab = NAV_TABS.find((t) => t.key === "rental")!;
  const spaceInquiryTab = NAV_TABS.find((t) => t.key === "space_inquiry")!;

  function openSpaceInquiry() {
    const rect = spaceInquiryBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setSpaceInquiryPos({ top: rect.bottom, left: rect.left });
    }
    setSpaceInquiryOpen(true);
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
      <div className="flex items-center justify-between p-4">
        <Link href="/" className="font-bold">
          사일로 스토어
        </Link>

        <div className="flex items-center gap-3">
          {!loading && session && member?.is_admin && (
            <Link
              href="/admin/payments"
              className="text-sm text-gray-600 hover:underline"
            >
              관리자
            </Link>
          )}

          {!loading && session && (
            <Link
              href="/mypage"
              className="text-sm text-gray-600 hover:underline"
            >
              {member
                ? `${member.name}님 · ${member.tier_name}`
                : "회원 정보 불러오는 중..."}
            </Link>
          )}

          {!loading &&
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

      <nav className="flex gap-1 px-4 overflow-x-auto whitespace-nowrap border-t border-gray-100">
        <button
          type="button"
          onClick={() => setLeftOpen(true)}
          onMouseEnter={() => setLeftOpen(true)}
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${
            activeTabKey === "silostore"
              ? "border-gray-800 text-gray-900 font-medium"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {silostoreTab.label}
        </button>

        <button
          type="button"
          onClick={() => setRightOpen(true)}
          onMouseEnter={() => setRightOpen(true)}
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${
            activeTabKey === "salon"
              ? "border-gray-800 text-gray-900 font-medium"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {salonTab.label}
        </button>

        <Link
          href={rentalTab.items![0].href}
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${
            activeTabKey === "rental"
              ? "border-gray-800 text-gray-900 font-medium"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {rentalTab.label}
        </Link>

        <button
          ref={spaceInquiryBtnRef}
          type="button"
          onClick={openSpaceInquiry}
          onMouseEnter={openSpaceInquiry}
          className={`px-3 py-2 text-sm border-b-2 -mb-px ${
            activeTabKey === "space_inquiry"
              ? "border-gray-800 text-gray-900 font-medium"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {spaceInquiryTab.label}
        </button>
      </nav>

      {spaceInquiryOpen && spaceInquiryPos && (
        <>
          <div
            onClick={() => setSpaceInquiryOpen(false)}
            className="fixed inset-0 z-30"
          />
          <div
            onMouseLeave={() => setSpaceInquiryOpen(false)}
            style={{ top: spaceInquiryPos.top, left: spaceInquiryPos.left }}
            className="fixed z-40 w-48 rounded-md border border-gray-200 bg-white shadow-md py-1"
          >
            {(spaceInquiryTab.items ?? []).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSpaceInquiryOpen(false)}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* 사일로상점 왼쪽 사이드바 */}
      {!leftOpen && (
        <button
          type="button"
          onClick={() => setLeftOpen(true)}
          onMouseEnter={() => setLeftOpen(true)}
          aria-label="사일로상점 메뉴 열기"
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
          <span className="font-semibold">{silostoreTab.label}</span>
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
          {(silostoreTab.groups ?? []).map((group) => (
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

      {/* 살롱데상 오른쪽 사이드바 */}
      {!rightOpen && (
        <button
          type="button"
          onClick={() => setRightOpen(true)}
          onMouseEnter={() => setRightOpen(true)}
          aria-label="살롱데상 메뉴 열기"
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
          <span className="font-semibold">{salonTab.label}</span>
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
          {(salonTab.groups ?? []).map((group) => (
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

      {(leftOpen || rightOpen) && (
        <div
          onClick={closeSidebars}
          className="fixed inset-0 z-30 bg-black/30"
        />
      )}
    </header>
  );
}
