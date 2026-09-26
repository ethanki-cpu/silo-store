"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { openTierSimulator } from "@/components/membership/TierSimulator";

// EPIC-165(사용자 지시 — "상단 메뉴의 '등급' 팝오버에 하루 퀘스트, 내 등급 시뮬레이터 버튼"): "오늘 사일로에서 할 수 있는 것" 체크리스트.
// 등급별로 할 수 있는 항목이 늘고, 아직 못 하는 항목은 자물쇠와 "○○부터"로 보인다. 체크는 이 기기(localStorage)에 하루 단위로만 저장한다(한국 시간 자정에 초기화) —
// 서버에 기록하지 않는 가벼운 놀이 요소라 어디에도 포인트/권한에 영향 없음.
type Quest = { id: string; icon: string; title: string; minRank: number; href: string };
export const DAILY_QUESTS: Quest[] = [
  { id: "record", icon: "✍️", title: "오늘의 기록 남기기", minRank: 0, href: "/boards" },
  { id: "planet", icon: "🪐", title: "내 행성 둘러보기", minRank: 0, href: "/silo-planet" },
  { id: "docent", icon: "🍷", title: "온라인 도슨트 한 편 읽기", minRank: 0, href: "/docent" },
  { id: "visit", icon: "🔭", title: "다른 회원의 행성 구경하고 좋아요", minRank: 1, href: "/silo-planet" },
  { id: "club", icon: "🤝", title: "클럽 모임 살펴보기", minRank: 1, href: "/clubs" },
  { id: "salon", icon: "🥂", title: "살롱데상 체크인", minRank: 2, href: "/salon/checkin" },
  { id: "decorate", icon: "💎", title: "내 행성 꾸미기", minRank: 3, href: "/silo-planet" },
  { id: "column", icon: "🖋️", title: "살롱의 목소리(칼럼) 남기기", minRank: 4, href: "/boards" },
];
const TIER_NAME: Record<number, string> = { 0: "Silo Angel", 1: "Alice", 2: "Great Gatsby", 3: "Patron", 4: "Lautrec" };

function todayKey() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return `silo-quests-${kst.toISOString().slice(0, 10)}`;
}

export function DailyQuests({ rank, onNavigate }: { rank: number; onNavigate?: () => void }) {
  const [done, setDone] = useState<string[]>([]);
  const key = useMemo(() => todayKey(), []);
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setDone([]);
    }
  }, [key]);
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* 저장 실패해도 화면 상태는 유지 */
      }
      return next;
    });

  const open = DAILY_QUESTS.filter((q) => rank >= q.minRank);
  const doneCount = open.filter((q) => done.includes(q.id)).length;
  const pct = open.length ? Math.round((doneCount / open.length) * 100) : 0;

  return (
    <div className="border-t border-gray-100 pt-3 mb-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">🎯 오늘의 하루 퀘스트</p>
        <span className="text-[11px] text-gray-400">
          {doneCount}/{open.length}
        </span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1">
        {DAILY_QUESTS.map((q) => {
          const unlocked = rank >= q.minRank;
          const checked = done.includes(q.id);
          return (
            <li key={q.id} className={`flex items-center gap-2 text-xs ${unlocked ? "" : "opacity-40"}`}>
              {unlocked ? (
                <input type="checkbox" checked={checked} onChange={() => toggle(q.id)} className="h-3.5 w-3.5 accent-amber-500" aria-label={`${q.title} 완료`} />
              ) : (
                <span aria-hidden className="w-3.5 text-center">
                  🔒
                </span>
              )}
              {unlocked ? (
                <Link href={q.href} onClick={onNavigate} className={`flex-1 hover:underline ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>
                  {q.icon} {q.title}
                </Link>
              ) : (
                <span className="flex-1 text-gray-500">
                  {q.icon} {q.title}
                  <span className="ml-1 text-[10px]">· {TIER_NAME[q.minRank]}부터</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {doneCount === open.length && open.length > 0 && <p className="mt-1.5 text-[11px] text-amber-600">✨ 오늘의 퀘스트를 모두 마쳤어요!</p>}
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openTierSimulator();
        }}
        className="mt-2.5 w-full rounded-md border border-gray-300 bg-gray-50 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        🎛️ 내 등급 시뮬레이터 열기
      </button>
    </div>
  );
}
