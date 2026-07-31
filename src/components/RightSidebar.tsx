"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NavTab } from "@/lib/navConfig";

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
// EPIC-078: 기본/호버 미디어 URL 확장자로 이미지 vs 비디오를 판별한다.
function isVideoUrl(url: string): boolean {
  return /\.(webm|mp4)(\?|$)/i.test(url);
}

// EPIC-078: 기본(Default) 미디어와 호버(Hover) 미디어를 같은 자리에 겹쳐
// 그리고 opacity로 크로스페이드한다 — 이미지/투명 비디오(webm/mp4) 모두
// 같은 방식으로 렌더링.
function SidebarTriggerMedia({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className: string;
}) {
  if (!url) return null;
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        className={className}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

export function RightSidebar({
  tab,
  open,
  onIconClick,
  onClose,
  iconDefaultUrl,
  iconHoverUrl,
  iconSizePx = 32,
  triggerMode = "click",
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
}) {
  // EPIC-054D(접근성 감사 §13): Escape로 닫기 + 닫힐 때 트리거 아이콘으로
  // 포커스 복귀 + 패널이 닫혀 있을 때 포커스/스크린리더 접근 차단(inert).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(open);
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

  if (!tab) return null;

  return (
    <>
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={onIconClick}
          onMouseEnter={triggerMode === "hover" ? onIconClick : undefined}
          aria-label={`${tab.label} 메뉴 열기`}
          aria-expanded={open}
          aria-controls="right-sidebar-panel"
          className="group fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center rounded-l-md bg-transparent p-2 text-white shadow-md"
        >
          {/* EPIC-078: 기본/호버 미디어를 같은 자리에 겹쳐 opacity로
              크로스페이드 — 인위적인 CSS 3D 회전 모션은 전부 제거하고
              미디어 자체(이미지 또는 투명 비디오)의 전환만으로 표현한다. */}
          {iconDefaultUrl || iconHoverUrl ? (
            <span
              className="relative block"
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
        id="right-sidebar-panel"
        aria-hidden={!open}
        inert={!open}
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
