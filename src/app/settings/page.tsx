"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function SettingsPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [myName, setMyName] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;

    supabase
      .from("members")
      .select("name")
      .eq("auth_user_id", session.user.id)
      .single()
      .then(({ data }) => {
        setMyName(data?.name ?? null);
        setFetching(false);
      });
  }, [session]);

  if (loading || !session) {
    return null;
  }

  return (
    <>
      <PageEditButton slug="settings" />
      <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">설정</h1>
        <Link href="/mypage" className="text-sm text-gray-500 hover:underline">
          마이페이지로
        </Link>
      </div>

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-500">이름</span>
            <span>{myName}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-500">이메일</span>
            <span>{session.user.email}</span>
          </div>
        </div>
      )}
      </main>
    </>
  );
}
