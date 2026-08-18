"use client";

// B5: 사용자 메뉴(계정 영역) — 관리자/등급/마이페이지/이름/로그아웃 5개
// 항목 전체에 공통으로 적용되는 단일 설정(계획 결정 1 — 항목별 개별
// 스타일은 기존 데이터 모델에도 없다, accountMenuStyleSettings.ts 참고).
import { useNode } from "@craftjs/core";
import {
  TAB_HOVER_MOTIONS,
  TAB_HOVER_MOTION_LABELS,
  DEFAULT_TAB_HOVER_MOTION,
} from "@/lib/tabHoverMotion";
import type { AccountMenuStyleConfig } from "@/lib/accountMenuStyleSettings";
import { ChromeAccountMenuView } from "../views";

export type ChromeAccountMenuBlockProps = {
  config: AccountMenuStyleConfig;
  onConfigChange: (patch: Partial<AccountMenuStyleConfig>) => void;
};

export function ChromeAccountMenuBlock({ config }: ChromeAccountMenuBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <ChromeAccountMenuView config={config} />
    </div>
  );
}

function ChromeAccountMenuSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ChromeAccountMenuBlockProps }));
  const { config, onConfigChange } = props;

  function patch(next: Partial<AccountMenuStyleConfig>) {
    setProp((draft) => {
      draft.config = { ...config, ...next };
    });
    onConfigChange(next);
  }

  return (
    <div className="space-y-3 text-xs">
      <p className="text-[11px] text-gray-400">관리자 / 회원 등급 / 마이페이지 / 회원 이름 / 로그아웃 5개 항목 전체에 함께 적용돼요.</p>
      <label className="block">
        <span className="mb-1 block text-gray-600">서체(fontFamily, 직접 입력)</span>
        <input
          value={config.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">글자 크기(px)</span>
        <input
          type="number"
          value={config.fontSizePx ?? ""}
          placeholder="기본값"
          onChange={(e) => patch({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">색상</span>
        <input
          type="color"
          value={config.color || "#4b5563"}
          onChange={(e) => patch({ color: e.target.value })}
          className="h-8 w-full rounded border border-gray-300"
        />
      </label>
      <label className="flex items-center gap-2 text-gray-600">
        <input type="checkbox" checked={config.bold} onChange={(e) => patch({ bold: e.target.checked })} />
        굵게
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">호버 모션</span>
        <select
          value={config.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION}
          onChange={(e) => patch({ hoverMotion: e.target.value as AccountMenuStyleConfig["hoverMotion"] })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        >
          {TAB_HOVER_MOTIONS.map((m) => (
            <option key={m} value={m}>
              {TAB_HOVER_MOTION_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

ChromeAccountMenuBlock.craft = {
  displayName: "사용자 메뉴",
  related: { settings: ChromeAccountMenuSettings },
};
