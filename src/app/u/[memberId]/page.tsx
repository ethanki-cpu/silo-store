"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

type Post = {
  id: string;
  body: string;
  photo_url: string | null;
  visibility: "public" | "private" | "friends";
  like_count: number;
  created_at: string;
};

type Profile = { id: string; name: string };

export default function MemberPersonalPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!session) return;

    async function load() {
      setFetching(true);
      setError(null);

      const res = await fetch(`/api/members/${memberId}/posts`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "페이지를 불러오지 못했어요.");
        setFetching(false);
        return;
      }

      setProfile(data.profile);
      setPosts(data.posts ?? []);
      setFetching(false);
    }

    load();
  }, [memberId, session]);

  if (authLoading || !session) return null;

  if (fetching) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (error) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 max-w-xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">{profile?.name}의 페이지</h1>

      {posts.length === 0 ? (
        <p className="text-gray-500">아직 볼 수 있는 글이 없어요.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-lg border border-gray-200 overflow-hidden"
            >
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
                  좋아요 {post.like_count} ·{" "}
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
