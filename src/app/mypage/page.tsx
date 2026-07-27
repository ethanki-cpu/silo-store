"use client";

import Link from "next/link";
import { MYPAGE_TABS } from "@/components/mypage/mypageConfig";

// EPIC-045: 각 탭의 상징적인 이모지 — 별도 아이콘 시스템이 없는 이
// 프로젝트에서 Navbar의 🔑/🚪 폴백과 같은 방식으로 "작은 박물관" 전시실
// 느낌만 가볍게 더한다(디자인 시스템에 아이콘 규칙 자체를 추가하진 않음).
const TAB_ICONS: Record<string, string> = {
  collections: "🗄️",
  wishlist: "🤍",
  follow: "🤝",
  salon: "🛋️",
  "docent-certificate": "🎓",
  space: "🏠",
  exhibition: "🖼️",
  badges: "🏅",
  comments: "💬",
  timeline: "🕰️",
  bucketlist: "✅",
  visitors: "👣",
};

export default function MyPageHomePage() {
  return (
    <div>
      <p className="text-gray-600 mb-6">
        나만의 물건과 이야기, 흔적이 모이는 작은 박물관입니다. 아래 전시실을
        둘러보세요.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {MYPAGE_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/mypage/${tab.id}`}
            className="rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">{TAB_ICONS[tab.id] ?? "📌"}</div>
            <p className="font-medium text-sm">{tab.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
