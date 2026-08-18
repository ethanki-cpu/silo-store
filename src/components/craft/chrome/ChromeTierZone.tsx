"use client";

// D1(사용자 지시 — "상단 탭의 1단과 2단을... 드래그앤드랍으로 각 버튼
// 위치를 정하는거, 그걸 원해"): 설정 패널 드롭다운으로 tier를 고르는
// 대신, 캔버스 위에 "1단"/"2단" 두 영역을 실제 드롭 존으로 두고 탭
// 칩을 그 사이로 직접 드래그해 옮길 수 있게 한다 — 순수 HTML5 드래그
// 앤 드롭(Craft.js 노드 트리 이동이 아니라 데이터 필드(tier) 변경이라
// Craft의 구조적 드래그 커넥터 대신 이 편이 더 간단하고 명확하다).
// 이 컴포넌트는 Craft 노드가 아니다 — 선택/설정 패널이 필요 없는 순수
// 레이아웃/드롭존 역할이라 useNode를 쓰지 않는다.
//
// HOTFIX-134(사용자 지시 — "1단과 2단을... 드래그앤드랍으로 각 버튼
// 위치를 정하는거, 그걸 원해"): D1은 어느 단(tier)인지만 드래그로
// 바꿀 수 있었다 — 같은 단 안에서 좌우 순서(칩을 특정 칩 앞에 끼워
// 넣기)는 못 바꿨다. 각 칩을 그 자체로도 드롭 타겟으로 만들어, 어떤
// 칩 위에 드롭하면 "그 칩 앞에 끼워 넣기"로 해석하고, 빈 배경에
// 드롭하면 "맨 끝에 추가"로 해석한다.
import { Children, type ReactElement, type ReactNode } from "react";

export function ChromeTierZone({
  label,
  hint,
  tier,
  onDropTab,
  children,
}: {
  label: string;
  hint: string;
  tier: 1 | 2;
  onDropTab: (tabKey: string, tier: 1 | 2, beforeTabKey: string | null) => void;
  children: ReactNode;
}) {
  const childArray = Children.toArray(children) as ReactElement<{ tabKey: string }>[];
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const tabKey = e.dataTransfer.getData("text/plain");
        if (tabKey) onDropTab(tabKey, tier, null);
      }}
      className="mb-3 min-h-[56px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/60 p-2 last:mb-0"
    >
      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label} <span className="font-normal normal-case text-gray-400">— {hint}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1 px-1">
        {childArray.map((child) => {
          const targetKey = child.props.tabKey;
          return (
            <div
              key={targetKey}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabKey = e.dataTransfer.getData("text/plain");
                if (tabKey && tabKey !== targetKey) onDropTab(tabKey, tier, targetKey);
              }}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 드래그 시작점 — ChromeTopTabBlock의 연결된 요소에 spread한다.
export function draggableTabProps(tabKey: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", tabKey);
      e.dataTransfer.effectAllowed = "move";
    },
  };
}
