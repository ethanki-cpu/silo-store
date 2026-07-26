"use client";

import { MYPAGE_TABS, type MyPageTabId } from "./mypageConfig";

export function MyPageNav({
  activeTab,
  onSelect,
}: {
  activeTab: MyPageTabId;
  onSelect: (tab: MyPageTabId) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
      {MYPAGE_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            activeTab === tab.id
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
