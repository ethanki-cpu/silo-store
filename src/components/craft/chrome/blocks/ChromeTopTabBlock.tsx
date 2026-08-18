"use client";

// B4: 상단 탭 — site_navigations의 최상위(depth 0) 행 수만큼 매번 트리를
// 새로 만들 때 자동 생성된다(계획 결정 1/5). 이 캔버스에는 탭 추가/삭제/
// 순서 변경 UI가 아예 없다 — 그건 계속 /admin/site-structure가 담당하고,
// 여기서는 이미 존재하는 탭 하나하나의 스타일(표시 텍스트/서체/색/hover
// 모션/1단·2단 배치)만 편집한다.
import { useNode } from "@craftjs/core";
import {
  TAB_HOVER_MOTIONS,
  TAB_HOVER_MOTION_LABELS,
  DEFAULT_TAB_HOVER_MOTION,
} from "@/lib/tabHoverMotion";
import type { TopTabStyleEntry } from "@/lib/topTabStyleSettings";
import { ChromeTopTabView } from "../views";
import { draggableTabProps } from "../ChromeTierZone";

export type ChromeTopTabBlockProps = {
  tabKey: string;
  defaultLabel: string;
  entry: TopTabStyleEntry;
  onEntryChange: (patch: Partial<TopTabStyleEntry>) => void;
};

export function ChromeTopTabBlock({ tabKey, defaultLabel, entry }: ChromeTopTabBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  // D1: 이 탭 칩 자체가 드래그 소스 — ChromeTierZone(1단/2단 드롭존)에
  // 놓으면 tier가 그 즉시 바뀐다. "cursor-move"로 드래그 가능함을
  // 시각적으로 알린다.
  return (
    <span
      ref={(dom) => { if (dom) connect(dom); }}
      className="inline-block cursor-move"
      {...draggableTabProps(tabKey)}
    >
      <ChromeTopTabView label={entry.labelOverride || defaultLabel} entry={entry} />
    </span>
  );
}

function ChromeTopTabSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ChromeTopTabBlockProps }));
  const { defaultLabel, entry, onEntryChange } = props;

  function patch(next: Partial<TopTabStyleEntry>) {
    setProp((draft) => {
      draft.entry = { ...entry, ...next };
    });
    onEntryChange(next);
  }

  return (
    <div className="space-y-3 text-xs">
      <label className="block">
        <span className="mb-1 block text-gray-600">표시 텍스트 (비우면 &quot;{defaultLabel}&quot;)</span>
        <input
          value={entry.labelOverride}
          onChange={(e) => patch({ labelOverride: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">배치</span>
        <select
          value={entry.tier ?? 2}
          onChange={(e) => patch({ tier: Number(e.target.value) === 1 ? 1 : 2 })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value={2}>2단(기본 탭 줄)</option>
          <option value={1}>1단(로고 줄과 겹침)</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">글자 크기(px)</span>
        <input
          type="number"
          value={entry.fontSizePx ?? ""}
          placeholder="기본값"
          onChange={(e) => patch({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">색상</span>
        <input
          type="color"
          value={entry.color || "#6b7280"}
          onChange={(e) => patch({ color: e.target.value })}
          className="h-8 w-full rounded border border-gray-300"
        />
      </label>
      <label className="flex items-center gap-2 text-gray-600">
        <input type="checkbox" checked={entry.bold} onChange={(e) => patch({ bold: e.target.checked })} />
        굵게
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">호버 모션</span>
        <select
          value={entry.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION}
          onChange={(e) => patch({ hoverMotion: e.target.value as TopTabStyleEntry["hoverMotion"] })}
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

ChromeTopTabBlock.craft = {
  displayName: "상단 탭",
  related: { settings: ChromeTopTabSettings },
};
