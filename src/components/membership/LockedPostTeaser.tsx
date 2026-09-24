"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-162 Phase 2 / EPIC-163 Task 1(살아있는 자물쇠): 서버가 { locked: true, teaser }만 내려줬을 때 그리는 화면.
// 제목/썸네일/서론만 실제 데이터이고, 아래 "흐린 본문"은 실제 본문이 아니라 자리표시자 줄이다 — 본문은 서버 응답에 애초에 없으므로
// DevTools로 블러를 지워도 볼 수 있는 게 없다. 자물쇠에 마우스를 올리면 세차게 흔들리고, 등급별 열쇠 문구가 빛난다.
export type LockedPostData = {
  locked: true;
  reason: "rank" | "daily_limit";
  message: string;
  requiredRank: number | null;
  requiredRankLabel: string | null;
  teaser: { title: string | null; excerpt: string; image: string | null };
};

const PLACEHOLDER_LINES = [100, 96, 88, 100, 72, 94, 100, 64, 90, 100, 80, 98, 60];
const SHAKE = [0, -14, 14, -12, 12, -8, 8, -4, 4, 0];

export function LockedPostTeaser({ data }: { data: LockedPostData }) {
  const { session } = useAuth();
  const { teaser } = data;
  const isDaily = data.reason === "daily_limit";
  const [notice, setNotice] = useState<string | null>(null);
  const label = data.requiredRankLabel ?? "상위 등급";

  return (
    <main className="flex-1 bg-white px-6 py-10">
      <article className="mx-auto max-w-3xl">
        {teaser.title && <h1 className="mb-4 text-2xl font-bold text-gray-900">{teaser.title}</h1>}
        {teaser.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teaser.image} alt="" className="mb-5 max-h-96 w-full rounded-lg object-cover" />
        )}
        {teaser.excerpt && <p className="whitespace-pre-line text-base leading-8 text-gray-800">{teaser.excerpt}</p>}

        <div className="relative mt-4 min-h-[26rem]">
          <div className="pointer-events-none select-none space-y-3" aria-hidden>
            {PLACEHOLDER_LINES.map((w, i) => (
              <div key={i} className="h-3 rounded bg-gray-300" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/40 to-white/90 backdrop-blur-md" />

          <div className="absolute inset-0 flex items-center justify-center px-2 sm:px-4">
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-amber-200/70 bg-white/85 p-6 text-center shadow-2xl backdrop-blur"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              role="dialog"
              aria-label="멤버십 안내"
            >
              <motion.button
                type="button"
                aria-label="잠긴 콘텐츠"
                className="mx-auto block cursor-pointer text-7xl leading-none drop-shadow-lg"
                whileHover={{ x: SHAKE, rotate: [0, -6, 6, -5, 5, -3, 3, 0], transition: { duration: 0.55 } }}
                whileTap={{ scale: 0.92 }}
              >
                🔒
              </motion.button>

              <motion.p
                className="mt-4 text-lg font-bold text-amber-900"
                animate={{ textShadow: ["0 0 0px rgba(212,175,55,0)", "0 0 16px rgba(212,175,55,0.95)", "0 0 0px rgba(212,175,55,0)"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              >
                {isDaily ? "오늘 열 수 있는 문을 모두 열었어요" : `${label}의 열쇠가 필요합니다`}
              </motion.p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{data.message}</p>

              <div className="mt-5 flex flex-col gap-2">
                <Link href="/membership" className="rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-gray-700">
                  {isDaily ? "더 깊은 자리로 — 멤버십 보기" : `${label} 열쇠 받으러 가기`}
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNotice("하루 이용권은 곧 열려요. 지금은 멤버십으로 바로 열 수 있어요.")} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
                    🗝️ 하루 이용권
                  </button>
                  <button type="button" onClick={() => setNotice("이 글만 열어 보는 단건 결제는 곧 열려요. 지금은 멤버십으로 바로 열 수 있어요.")} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
                    📜 이 글만 열기
                  </button>
                </div>
                {notice && <p className="text-xs leading-5 text-gray-500">{notice}</p>}
                {!session && (
                  <Link href="/login" className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    이미 회원이라면 로그인
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </article>
    </main>
  );
}
