"use client";

import Link from "next/link";
import type { NavTab } from "@/lib/navConfig";

// EPIC-039: EPIC-037이 sidebar-left 탭을 다른 상위 탭과 동일한 작은 hover
// 드롭다운으로 통합했지만, 실사용 결과 화면 전체 높이의 슬라이드인 패널이
// 다시 필요하다는 피드백을 받아 복구한다. 다만 EPIC-037의 "hover로 열고
// 클릭으로 고정, 바깥 클릭으로 닫기" 상태 관리 자체는 그대로 유지 —
// Navbar.tsx가 관리하는 openTab/pinnedKey에서 파생한 `open` 값을 그대로
// 받아쓰기만 하므로, 예전처럼 별도의 leftOpen state를 다시 두어 두 상태가
// 충돌하는 일이 없다.
export function LeftSidebar({
  tab,
  open,
  onIconMouseEnter,
  onIconClick,
  onClose,
  onAmbientLeave,
  iconUrl,
  iconSizePx = 32,
}: {
  tab?: NavTab;
  open: boolean;
  onIconMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void;
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
          onMouseEnter={onIconMouseEnter}
          aria-label={`${tab.label} 메뉴 열기`}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center rounded-r-md bg-green-800 text-white p-2 shadow-md"
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
            <span className="text-lg">🔑</span>
          )}
        </button>
      )}

      <div
        onMouseLeave={onAmbientLeave}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-800 text-white transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
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
            <div key={group.groupLabel} className="mb-4">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                {group.groupLabel}
              </p>
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
          ))}
        </nav>
      </div>
    </>
  );
}
