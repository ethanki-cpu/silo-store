"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NavTab } from "@/lib/navConfig";

// EPIC-039: EPIC-037이 sidebar-left 탭을 다른 상위 탭과 동일한 작은 hover
// 드롭다운으로 통합했지만, 실사용 결과 화면 전체 높이의 슬라이드인 패널이
// 다시 필요하다는 피드백을 받아 복구한다.
//
// EPIC-043: 여닫이 아이콘은 클릭으로만 열린다(hover로 열리지 않음 — 아래
// 버튼에 onMouseEnter가 없는 이유). 패널이 열린 뒤 닫는 방법(바깥 클릭/✕/
// 패널에서 마우스가 완전히 벗어남)은 그대로 유지.
//
// EPIC-058: 그룹 헤더가 <p>(클릭 불가)였던 것을, "클릭하면 Hub Page로
// 이동" + "Chevron 클릭으로 펼치기/접기"의 두 동작으로 분리한다. 이전에는
// "온라인 도슨트"/"헤리티지" 그룹만 hover로 펼쳐지는 CSS 아코디언이었는데,
// hover는 라벨 클릭(이동)과 한 DOM에 묶이면 동작이 섞여버려서 명시적 클릭
// 상태(useState)로 바꾼다 — 펼침 여부가 이동 여부와 완전히 독립적으로
// 동작해야 하기 때문. 초기 펼침 여부는 기존 기본 동작(도슨트/헤리티지만
// 기본 접힘, 나머지는 기본 펼침)을 그대로 유지한다.
function defaultExpanded(groupLabel: string): boolean {
  return !(groupLabel.includes("도슨트") || groupLabel.includes("헤리티지"));
}

export function LeftSidebar({
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
  // EPIC-058: 그룹별 펼침 상태 — 라벨 클릭(이동)과 완전히 분리된 Chevron
  // 전용 토글. 아직 명시적으로 토글한 적 없는 그룹은 defaultExpanded로
  // 폴백한다(그룹 목록은 DB에서 오므로 미리 전부 초기화하지 않는다).
  const [expandedOverrides, setExpandedOverrides] = useState<
    Record<string, boolean>
  >({});
  function isExpanded(groupLabel: string): boolean {
    return expandedOverrides[groupLabel] ?? defaultExpanded(groupLabel);
  }
  function toggleExpanded(groupLabel: string) {
    setExpandedOverrides((prev) => ({
      ...prev,
      [groupLabel]: !isExpanded(groupLabel),
    }));
  }

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
          aria-controls="left-sidebar-panel"
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
        id="left-sidebar-panel"
        aria-hidden={!open}
        inert={!open}
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
          {(tab.groups ?? []).map((group) => {
            const expanded = isExpanded(group.groupLabel);
            const hasItems = group.items.length > 0;
            return (
              <div key={group.groupLabel} className="mb-4">
                <div className="flex items-center rounded-md hover:bg-white/10">
                  {group.href ? (
                    <Link
                      href={group.href}
                      onClick={onClose}
                      className="flex-1 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                    >
                      {group.groupLabel}
                    </Link>
                  ) : (
                    <p className="flex-1 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60 cursor-default">
                      {group.groupLabel}
                    </p>
                  )}
                  {hasItems && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.groupLabel)}
                      aria-expanded={expanded}
                      aria-label={`${group.groupLabel} 하위 메뉴 ${expanded ? "접기" : "펼치기"}`}
                      className="px-2 py-1 text-white/60 hover:text-white"
                    >
                      {expanded ? "▼" : "▶"}
                    </button>
                  )}
                </div>
                {hasItems && expanded && (
                  <div>
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
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
