"use client";

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
  const activeTab = NAV_TABS.find((t) => t.key === activeTabKey);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
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
        {NAV_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.items[0].href}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              activeTabKey === tab.key
                ? "border-gray-800 text-gray-900 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab && (
        <div className="flex gap-4 px-4 py-2 overflow-x-auto whitespace-nowrap bg-gray-50 text-sm">
          {activeTab.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gray-600 hover:text-gray-900 hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
