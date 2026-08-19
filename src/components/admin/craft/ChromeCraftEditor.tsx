"use client";

// HOTFIX(사용자 지시 — "페이지가 출력되는 위치 그대로 나오는 상태에서
// 페이지 위의 요소들을 클릭 → 왼쪽 설정창... 왼쪽에 설정 윈도우, 오른쪽에
// 홈페이지 블록들"): 예전엔 캔버스(왼쪽)+설정 패널(오른쪽) 좁은 카드
// 하나였다 — 이제 실제 페이지 전체를 위에서 아래로(로고→사용자 메뉴→
// 상단 탭→슬라이드쇼→사이드바 아이콘 순서) 쌓아 보여주는 큰 캔버스를
// 오른쪽에, 선택된 블록의 설정을 왼쪽에 배치한다. PC/태블릿/모바일
// 폭 토글을 상단 툴바에 둔다(BuilderJS 레퍼런스와 동일한 위치).
import { Editor, Frame } from "@craftjs/core";
import type { ReactNode } from "react";
import { SettingsSidebar } from "@/components/craft/shared/SettingsSidebar";
import { chromeResolver } from "@/components/craft/chrome/resolver";

export type ChromeDeviceMode = "pc" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<ChromeDeviceMode, number | undefined> = {
  pc: undefined,
  tablet: 820,
  mobile: 390,
};

export function ChromeDeviceToggle({ value, onChange }: { value: ChromeDeviceMode; onChange: (v: ChromeDeviceMode) => void }) {
  const OPTIONS: { key: ChromeDeviceMode; label: string }[] = [
    { key: "pc", label: "🖥️ PC" },
    { key: "tablet", label: "📱 태블릿" },
    { key: "mobile", label: "📱 모바일" },
  ];
  return (
    <div className="flex items-center rounded-md border border-gray-300 bg-white p-0.5 text-xs">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded px-3 py-1 ${value === o.key ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChromeCraftEditor({
  tree,
  deviceMode = "pc",
  minHeight = 500,
}: {
  tree: ReactNode;
  deviceMode?: ChromeDeviceMode;
  /** 캔버스가 짧은 페이지에서도 스크롤 없이 넉넉해 보이도록 하는 최소 높이(px). */
  minHeight?: number;
}) {
  const deviceWidth = DEVICE_WIDTHS[deviceMode];
  return (
    <Editor resolver={chromeResolver} enabled>
      <div className="flex overflow-hidden rounded-lg border border-gray-200" style={{ minHeight }}>
        <SettingsSidebar />
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div
            className={deviceWidth ? "mx-auto border-x border-gray-300 bg-white shadow-lg" : "bg-white"}
            style={deviceWidth ? { width: deviceWidth } : undefined}
          >
            <Frame>{tree}</Frame>
          </div>
        </div>
      </div>
    </Editor>
  );
}
