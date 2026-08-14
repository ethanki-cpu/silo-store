"use client";

// EPIC-102: 이 코드베이스에 Craft.js의 `related` 설정 패널 패턴을 처음
// 도입하는 컴포넌트 — 현재 선택된 노드를 읽어, 그 노드의 `craft.related.settings`
// 컴포넌트를 우측 사이드바에 렌더링한다. 기존 6종 섹션 블록처럼 `related`가
// 없는 블록을 선택하면 "더블클릭으로 편집" 안내만 보여준다(하위 호환 —
// 기존 블록을 굳이 설정 패널을 갖도록 바꾸지 않아도 계속 동작).
import { useEditor } from "@craftjs/core";
import type { ComponentType } from "react";

export function SettingsSidebar() {
  const { selected } = useEditor((state) => {
    const currentNodeId = [...state.events.selected][0];
    if (!currentNodeId || !state.nodes[currentNodeId]) return { selected: null };
    const node = state.nodes[currentNodeId];
    return {
      selected: {
        id: currentNodeId,
        name: node.data.displayName || node.data.name,
        // 이 레포에 등록된 모든 블록의 `related.settings` 컴포넌트 타입을
        // 전부 합쳐 추론하면(각기 다른 시그니처가 계속 늘어나며) TS가 그
        // 교집합을 `never`로 좁혀버려 `<selected.Settings />`가 타입
        // 에러(next build만 실패, dev/tsc 캐시 상태에 따라 통과하기도 함)를
        // 내는 걸 실제로 겪었다 — "props 없는 컴포넌트"로 명시적으로
        // 캐스팅해 이 추론 붕괴를 피한다.
        Settings: (node.related?.settings as ComponentType<Record<string, never>> | undefined) ?? null,
        isRoot: currentNodeId === "ROOT",
      },
    };
  });

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
      {!selected ? (
        <p className="text-xs text-gray-400">캔버스에서 블록을 클릭하면 설정이 여기 표시됩니다.</p>
      ) : (
        <>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {selected.name} 설정
          </h3>
          {selected.Settings ? (
            <selected.Settings />
          ) : (
            <p className="text-xs text-gray-400">
              {selected.isRoot
                ? "루트 캔버스에는 설정이 없어요."
                : "이 블록은 별도 설정이 없어요 — 더블클릭으로 텍스트/이미지를 바로 수정하세요."}
            </p>
          )}
        </>
      )}
    </aside>
  );
}
