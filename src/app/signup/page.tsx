"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (data.user) {
      const { error: updateError } = await supabase
        .from("members")
        .update({ name })
        .eq("auth_user_id", data.user.id);

      if (updateError) {
        setLoading(false);
        setError(`가입은 됐지만 이름 저장에 실패했어요: ${updateError.message}`);
        return;
      }
    }

    setLoading(false);
    router.push("/");
    router.refresh();
  }

  // EPIC-161 Phase 4(사용자 지시 — "구글과 카톡 로그인도 넣어야지"): /login과
  // 동일한 signInWithOAuth 흐름 — Supabase가 최초 로그인 시 계정을 자동
  // 생성하므로 이 페이지에서 따로 처리할 게 없다(로그인/가입 겸용).
  async function handleOAuth(provider: "google" | "kakao") {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  return (
    <>
      <PageEditButton slug="signup" />
      <main className="flex-1 flex items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">회원가입</h1>

        <div>
          <label className="block text-sm mb-1">이름</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">이메일</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">비밀번호</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-800 text-white px-3 py-2 disabled:opacity-50"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 border-t border-gray-200" />
          또는
          <div className="flex-1 border-t border-gray-200" />
        </div>

        <button
          type="button"
          onClick={() => handleOAuth("google")}
          className="w-full rounded-md border border-gray-300 bg-white text-gray-800 px-3 py-2 hover:bg-gray-50"
        >
          Google로 계속하기
        </button>

        <button
          type="button"
          onClick={() => handleOAuth("kakao")}
          className="w-full rounded-md bg-[#FEE500] text-[#191600] px-3 py-2 hover:brightness-95"
        >
          카카오로 계속하기
        </button>

        <p className="text-sm text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="underline">
            로그인
          </Link>
        </p>
      </form>
      </main>
    </>
  );
}
