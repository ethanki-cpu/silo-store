"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { copyForGroup, copyForRoot, type GroupCopy } from "@/lib/tierContent";
import type { BenefitGroup } from "@/lib/tierCategoryAccess";

// EPIC-167(사용자 지시 — "캐러셀 아래 '열리는 세계' 설명이 가독성이 극혐 → 문 카드처럼 클릭하거나 커서를 올리면 열려서, 최상위 카테고리 안에 어떤 게시판이 열리는지, 가로로 나열하지 말고 세로 stack/2열"):
// 최상위 카테고리(About Silo·사일로 상점·살롱데상…)마다 카드 하나. 카드를 누르면(또는 마우스를 올리면) 열려서 그 안의 게시판이 세로 목록(넓은 화면은 2열)으로 나온다.
//  · 클릭 = 고정(다시 누르면 닫힘) · 마우스 올림 = 잠깐 열림(마우스 기기에서만, 떠나면 닫힘) · 키보드/터치는 버튼(누르기)으로.
//  · 카드는 항상 한 줄에 하나(세로 stack)라 열려도 옆 카드가 재배치되지 않아 마우스 위치가 흔들리지 않는다.
const ROOT_ICONS: [RegExp, string][] = [
  [/about/i, "🗝️"],
  [/상점|store|shop/i, "🏺"],
  [/살롱|salon/i, "🥂"],
  [/도슨트|docent/i, "🎧"],
  [/스튜디오|studio/i, "📷"],
  [/플[래레]닛|planet/i, "🪐"],
  [/마이|my/i, "🏠"],
];
const iconFor = (root: string) => ROOT_ICONS.find(([re]) => re.test(root))?.[1] ?? "🚪";

export function CategoryCards({ groups, highlightNew, copy }: { groups: BenefitGroup[]; highlightNew: boolean; copy: GroupCopy }) {
  const roots: { root: string; groups: BenefitGroup[] }[] = [];
  for (const g of groups) {
    const last = roots[roots.length - 1];
    if (last && last.root === g.root) last.groups.push(g);
    else roots.push({ root: g.root, groups: [g] });
  }
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<string | null>(null);
  const leaveTimer = useRef<number | null>(null);

  const toggle = (root: string) =>
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(root)) next.delete(root);
      else next.add(root);
      return next;
    });

  return (
    <div className="space-y-3">
      {roots.map((r) => {
        const open = pinned.has(r.root) || hover === r.root;
        const total = r.groups.reduce((n, g) => n + g.items.length, 0);
        const newCount = highlightNew ? r.groups.reduce((n, g) => n + g.items.filter((i) => i.isNew).length, 0) : 0;
        const rootCopy = copyForRoot(copy, r.root);
        return (
          <div
            key={r.root}
            className={`overflow-hidden rounded-xl border transition-shadow ${open ? "border-amber-300 bg-white shadow-md" : "border-gray-200 bg-white/70 hover:border-gray-300"}`}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") return;
              if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
              setHover(r.root);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "mouse") return;
              leaveTimer.current = window.setTimeout(() => setHover((h) => (h === r.root ? null : h)), 140);
            }}
          >
            <button type="button" onClick={() => toggle(r.root)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl" aria-hidden>
                {iconFor(r.root)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight text-gray-900">{r.root}</span>
                {rootCopy && !open && <span className="mt-0.5 line-clamp-1 block text-xs text-gray-500">{rootCopy}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {newCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">NEW {newCount}</span>}
                <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">{total}개의 방</span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="text-gray-400" aria-hidden>
                  ▾
                </motion.span>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                  <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3">
                    {rootCopy && <p className="text-xs italic leading-5 text-gray-500">{rootCopy}</p>}
                    {r.groups.map((g) => {
                      const line = copyForGroup(copy, g.title);
                      return (
                        <div key={`${g.root}/${g.title}`}>
                          {g.title !== r.root && (
                            <p className="mb-1 text-[13px] font-semibold text-gray-800">
                              {g.title} <span className="font-normal text-gray-400">{g.items.length}</span>
                            </p>
                          )}
                          {line && <p className="mb-1.5 text-xs leading-5 text-gray-500">{line}</p>}
                          {/* 세로 목록 — 모바일 1열, 넓은 화면 2열 */}
                          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                            {g.items.map((it) => (
                              <li key={it.name} className="flex items-start gap-2 rounded-md px-1.5 py-1 text-[13px] leading-5 text-gray-700">
                                <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${highlightNew && it.isNew ? "bg-amber-500" : "bg-gray-300"}`} />
                                <span className={highlightNew && it.isNew ? "font-medium text-gray-900" : undefined}>
                                  {it.name}
                                  {highlightNew && it.isNew && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">NEW</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
