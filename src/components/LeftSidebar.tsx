"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { NavTab } from "@/lib/navConfig";
import { SidebarTriggerMedia } from "@/components/SidebarTriggerMedia";
import { GatedNavLink } from "@/components/common/GatedNavLink";
import { SelectionOverlay } from "@/components/SelectionOverlay";
import type { HeaderSlotOffset } from "@/lib/headerLayoutPositions";
import { tabHoverMotionCss, type TabHoverMotion } from "@/lib/tabHoverMotion";

// HOTFIX-141: 패널(항목이 아니라 패널 자체) 스타일 — TopSidebarConfig와
// 동일한 4개 필드를 좌/우 각각 독립적으로 받는다(값은 sidebarIconsSettings.ts에
// leftPanel*/rightPanel*로 저장, Navbar.tsx가 side에 맞는 쪽만 골라 넘긴다).
export type SidebarPanelStyle = {
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  hoverMotion: TabHoverMotion;
};
const LEFT_SIDEBAR_LINK_CLASS = "silo-left-sidebar-link";

// EPIC-039: EPIC-037이 sidebar-left 탭을 다른 상위 탭과 동일한 작은 hover
// 드롭다운으로 통합했지만, 실사용 결과 화면 전체 높이의 슬라이드인 패널이
// 다시 필요하다는 피드백을 받아 복구한다.
//
// EPIC-043: 여닫이 아이콘은 클릭으로만 열렸다(hover로 열리지 않음).
//
// EPIC-063: 아이콘 hover로도 열리도록 변경(onMouseEnter 추가, onClick도
// 유지 — 터치 기기 대비) + "마우스가 패널을 벗어나면 닫힘"(hover-out
// close)을 완전히 제거한다. 이제 패널을 닫는 방법은 오직 바깥(backdrop)
// 클릭 · ✕ 버튼 · Escape 세 가지뿐이다 — Navbar.tsx의
// `{(leftOpen || rightOpen) && <div onClick={closeSidebars} .../>}`
// backdrop이 이미 "패널 바깥 아무 곳이나 클릭하면 닫힌다"를 구조적으로
// 구현하고 있으므로(패널은 그 위에 더 높은 z-index로 떠 있어 배경 클릭만
// backdrop에 도달) 별도의 document 클릭 리스너가 필요 없다.
//
// EPIC-058: 그룹 헤더가 <p>(클릭 불가)였던 것을, "클릭하면 Hub Page로
// 이동" + "Chevron 클릭으로 펼치기/접기"의 두 동작으로 분리한다. hover는
// 라벨 클릭(이동)과 한 DOM에 묶이면 동작이 섞여버려서 명시적 클릭
// 상태(useState)로 바꾼다 — 펼침 여부가 이동 여부와 완전히 독립적으로
// 동작해야 하기 때문.
//
// EPIC-063: 초기 펼침 여부를 그룹 라벨별로 다르게 뒀던 것(도슨트/헤리티지만
// 기본 접힘, 나머지는 기본 펼침)을 제거 — 모든 그룹이 예외 없이 기본
// 접힘으로 시작해야 한다는 요구사항이라 RightSidebar.tsx와 동일하게
// 단순화한다.

export function LeftSidebar({
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
  // HOTFIX-140.2(사용자 지시 — "왼쪽 오른쪽 사이드바도, 아이콘이 live
  // preview 에서 보이고... 클릭하면 사이드바가 열리고, 그 사이드바를
  // 설정할수 있게 해야해"): EPIC-136이 상단 헤더에 이미 적용한 것과 같은
  // 패턴 — 편집 캔버스 안에서는 position:fixed 대신 :absolute를 써서
  // 뷰포트가 아니라 Navbar의 relative 래퍼(<header>) 기준으로 자리잡게
  // 한다(그래야 캔버스 박스 밖으로 튀어오르지 않음). 패널 안 실제 링크
  // 클릭도 TopSidebarPanel과 동일하게 가로채 관리자 화면을 벗어나지
  // 않게 한다.
  editable?: boolean;
  selected?: boolean;
  // HOTFIX-141(사용자 지시 — "좌, 우측 사이드바 아이콘도 내가 드래그
  // 드랍으로 위치를 조정할수 있게 해줘"): HeaderSlot.tsx의 드래그
  // 메커니즘(pointer capture로 dx/dy translate)을 그대로 재사용하되,
  // 이 트리거 버튼 자신이 이미 absolute/fixed로 스스로를 배치하고
  // 있어(topOffsetPx 등) HeaderSlot으로 감싸면 그 wrapper가 새
  // containing block이 돼 기존 위치 기준이 깨진다 — 그래서 여기 직접
  // 같은 드래그 로직만 이식한다(감싸지 않고 버튼 자신에 pointer
  // 핸들러 + transform을 붙임).
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
  const dragStateRef = useRef<{ startX: number; startY: number; startDx: number; startDy: number } | null>(null);
  const draggedRef = useRef(false);
  // EPIC-058: 그룹별 펼침 상태 — 라벨 클릭(이동)과 완전히 분리된 Chevron
  // 전용 토글. 아직 명시적으로 토글한 적 없는 그룹은 defaultExpanded로
  // 폴백한다(그룹 목록은 DB에서 오므로 미리 전부 초기화하지 않는다).
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

  // HOTFIX-141(사용자 지시 — "사이드바 바깥의 영역을 클릭하면 사이드바가
  // 해제되도록 해줘"): 실제 사이트에선 Navbar.tsx의 전체화면 backdrop이
  // 바깥 클릭을 처리하지만, 편집 캔버스(editable)에서는 그 backdrop이
  // 의도적으로 꺼져 있다(전체 화면을 덮으면 왼쪽 Controls 패널까지
  // 가려버리므로 — HOTFIX-140.2 주석 참고). pointerdown은 패널의
  // onClickCapture(click 이벤트만 가로챔)와 다른 이벤트라 안전하게
  // 별도로 감지할 수 있다 — 패널/트리거 버튼 내부 클릭은 그대로 두고,
  // 그 바깥(Controls 패널 포함)을 클릭하면 닫는다.
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

  // HOTFIX-141: 훅은 조건부 return 이전에 호출해야 하므로(Rules of Hooks)
  // tab이 없는 경우도 대비해 여기서 만든다 — 아래 return null이 이후에 온다.
  const motionCss = useMemo(
    () => (panelStyle ? tabHoverMotionCss(LEFT_SIDEBAR_LINK_CLASS, panelStyle.hoverMotion) : ""),
    [panelStyle],
  );

  if (!tab) return null;

  // HOTFIX-141: dx/dy만큼 시각적으로 밀어주는 transform — 버튼 자신의
  // absolute/fixed 배치(top/left)는 그대로 두고 그 위에 얹는다. topOffsetPx가
  // 없으면 기존 세로 중앙 정렬(-translate-y-1/2)도 인라인 transform으로
  // 직접 합성해야 한다 — 인라인 style.transform은 같은 요소의 클래스
  // transform을 완전히 덮어써서, 드래그 offset만 인라인으로 주면 중앙
  // 정렬이 사라져버리기 때문.
  const dx = offset?.dxPx ?? 0;
  const dy = offset?.dyPx ?? 0;
  const centerTransform = topOffsetPx === undefined ? "translateY(-50%)" : "";
  const dragTransform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
  const combinedTransform = [centerTransform, dragTransform].filter(Boolean).join(" ") || undefined;
  function startDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!editable) return;
    onSelectSlot?.();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }
    draggedRef.current = false;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startDx: dx, startDy: dy };
  }
  function moveDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const nextDx = drag.startDx + (e.clientX - drag.startX);
    const nextDy = drag.startDy + (e.clientY - drag.startY);
    if (Math.abs(nextDx - drag.startDx) > 2 || Math.abs(nextDy - drag.startDy) > 2) draggedRef.current = true;
    onOffsetChange?.({ dxPx: nextDx, dyPx: nextDy, raised: true });
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
          aria-controls="left-sidebar-panel"
          className={`group ${editable ? "absolute cursor-move" : "fixed"} left-0 z-40 flex items-center justify-center rounded-r-md bg-transparent p-2 text-white ${
            topOffsetPx === undefined ? "top-1/2" : ""
          }`}
          style={{
            ...(topOffsetPx === undefined ? undefined : { top: topOffsetPx }),
            transform: combinedTransform,
          }}
        >
          {editable && <SelectionOverlay selected={selected} hovered={false} label="좌측 사이드바 아이콘" />}
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
            <span className="text-lg">🔑</span>
          )}
        </button>
      )}

      <div
        ref={panelRef}
        id="left-sidebar-panel"
        aria-hidden={!open}
        inert={!open}
        className={`${editable ? "absolute top-0" : "fixed inset-y-0"} left-0 z-50 w-64 overflow-hidden bg-green-800 text-white transform transition-transform duration-200 ${
          selected ? "ring-2 ring-blue-400 ring-inset" : ""
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          ...(editable ? { height: "80vh" } : undefined),
          backgroundColor: panelStyle?.backgroundColor || undefined,
          color: panelStyle?.textColor || undefined,
          fontFamily: panelStyle?.fontFamily || undefined,
        }}
        // HOTFIX-140.2: TopSidebarPanel.tsx와 동일한 이유 — 편집 모드에서
        // 패널 안 실제 링크를 클릭해도 관리자 화면을 벗어나지 않게 캡처
        // 단계에서 가로챈다. 닫기 버튼(data-panel-close)만 예외로 통과시켜
        // 실제로 닫히게 한다(그렇지 않으면 캡처가 타깃 도달 전에
        // stopPropagation해 닫기 버튼 자신의 onClick이 아예 안 불림).
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
                        className={`block px-3 py-2 rounded-md text-sm text-white ${LEFT_SIDEBAR_LINK_CLASS}`}
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
