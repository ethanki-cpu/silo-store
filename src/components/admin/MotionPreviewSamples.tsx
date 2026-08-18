"use client";

// HOTFIX(사용자 지시 — "상단 메뉴탭과 또 맨 위의 '사용자 메뉴'의 모션에
// 대한 옵션을 프리뷰 할 수 있는 샘플을 보여줘"): 실제 사이트 iframe
// 미리보기는 작게 축소돼 있어 마우스를 정확히 올려 hover 모션을 비교해
// 보기가 번거롭다 — 6가지 프리셋을 한눈에 나란히 놓고 바로 마우스를
// 올려볼 수 있는 샘플 스와치. tabHoverMotion.ts의 실제 CSS 생성 함수를
// 그대로 재사용해 실제 사이트와 100% 동일한 모션을 보여준다.
import { useEffect } from "react";
import { TAB_HOVER_MOTIONS, TAB_HOVER_MOTION_LABELS, tabHoverMotionCss, type TabHoverMotion } from "@/lib/tabHoverMotion";

const PREVIEW_STYLE_ID = "silo-admin-motion-preview-style";

function ensurePreviewStyleTag() {
  if (typeof document === "undefined") return;
  if (document.getElementById(PREVIEW_STYLE_ID)) return;
  const css = TAB_HOVER_MOTIONS.filter((m) => m !== "none")
    .map((m) => tabHoverMotionCss(`silo-motion-preview-${m}`, m))
    .join("\n");
  const style = document.createElement("style");
  style.id = PREVIEW_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

export function MotionPreviewSamples({ selected }: { selected: TabHoverMotion }) {
  useEffect(() => {
    ensurePreviewStyleTag();
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs text-gray-500">마우스를 올려서 6가지 모션을 비교해 보세요 — 지금 선택된 것은 진하게 표시돼요.</p>
      <div className="flex flex-wrap gap-3">
        {TAB_HOVER_MOTIONS.filter((m) => m !== "none").map((m) => (
          <span
            key={m}
            className={`silo-motion-preview-${m} rounded border px-3 py-1.5 text-sm ${
              selected === m ? "border-gray-800 bg-white font-medium text-gray-900" : "border-gray-300 bg-white text-gray-600"
            }`}
          >
            {TAB_HOVER_MOTION_LABELS[m]}
          </span>
        ))}
      </div>
    </div>
  );
}
