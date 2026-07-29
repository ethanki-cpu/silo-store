"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { PageEditButton } from "@/components/admin/PageEditButton";

type Post = {
  id: string;
  body: string;
  photo_url: string | null;
  visibility: "public" | "private" | "friends";
  like_count: number;
  created_at: string;
};

const VISIBILITY_LABEL: Record<Post["visibility"], string> = {
  public: "공개",
  private: "비공개",
  friends: "친구공개",
};

export default function MyPersonalPage() {
  const { session, member, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session || !member) return;

    async function load() {
      setFetching(true);
      const res = await fetch(`/api/members/${member!.id}/posts`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      const data = await res.json();
      setPosts(data.posts ?? []);
      setFetching(false);
    }

    load();
  }, [session, member]);

  if (authLoading || !session) return null;

  return (
    <>
      <PageEditButton slug="me" />
      <main className="flex-1 p-8 max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{member?.name}의 페이지</h1>
        <Link
          href="/me/write"
          className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm"
        >
          글쓰기
        </Link>
      </div>

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">아직 작성한 글이 없어요.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="rounded-lg border border-gray-200 overflow-hidden">
              {post.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.photo_url}
                  alt=""
                  className="w-full aspect-square object-cover"
                />
              )}
              <div className="p-3">
                <p className="text-gray-800 whitespace-pre-wrap">{post.body}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {VISIBILITY_LABEL[post.visibility]} · 좋아요 {post.like_count} ·{" "}
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      </main>
    </>
  );
}
