"use client";

import Link from "next/link";
import type { NavTab } from "@/lib/navConfig";

// EPIC-039: LeftSidebar.tsx와 대칭 구조 — 자세한 배경은 그쪽 주석 참고.
//
// EPIC-043: 여닫이 아이콘은 클릭으로만 열린다. RightSidebar는 LeftSidebar와
// 달리 그룹 전부(커뮤니티/멤버십/갤러리/아카이브 등)가 기본 접힘 + hover로
// 펼쳐지는 아코디언 — 그룹명을 하드코딩해 특정 라벨만 골라내지 않고, 모든
// 그룹에 동일하게 적용한다(LeftSidebar.tsx의 ACCORDION_GROUP_LABELS와 대비).
export function RightSidebar({
  tab,
  open,
  onIconClick,
  onClose,
  onAmbientLeave,
  iconUrl,
  iconSizePx = 32,
}: {
  tab?: NavTab;
  open: boolean;
  onIconClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  onAmbientLeave: () => void;
  iconUrl?: string;
  // EPIC-041: 관리자 설정 아이콘 크기(px) — 기본값은 기존 하드코딩이었던 32px(w-8 h-8).
  iconSizePx?: number;
}) {
  if (!tab) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={onIconClick}
          aria-label={`${tab.label} 메뉴 열기`}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center rounded-l-md bg-green-800 text-white p-2 shadow-md"
        >
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt={tab.label}
              className="object-contain"
              style={{ width: iconSizePx, height: iconSizePx }}
            />
          ) : (
            <span className="text-lg">🚪</span>
          )}
        </button>
      )}

      <div
        onMouseLeave={onAmbientLeave}
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-green-800 text-white transform transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <span className="font-semibold">{tab.label}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
        <nav className="p-2 overflow-y-auto max-h-[calc(100vh-64px)]">
          {(tab.groups ?? []).map((group) => (
            <div key={group.groupLabel} className="mb-4 group">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60 cursor-default">
                {group.groupLabel}
              </p>
              <div className="hidden group-hover:block">
                {group.items.map((item, idx) => (
                  <Link
                    key={`${item.href}-${idx}`}
                    href={item.href}
                    onClick={onClose}
                    className="block px-3 py-2 rounded-md text-sm text-white hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
