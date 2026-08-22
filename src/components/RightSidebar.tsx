"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { NavTab } from "@/lib/navConfig";
import { SidebarTriggerMedia } from "@/components/SidebarTriggerMedia";
import { GatedNavLink } from "@/components/common/GatedNavLink";
import { SelectionOverlay } from "@/components/SelectionOverlay";
import type { HeaderSlotOffset } from "@/lib/headerLayoutPositions";
import { tabHoverMotionCss } from "@/lib/tabHoverMotion";
import { measureReferenceWidth, useReferenceWidth } from "@/lib/useReferenceWidth";
import type { SidebarPanelStyle } from "@/components/LeftSidebar";

const RIGHT_SIDEBAR_LINK_CLASS = "silo-right-sidebar-link";

// EPIC-039: LeftSidebar.tsx와 대칭 구조 — 자세한 배경은 그쪽 주석 참고.
//
// EPIC-043: 여닫이 아이콘은 클릭으로만 열렸다. RightSidebar는 LeftSidebar와
// 달리 그룹 전부(커뮤니티/멤버십/갤러리/아카이브 등)가 기본 접힘으로 시작한다.
//
// EPIC-058: 그룹 헤더가 <p>(클릭 불가)였던 것을 "클릭하면 Hub Page로 이동" +
// "Chevron 클릭으로 펼치기/접기"로 분리한다. 이전에는 hover로만 펼쳐지는 CSS
// 아코디언이었는데, hover는 라벨 클릭(이동)과 한 DOM에 묶이면 동작이
// 섞여버려서 명시적 클릭 상태(useState)로 바꾼다 — LeftSidebar.tsx와 동일한
// 패턴. 초기 펼침 여부(전부 기본 접힘)는 기존 동작 그대로 유지한다.
//
// EPIC-063: LeftSidebar.tsx와 동일하게 아이콘 hover로도 열리도록 변경하고,
// "마우스가 패널을 벗어나면 닫힘"(hover-out close)을 제거한다 — 자세한
// 배경은 LeftSidebar.tsx 주석 참고.
export function RightSidebar({
  tab,
  open,
  onIconClick,
  onClose,
  iconDefaultUrl,
  iconHoverUrl,
  iconSizePx = 32,
  triggerMode = "click",
  topOffsetPx,
  editable = false,
  selected = false,
  offset,
  onOffsetChange,
  onSelectSlot,
  panelStyle,
}: {
  tab?: NavTab;
  open: boolean;
  onIconClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  // EPIC-078: 평상시 노출되는 기본 미디어 — 이미지 또는 투명 비디오(webm/mp4).
  iconDefaultUrl?: string;
  // EPIC-078: 커서를 올렸을 때(group-hover) 크로스페이드로 드러나는 미디어.
  // 비어 있으면 기본 미디어로 폴백해 호버해도 아이콘이 사라지지 않는다.
  iconHoverUrl?: string;
  // EPIC-041: 관리자 설정 아이콘 크기(px) — 기본값은 기존 하드코딩이었던 32px(w-8 h-8).
  iconSizePx?: number;
  // EPIC-077: 여닫이 트리거 모드 — "click"이면 호버는 아르누보 애니메이션만
  // 재생하고 클릭해야 패널이 열린다. "hover"면 EPIC-063 이전 방식대로 호버
  // 즉시 열린다.
  triggerMode?: "click" | "hover";
  // EPIC-089: 뷰포트 상단에서부터의 px 거리 — 지정하지 않으면(구버전 호출부)
  // 기존 top-1/2(정중앙) 동작을 그대로 유지한다.
  topOffsetPx?: number;
  // HOTFIX-140.2: LeftSidebar.tsx와 동일한 이유/패턴 — 자세한 배경은 그쪽 주석 참고.
  editable?: boolean;
  selected?: boolean;
  // HOTFIX-141: LeftSidebar.tsx와 동일한 이유/패턴 — 자세한 배경은 그쪽 주석 참고.
  offset?: HeaderSlotOffset;
  onOffsetChange?: (next: HeaderSlotOffset) => void;
  onSelectSlot?: () => void;
  panelStyle?: SidebarPanelStyle;
}) {
  // EPIC-054D(접근성 감사 §13): Escape로 닫기 + 닫힐 때 트리거 아이콘으로
  // 포커스 복귀 + 패널이 닫혀 있을 때 포커스/스크린리더 접근 차단(inert).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(open);
  const dragStateRef = useRef<{ startX: number; startY: number; startDx: number; startDy: number; refWidthPx: number } | null>(null);
  const draggedRef = useRef(false);
  // EPIC-058: 그룹별 펼침 상태 — 라벨 클릭(이동)과 완전히 분리된 Chevron
  // 전용 토글. 기본은 전부 접힘(기존 hover 아코디언과 동일한 초기 상태).
  const [expandedOverrides, setExpandedOverrides] = useState<
    Record<string, boolean>
  >({});
  function isExpanded(groupLabel: string): boolean {
    return expandedOverrides[groupLabel] ?? false;
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

  // HOTFIX-141: LeftSidebar.tsx와 동일한 이유/패턴 — 자세한 배경은 그쪽 주석 참고.
  useEffect(() => {
    if (!open || !editable) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, editable, onClose]);

  // HOTFIX-141: 훅은 조건부 return 이전에(Rules of Hooks) — 아래 tab
  // 체크보다 먼저 호출한다.
  const motionCss = useMemo(
    () => (panelStyle ? tabHoverMotionCss(RIGHT_SIDEBAR_LINK_CLASS, panelStyle.hoverMotion) : ""),
    [panelStyle],
  );
  // HOTFIX-141.15: 같은 이유로 이 훅도 조건부 return 이전에 호출한다.
  const referenceWidth = useReferenceWidth();

  if (!tab) return null;

  // HOTFIX-141: LeftSidebar.tsx와 동일한 이유/패턴 — 자세한 배경은 그쪽 주석 참고.
  // HOTFIX-141.15(사용자 신고 — "좌우 폭을 줄이니까... 겹쳐지잖아"): 저장된
  // dxPx는 refWidthPx(드래그 당시 기준 폭) 기준 — 지금 기준 폭과 비율만큼
  // 스케일링해 적용한다.
  const rawDx = offset?.dxPx ?? 0;
  const dy = offset?.dyPx ?? 0;
  const scaleFactor = offset?.refWidthPx && offset.refWidthPx > 0 && referenceWidth > 0 ? referenceWidth / offset.refWidthPx : 1;
  const dx = rawDx * scaleFactor;
  const centerTransform = topOffsetPx === undefined ? "translateY(-50%)" : "";
  const dragTransform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
  const combinedTransform = [centerTransform, dragTransform].filter(Boolean).join(" ") || undefined;
  function startDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    // HOTFIX-141.13(사용자 지시 — "드래그로 움직이고, 수정이 끝나면
    // 고정되도록"): 잠겨있으면 클릭-선택은 여전히 되지만 드래그 시작
    // 자체를 막는다.
    if (!editable || offset?.locked) return;
    onSelectSlot?.();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }
    draggedRef.current = false;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startDx: dx, startDy: dy, refWidthPx: measureReferenceWidth() };
  }
  function moveDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const nextDx = drag.startDx + (e.clientX - drag.startX);
    const nextDy = drag.startDy + (e.clientY - drag.startY);
    if (Math.abs(nextDx - drag.startDx) > 2 || Math.abs(nextDy - drag.startDy) > 2) draggedRef.current = true;
    onOffsetChange?.({ dxPx: nextDx, dyPx: nextDy, raised: true, refWidthPx: drag.refWidthPx });
  }
  function endDrag() {
    dragStateRef.current = null;
  }
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
      return;
    }
    onIconClick(e);
  }

  return (
    <>
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleClick}
          onMouseEnter={triggerMode === "hover" ? onIconClick : undefined}
          onPointerDown={editable ? startDrag : undefined}
          onPointerMove={editable ? moveDrag : undefined}
          onPointerUp={editable ? endDrag : undefined}
          onPointerLeave={editable ? endDrag : undefined}
          aria-label={`${tab.label} 메뉴 열기`}
          aria-expanded={open}
          aria-controls="right-sidebar-panel"
          className={`group ${editable ? "absolute cursor-move" : "fixed"} right-0 z-40 flex items-center justify-center rounded-l-md bg-transparent p-2 text-white ${
            topOffsetPx === undefined ? "top-1/2" : ""
          }`}
          style={{
            ...(topOffsetPx === undefined ? undefined : { top: topOffsetPx }),
            transform: combinedTransform,
          }}
        >
          {editable && <SelectionOverlay selected={selected} hovered={false} label="우측 사이드바 아이콘" />}
          {/* EPIC-078: 기본/호버 미디어를 같은 자리에 겹쳐 opacity로
              크로스페이드 — 미디어 자체(이미지 또는 투명 비디오)의 전환으로
              표현한다. 커서를 올리면 아이콘 전체가 20% 확대된다
              (group-hover:scale-[1.2]). */}
          {iconDefaultUrl || iconHoverUrl ? (
            <span
              className="relative block transition-transform duration-300 group-hover:scale-[1.2]"
              style={{ width: iconSizePx, height: iconSizePx }}
            >
              <SidebarTriggerMedia
                url={iconDefaultUrl ?? ""}
                alt={tab.label}
                className="absolute inset-0 h-full w-full object-contain opacity-100 transition-opacity duration-300 group-hover:opacity-0"
              />
              <SidebarTriggerMedia
                url={iconHoverUrl || iconDefaultUrl || ""}
                alt={tab.label}
                className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </span>
          ) : (
            <span className="text-lg">🚪</span>
          )}
        </button>
      )}

      <div
        ref={panelRef}
        id="right-sidebar-panel"
        aria-hidden={!open}
        inert={!open}
        className={`${editable ? "absolute top-0" : "fixed inset-y-0"} right-0 z-50 w-64 overflow-hidden bg-green-800 text-white transform transition-transform duration-200 ${
          selected ? "ring-2 ring-blue-400 ring-inset" : ""
        } ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{
          ...(editable ? { height: "80vh" } : undefined),
          backgroundColor: panelStyle?.backgroundColor || undefined,
          color: panelStyle?.textColor || undefined,
          fontFamily: panelStyle?.fontFamily || undefined,
        }}
        // HOTFIX-140.2: LeftSidebar.tsx와 동일한 이유 — 자세한 배경은 그쪽 주석 참고.
        onClickCapture={
          editable
            ? (e) => {
                if ((e.target as HTMLElement).closest("[data-panel-close]")) return;
                e.preventDefault();
                e.stopPropagation();
              }
            : undefined
        }
      >
        {motionCss && <style>{motionCss}</style>}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          {tab.href ? (
            <GatedNavLink
              href={tab.href}
              minRankToRead={tab.minRankToRead}
              onClick={onClose}
              className="font-semibold hover:underline"
            >
              {tab.label}
            </GatedNavLink>
          ) : (
            <span className="font-semibold">{tab.label}</span>
          )}
          <button
            type="button"
            data-panel-close
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
                    <GatedNavLink
                      href={group.href}
                      minRankToRead={group.minRankToRead}
                      onClick={onClose}
                      className="flex-1 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                    >
                      {group.groupLabel}
                    </GatedNavLink>
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
                      <GatedNavLink
                        key={`${item.href}-${idx}`}
                        href={item.href}
                        minRankToRead={item.minRankToRead}
                        onClick={onClose}
                        className={`block px-3 py-2 rounded-md text-sm text-white ${RIGHT_SIDEBAR_LINK_CLASS}`}
                      >
                        {item.label}
                      </GatedNavLink>
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
