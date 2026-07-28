"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { NavTab } from "@/lib/navConfig";

// EPIC-039: EPIC-037이 sidebar-left 탭을 다른 상위 탭과 동일한 작은 hover
// 드롭다운으로 통합했지만, 실사용 결과 화면 전체 높이의 슬라이드인 패널이
// 다시 필요하다는 피드백을 받아 복구한다.
//
// EPIC-043: 여닫이 아이콘은 클릭으로만 열린다(hover로 열리지 않음 — 아래
// 버튼에 onMouseEnter가 없는 이유). 패널이 열린 뒤 닫는 방법(바깥 클릭/✕/
// 패널에서 마우스가 완전히 벗어남)은 그대로 유지. "온라인 도슨트
// 라이브러리" 그룹만 기본 접힘 + hover로 펼쳐지는 아코디언으로 동작 —
// 다른 그룹은 항상 펼쳐진 채로 둔다. 순수 CSS `group`/`group-hover`로
// 구현(JS state 없음): 그룹 헤더와 펼쳐지는 목록이 같은 부모의 형제로,
// 플로팅 팝업이 아니라 문서 흐름 안에서 그대로 이어지므로 별도의
// "브릿지" 여백 없이도 hover가 끊기지 않는다.
// groupLabel은 관리자가 site_navigations에서 자유롭게 수정 가능한 문자열이라
// 정확히 일치시키면 라벨을 조금만 바꿔도(예: "온라인 도슨트 라이브러리" →
// "온라인 도슨트 Online Docent") 아코디언이 깨진다 — "도슨트"가 포함된
// 그룹이면 매칭되도록 완화해 이런 사소한 리네이밍에도 견고하게 했다.
//
// EPIC-044: "사일로 헤리티지" 그룹은 할머니/할아버지 이름 수십 개가 들어가
// 항상 펼쳐두면 사이드바가 지나치게 길어지므로, 같은 이유로 hover 아코디언
// 대상에 포함한다.
function isAccordionGroup(groupLabel: string): boolean {
  return groupLabel.includes("도슨트") || groupLabel.includes("헤리티지");
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
            const isAccordion = isAccordionGroup(group.groupLabel);
            return (
              <div
                key={group.groupLabel}
                className={`mb-4 ${isAccordion ? "group" : ""}`}
              >
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60 cursor-default">
                  {group.groupLabel}
                </p>
                <div className={isAccordion ? "hidden group-hover:block" : ""}>
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
            );
          })}
        </nav>
      </div>
    </>
  );
}
