"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// EPIC-087-PHASE-D: "티어별 접근 권한 매트릭스" — 사용자가 확인해준 대로
// (질문 "매트릭스 의미") 기존 membership_tiers의 boolean/enum 권한 플래그
// (src/lib/serverAuth.ts의 TierFlags 중 실제 게이팅에 쓰이는 것들)를 표
// 형태로 일괄 편집한다. 페이지/게시판별 min_rank_to_read는 여기가 아니라
// 각 게시판(BoardForm)/페이지(admin/pages/[id]) 편집 화면에서 개별 지정.
type TierRow = {
  rank: number;
  name: string;
  board_write_scope: "limited" | "all";
  board_can_write_docent: boolean;
  board_can_create: boolean;
  board_has_patron_board: boolean;
  board_has_promo_board: boolean;
};

const BOOL_FIELDS: { key: keyof TierRow; label: string }[] = [
  { key: "board_can_write_docent", label: "도슨트 글쓰기" },
  { key: "board_can_create", label: "게시판 생성" },
  { key: "board_has_patron_board", label: "패트론 게시판" },
  { key: "board_has_promo_board", label: "홍보 게시판" },
];

export function TierPermissionMatrix() {
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRank, setSavingRank] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("membership_tiers")
      .select(
        "rank, name, board_write_scope, board_can_write_docent, board_can_create, board_has_patron_board, board_has_promo_board",
      )
      .order("rank", { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          setFetching(false);
          return;
        }
        setTiers((data ?? []) as TierRow[]);
        setFetching(false);
      });
  }, []);

  async function save(rank: number, patch: Partial<TierRow>) {
    setSavingRank(rank);
    setError(null);
    const { error: updateError } = await supabase.from("membership_tiers").update(patch).eq("rank", rank);
    setSavingRank(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTiers((prev) => prev.map((t) => (t.rank === rank ? { ...t, ...patch } : t)));
  }

  if (fetching) {
    return <p className="text-sm text-gray-500 mb-6">티어 권한 불러오는 중...</p>;
  }

  return (
    <section className="rounded-lg border border-gray-200 p-4 mb-6">
      <h2 className="text-lg font-semibold mb-3">티어별 접근 권한 매트릭스</h2>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-3">티어</th>
              <th className="py-2 pr-3">게시판 쓰기 범위</th>
              {BOOL_FIELDS.map((f) => (
                <th key={f.key} className="py-2 pr-3">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.rank} className="border-b border-gray-100">
                <td className="py-2 pr-3 font-medium whitespace-nowrap">
                  {tier.name}
                  {savingRank === tier.rank && <span className="text-xs text-gray-400 ml-1">저장 중...</span>}
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={tier.board_write_scope}
                    onChange={(e) => save(tier.rank, { board_write_scope: e.target.value as "limited" | "all" })}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value="limited">limited</option>
                    <option value="all">all</option>
                  </select>
                </td>
                {BOOL_FIELDS.map((f) => (
                  <td key={f.key} className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={Boolean(tier[f.key])}
                      onChange={(e) => save(tier.rank, { [f.key]: e.target.checked } as Partial<TierRow>)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
