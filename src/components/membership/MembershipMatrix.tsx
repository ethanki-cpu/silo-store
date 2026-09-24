"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { DEFAULT_GROUP_COPY, copyForGroup, copyForRoot, parseGroupCopy } from "@/lib/tierContent";
import type { ConditionRow } from "@/lib/tierAccess";
import type { BenefitGroup, TierCategoryAccess } from "@/lib/tierCategoryAccess";

// HOTFIX-162.12(사용자 지시 — 캐러셀 아래에 "각 등급별로 되는 권한과 아닌 권한을 비교하는 매트릭스"):
// 행 = 카테고리(펼치면 세부 게시판/페이지) · 요금/이용 조건, 열 = 등급, 셀 = ✓/✕/조건 문구.
// 데이터는 캐러셀과 같은 /api/membership/plans(실제 권한 설정에서 계산) 하나만 쓴다.
type Plan = { rank: number; name: string; price: number; honorary?: boolean; categories: TierCategoryAccess | null };

const keyOf = (g: BenefitGroup) => `${g.root}/${g.title}`;

function Mark({ on }: { on: boolean }) {
  return on ? <span className="font-bold text-emerald-600" aria-label="가능">✓</span> : <span className="text-gray-300" aria-label="불가">✕</span>;
}

export function MembershipMatrix({
  heading,
  subtitle,
  showConditions,
  expandAll,
  excludeCategories,
  groupCopy,
}: {
  heading: string;
  subtitle: string;
  showConditions: boolean;
  expandAll: boolean;
  excludeCategories: string;
  groupCopy: string;
}) {
  const { member } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/membership/plans")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((j: { plans?: Plan[]; conditionRows?: ConditionRow[] }) => {
        setPlans(j.plans ?? []);
        setConditions(j.conditionRows ?? []);
      })
      .catch(() => setPlans([]));
  }, []);

  const copy = parseGroupCopy(groupCopy || DEFAULT_GROUP_COPY);
  const excluded = excludeCategories.split(",").map((x) => x.trim()).filter(Boolean);

  // 누적형이라 가장 높은 등급이 모든 카테고리를 포함한다 — 그 등급의 그룹을 행 틀로 쓴다.
  const rows = useMemo(() => {
    if (!plans) return [];
    const base = [...plans].reverse().find((p) => p.categories)?.categories?.groups ?? [];
    const visible = base.filter((g) => !excluded.includes(g.title) && !excluded.includes(g.root));
    return visible.map((g) => ({
      key: keyOf(g),
      group: g,
      perTier: plans.map((p) => new Set((p.categories?.groups.find((x) => keyOf(x) === keyOf(g))?.items ?? []).map((i) => i.name))),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, excludeCategories]);

  if (!plans) return <p className="py-10 text-center text-sm text-gray-400">권한 비교표를 불러오는 중...</p>;
  if (plans.length === 0 || rows.length === 0) return null;

  const isOpen = (k: string) => expandAll || open.has(k);
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const myRank = member?.membership_rank ?? null;
  const colClass = (rank: number) => (myRank != null && (myRank >= 99 ? 4 : myRank) === rank ? "bg-amber-50/60" : "");

  const head = (
    <tr className="border-b border-gray-200 bg-gray-50 text-xs">
      <th className="sticky left-0 z-10 min-w-[10rem] bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-600">열리는 문</th>
      {plans.map((p) => (
        <th key={p.rank} className={`min-w-[5.5rem] px-2 py-2.5 text-center font-semibold text-gray-900 ${colClass(p.rank)}`}>
          {p.name}
          <span className="block text-[10px] font-normal text-gray-400">{p.honorary ? "초대받는 자리" : p.price === 0 ? "무료" : `월 ${p.price.toLocaleString()}원`}</span>
        </th>
      ))}
    </tr>
  );

  return (
    <section className="mb-10">
      {(heading || subtitle) && (
        <div className="mb-4 text-center">
          {heading && <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>{head}</thead>
          <tbody>
            {rows.map((r, ri) => {
              const showRoot = ri === 0 || rows[ri - 1].group.root !== r.group.root;
              const total = r.group.items.length;
              const single = total === 1;
              return (
                <RowBlock key={r.key}>
                  {showRoot && (
                    <tr className="bg-gray-100/70">
                      <td colSpan={plans.length + 1} className="sticky left-0 px-3 py-1.5 text-xs font-bold tracking-wide text-gray-700">
                        {r.group.root}
                        {copyForRoot(copy, r.group.root) && <span className="ml-2 font-normal normal-case italic text-gray-500">{copyForRoot(copy, r.group.root)}</span>}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`border-t border-gray-100 ${single ? "" : "cursor-pointer hover:bg-gray-50"}`}
                    onClick={single ? undefined : () => toggle(r.key)}
                  >
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-gray-800">
                      {single ? (
                        r.group.items[0].name
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400">{isOpen(r.key) ? "▼" : "▶"}</span>
                          {r.group.title}
                          <span className="text-[11px] text-gray-400">{total}</span>
                        </span>
                      )}
                    </td>
                    {plans.map((p, ci) => {
                      const n = r.perTier[ci].size;
                      return (
                        <td key={p.rank} className={`px-2 py-2 text-center ${colClass(p.rank)}`}>
                          {n === 0 ? <Mark on={false} /> : n >= total ? <Mark on /> : <span className="text-xs font-medium text-amber-700">{n}/{total}</span>}
                        </td>
                      );
                    })}
                  </tr>
                  {isOpen(r.key) && copyForGroup(copy, r.group.title) && (
                    <tr className="border-t border-gray-50">
                      <td colSpan={plans.length + 1} className="sticky left-0 bg-white px-3 py-2 text-xs italic leading-5 text-gray-500">
                        {copyForGroup(copy, r.group.title)}
                      </td>
                    </tr>
                  )}
                  {!single &&
                    isOpen(r.key) &&
                    r.group.items.map((it) => (
                      <tr key={it.name} className="border-t border-gray-50 text-xs">
                        <td className="sticky left-0 z-10 bg-white py-1.5 pl-9 pr-3 text-left text-gray-600">{it.name}</td>
                        {plans.map((p, ci) => (
                          <td key={p.rank} className={`px-2 py-1.5 text-center ${colClass(p.rank)}`}>
                            <Mark on={r.perTier[ci].has(it.name)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                </RowBlock>
              );
            })}

            {showConditions && conditions.length > 0 && (
              <>
                <tr className="bg-gray-100/70">
                  <td colSpan={plans.length + 1} className="sticky left-0 px-3 py-1.5 text-xs font-bold tracking-wide text-gray-700">
                    요금과 이용 방식
                  </td>
                </tr>
                {conditions.map((c) => (
                  <tr key={c.label} className="border-t border-gray-100">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-gray-800">{c.label}</td>
                    {plans.map((p) => {
                      const v = c.cells[p.rank];
                      return (
                        <td key={p.rank} className={`px-2 py-2 text-center text-xs ${colClass(p.rank)}`}>
                          {typeof v === "string" ? <span className="text-gray-800">{v}</span> : <Mark on={v === true} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
      {myRank != null && <p className="mt-2 text-center text-[11px] text-gray-400">노란 배경 열이 지금 내 등급이에요.</p>}
    </section>
  );
}

// tbody 안에서 여러 <tr>을 키 하나로 묶기 위한 얇은 Fragment.
function RowBlock({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
