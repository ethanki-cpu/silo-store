"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

export default function WritePersonalPostPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [photoUrl, setPhotoUrl] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "friends">(
    "public",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ body, photoUrl, visibility }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/me");
  }

  return (
    <main className="flex-1 p-8 max-w-xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">글쓰기</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">사진 URL (선택)</label>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">내용</label>
          <textarea
            required
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">공개 범위</label>
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "public" | "private" | "friends")
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="public">공개</option>
            <option value="friends">친구공개 (로그인한 회원 전체)</option>
            <option value="private">비공개</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-800 text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? "등록 중..." : "등록"}
        </button>
      </form>
    </main>
  );
}
