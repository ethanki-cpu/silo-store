"use client";

import { useEffect, useRef } from "react";
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
  // EPIC-054D(접근성 감사 §13): Escape로 닫기 + 닫힐 때 트리거 아이콘으로
  // 포커스 복귀 + 패널이 닫혀 있을 때 포커스/스크린리더 접근 차단(inert).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(open);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  if (!tab) return null;

  return (
    <>
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={onIconClick}
          aria-label={`${tab.label} 메뉴 열기`}
          aria-expanded={open}
          aria-controls="right-sidebar-panel"
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
        id="right-sidebar-panel"
        aria-hidden={!open}
        inert={!open}
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
