"use client";

// B3: 메인 로고 — Craft 캔버스에서 클릭하면 우측 SettingsSidebar에 이
// 블록의 related.settings(ChromeLogoSettings)가 뜬다. Craft.js는 이
// 에디터 세션 동안 craft_state로 직렬화되지 않는다(계획 결정 2 — 저장은
// 여전히 site_settings, ChromeCraftEditor.tsx 참고) — 그래서 setProp은
// "이 노드를 화면에 즉시 반영"만 담당하고, 실제 영구 저장은 함께 호출하는
// onConfigChange(부모 admin 페이지의 기존 setMainLogo shim)가 담당한다.
import { useState } from "react";
import { useNode } from "@craftjs/core";
import { uploadImage } from "@/lib/adminImageUpload";
import { DEFAULT_LOGO_HEIGHT_PX, DEFAULT_LOGO_TEXT_COLOR, type MainLogoConfig } from "@/lib/mainLogoSettings";
import { ChromeLogoView } from "../views";
import { ChromeSelectionOverlay } from "../ChromeSelectionOverlay";

export type ChromeLogoBlockProps = {
  config: MainLogoConfig;
  onConfigChange: (patch: Partial<MainLogoConfig>) => void;
};

export function ChromeLogoBlock({ config }: ChromeLogoBlockProps) {
  const {
    connectors: { connect },
    selected,
    hovered,
  } = useNode((node) => ({ selected: node.events.selected, hovered: node.events.hovered }));
  return (
    <div ref={(dom) => { if (dom) connect(dom); }} className="relative">
      <ChromeLogoView config={config} />
      <ChromeSelectionOverlay selected={selected} hovered={hovered} label="메인 로고" />
    </div>
  );
}

function ChromeLogoSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ChromeLogoBlockProps }));
  const { config, onConfigChange } = props;
  const [uploading, setUploading] = useState(false);

  function patch(next: Partial<MainLogoConfig>) {
    setProp((draft) => {
      draft.config = { ...config, ...next };
    });
    onConfigChange(next);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    const { url } = await uploadImage(file, "main_logo");
    setUploading(false);
    if (url) patch({ type: "image", imageUrl: url });
  }

  return (
    <div className="space-y-3 text-xs">
      <label className="block">
        <span className="mb-1 block text-gray-600">유형</span>
        <select
          value={config.type}
          onChange={(e) => patch({ type: e.target.value as "text" | "image" })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="text">텍스트</option>
          <option value="image">이미지</option>
        </select>
      </label>
      {config.type === "text" ? (
        <label className="block">
          <span className="mb-1 block text-gray-600">텍스트</span>
          <input
            value={config.text}
            onChange={(e) => patch({ text: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block text-gray-600">이미지 {uploading && "(업로드 중...)"}</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="w-full text-[11px]"
          />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-gray-600">왼쪽 텍스트</span>
        <input
          value={config.leftText}
          onChange={(e) => patch({ leftText: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">오른쪽 텍스트</span>
        <input
          value={config.rightText}
          onChange={(e) => patch({ rightText: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">로고 이미지 높이(px)</span>
        <input
          type="number"
          value={config.heightPx}
          onChange={(e) => patch({ heightPx: Number(e.target.value) || DEFAULT_LOGO_HEIGHT_PX })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">텍스트 색상</span>
        <input
          type="color"
          value={config.textColor || DEFAULT_LOGO_TEXT_COLOR}
          onChange={(e) => patch({ textColor: e.target.value })}
          className="h-8 w-full rounded border border-gray-300"
        />
      </label>
      <label className="flex items-center gap-2 text-gray-600">
        <input type="checkbox" checked={config.bold} onChange={(e) => patch({ bold: e.target.checked })} />
        굵게
      </label>
    </div>
  );
}

ChromeLogoBlock.craft = {
  displayName: "메인 로고",
  related: { settings: ChromeLogoSettings },
};
