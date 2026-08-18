"use client";

// B4: 사이드바 여닫이 아이콘 — 좌/우 고정 2개 인스턴스만 존재한다(계획
// 결정 1). 추가/삭제 UI 자체가 없다 — side prop으로 어느 쪽인지만
// 구분하고, iconSizePx/triggerMode/topOffsetPx는 좌우가 공유하는 값이라
// 패널에서 바꾸면 SidebarIconsConfig 전체에 반영된다(기존 폼과 동일한
// 데이터 모델 — sidebarIconsSettings.ts 참고).
import { useState } from "react";
import { useNode } from "@craftjs/core";
import { uploadImage } from "@/lib/adminImageUpload";
import { DEFAULT_ICON_SIZE_PX, type SidebarIconsConfig } from "@/lib/sidebarIconsSettings";
import { ChromeSidebarIconView } from "../views";

export type ChromeSidebarIconBlockProps = {
  side: "left" | "right";
  config: SidebarIconsConfig;
  onConfigChange: (patch: Partial<SidebarIconsConfig>) => void;
};

export function ChromeSidebarIconBlock({ side, config }: ChromeSidebarIconBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <ChromeSidebarIconView side={side} config={config} />
    </div>
  );
}

function ChromeSidebarIconSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ChromeSidebarIconBlockProps }));
  const { side, config, onConfigChange } = props;
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  function patch(next: Partial<SidebarIconsConfig>) {
    setProp((draft) => {
      draft.config = { ...config, ...next };
    });
    onConfigChange(next);
  }

  const defaultField = side === "left" ? "leftIconDefaultUrl" : "rightIconDefaultUrl";
  const hoverField = side === "left" ? "leftIconHoverUrl" : "rightIconHoverUrl";

  async function handleFile(field: "leftIconDefaultUrl" | "leftIconHoverUrl" | "rightIconDefaultUrl" | "rightIconHoverUrl", file: File | null) {
    if (!file) return;
    setUploadingField(field);
    const { url } = await uploadImage(file, "sidebar_icons");
    setUploadingField(null);
    if (url) patch({ [field]: url } as Partial<SidebarIconsConfig>);
  }

  return (
    <div className="space-y-3 text-xs">
      <p className="text-[11px] text-gray-400">{side === "left" ? "좌측" : "우측"} 사이드바 여닫이 아이콘 — 이 자리는 항상 고정이라 추가/삭제할 수 없어요.</p>
      <label className="block">
        <span className="mb-1 block text-gray-600">기본 이미지/영상 {uploadingField === defaultField && "(업로드 중...)"}</span>
        <input
          type="file"
          accept="image/*,video/webm,video/mp4"
          onChange={(e) => handleFile(defaultField, e.target.files?.[0] ?? null)}
          disabled={uploadingField !== null}
          className="w-full text-[11px]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">호버 이미지/영상 {uploadingField === hoverField && "(업로드 중...)"}</span>
        <input
          type="file"
          accept="image/*,video/webm,video/mp4"
          onChange={(e) => handleFile(hoverField, e.target.files?.[0] ?? null)}
          disabled={uploadingField !== null}
          className="w-full text-[11px]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">아이콘 크기(px, 좌우 공통)</span>
        <input
          type="number"
          value={config.iconSizePx || DEFAULT_ICON_SIZE_PX}
          onChange={(e) => patch({ iconSizePx: Number(e.target.value) || DEFAULT_ICON_SIZE_PX })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">여닫이 방식(좌우 공통)</span>
        <select
          value={config.triggerMode}
          onChange={(e) => patch({ triggerMode: e.target.value as "click" | "hover" })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="click">클릭해야 열림</option>
          <option value="hover">마우스를 올리면 바로 열림</option>
        </select>
      </label>
    </div>
  );
}

ChromeSidebarIconBlock.craft = {
  displayName: "사이드바 아이콘",
  related: { settings: ChromeSidebarIconSettings },
};
