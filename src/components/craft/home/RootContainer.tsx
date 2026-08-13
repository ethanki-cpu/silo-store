"use client";

// EPIC-098: Frame의 최상위 canvas 노드가 될 자리표시 컨테이너 — 6개
// 에디토리얼 블록을 세로로 쌓는 것 말고는 아무 스타일도 갖지 않는다.
// resolver에 이름으로 등록되어야 해서(Craft.js가 직렬화된 노드를
// resolvedName으로 되찾을 때 필요) 별도 컴포넌트로 분리했다.
import { useNode } from "@craftjs/core";
import type { ReactNode } from "react";

export function RootContainer({ children }: { children?: ReactNode }) {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <div ref={(dom) => { if (dom) connect(dom); }} className="w-full bg-white">
      {children}
    </div>
  );
}

RootContainer.craft = {
  displayName: "RootContainer",
  props: {},
  rules: {
    canDrag: () => false,
  },
};
