"use client";

import Link from "next/link";
import { MYPAGE_TABS } from "@/components/mypage/mypageConfig";
import { PageEditButton } from "@/components/admin/PageEditButton";

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

// EPIC-060: MyPage는 회원 개인 데이터(컬렉션/위시리스트/타임라인 등
// 12개 탭)를 보여주는 페이지라 Page Builder 모듈(Hero+Board)로 대체하지
// 않는다 — page_builder에는 메타데이터 행만 등록해(EPIC-060 SQL seed)
// /admin/pages 목록에 보이게 하고, "페이지 수정" 버튼만 추가한다.
export default function MyPageHomePage() {
  return (
    <div>
      <PageEditButton slug="mypage" />
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
