"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

// HOTFIX-161.9: 멤버십 캐러셀 '가입' 미션 창에서 제출한 답변을 마이페이지에 자동 등록해 보여준다.
type Row = {
  tier_rank: number;
  question_id: string;
  question_text: string;
  answer_text: string | null;
  answer_photo_url: string | null;
  updated_at: string;
};

export default function MyPageMissionsPage() {
  const memberId = useMyPageMember();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tierNames, setTierNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    Promise.all([
      supabase
        .from("membership_mission_answers")
        .select("tier_rank, question_id, question_text, answer_text, answer_photo_url, updated_at")
        .eq("member_id", memberId)
        .order("tier_rank")
        .order("created_at"),
      supabase.from("membership_tiers").select("rank, name"),
    ]).then(([answers, tiers]) => {
      if (cancelled) return;
      setRows((answers.data ?? []) as Row[]);
      setTierNames(Object.fromEntries(((tiers.data ?? []) as { rank: number; name: string }[]).map((t) => [t.rank, t.name])));
    });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const grouped = new Map<number, Row[]>();
  for (const r of rows ?? []) grouped.set(r.tier_rank, [...(grouped.get(r.tier_rank) ?? []), r]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">멤버십 미션</h2>
      {rows === null ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">아직 제출한 미션 답변이 없어요. 멤버십 페이지에서 등급을 골라 &lsquo;가입&rsquo;을 누르면 미션이 나와요.</p>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([rank, list]) => (
            <section key={rank} className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 font-semibold">{tierNames[rank] ?? `등급 ${rank}`}</h3>
              <ul className="space-y-4 text-sm">
                {list.map((r) => (
                  <li key={r.question_id}>
                    <p className="font-medium text-gray-800">{r.question_text}</p>
                    {r.answer_photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.answer_photo_url} alt="제출한 사진" className="my-1 h-32 rounded border border-gray-200 object-cover" />
                    )}
                    <p className="whitespace-pre-line text-gray-600">{r.answer_text || "(답변 없음)"}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
