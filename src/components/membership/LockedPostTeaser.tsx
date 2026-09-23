"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-162 Phase 2: 서버가 { locked: true, teaser }만 내려줬을 때 그리는 화면. 제목/썸네일/서론
// 3줄만 실제 데이터이고, 아래 "흐린 본문"은 실제 본문이 아니라 회색 막대 자리표시자다 — 본문은
// 서버 응답에 애초에 없으므로 DevTools로 블러를 지워도 볼 수 있는 게 없다.
export type LockedPostData = {
  locked: true;
  reason: "rank" | "daily_limit";
  message: string;
  requiredRank: number | null;
  requiredRankLabel: string | null;
  teaser: { title: string | null; excerpt: string; image: string | null };
};

const PLACEHOLDER_LINES = [100, 96, 88, 100, 72, 94, 100, 64, 90, 100, 80, 98, 60];

export function LockedPostTeaser({ data }: { data: LockedPostData }) {
  const { session } = useAuth();
  const { teaser } = data;
  const isDaily = data.reason === "daily_limit";

  return (
    <main className="flex-1 bg-white px-6 py-10">
      <article className="mx-auto max-w-3xl">
        {teaser.title && <h1 className="mb-4 text-2xl font-bold text-gray-900">{teaser.title}</h1>}
        {teaser.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teaser.image} alt="" className="mb-5 max-h-96 w-full rounded-lg object-cover" />
        )}
        {teaser.excerpt && <p className="whitespace-pre-line text-base leading-8 text-gray-800">{teaser.excerpt}</p>}

        <div className="relative mt-4">
          <div className="pointer-events-none select-none space-y-3 blur-[6px]" aria-hidden>
            {PLACEHOLDER_LINES.map((w, i) => (
              <div key={i} className="h-3 rounded bg-gray-300" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/70 to-white backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-xl" role="dialog" aria-label="멤버십 안내">
              <div className="text-3xl" aria-hidden>
                🔒
              </div>
              <p className="mt-2 text-base font-semibold text-gray-900">
                {isDaily ? "오늘의 열람 한도를 모두 사용했어요" : `${data.requiredRankLabel ?? "상위"} 등급부터 이어서 읽을 수 있어요`}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{data.message}</p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/membership" className="rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700">
                  멤버십 가입하고 계속 읽기
                </Link>
                {!session && (
                  <Link href="/login" className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    이미 회원이라면 로그인
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
