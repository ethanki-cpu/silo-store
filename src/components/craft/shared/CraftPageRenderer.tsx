"use client";

// EPIC-099(항목 3, Phase 2): 홈페이지 전용이던 CraftHomeRenderer.tsx의
// 일반화 버전 — resolver/defaultTree를 파라미터로 받아 어떤 Craft 페이지든
// 재사용한다. CraftHomeRenderer.tsx 자체는 이미 검증·병합된 코드라 건드리지
// 않고 그대로 둔다(회귀 위험 최소화) — 새 페이지(사일로 상점 등)부터 이
// 공용 셸을 쓴다.
import { Editor, Frame, type Resolver } from "@craftjs/core";
import type { ReactNode } from "react";
import { editorialSerif } from "@/components/craft/home/font";

// EPIC-100(항목 1·3): 블록 내부의 그리드/스플릿 레이아웃은 뷰포트 기준
// `md:`가 아니라 컨테이너 쿼리(`@[768px]:` 등, Tailwind v4 내장 기능)로
// 반응한다 — 이유는 관리자 에디터(CraftPageEditor)의 PC/모바일 토글이
// 실제 브라우저 창 너비를 바꾸지 않고 이 캔버스의 너비만 좁히기 때문에,
// 뷰포트 미디어쿼리로는 그 토글이 레이아웃에 아무 영향을 못 준다(진짜
// WYSIWYG가 안 됨). `@container`를 이 최상위 래퍼에 걸어두면 모든 자식
// 블록의 컨테이너 쿼리가 이 래퍼의 실제 렌더링 너비를 기준으로 계산되므로,
// 공개 페이지(래퍼 너비 ≈ 뷰포트 너비)에서는 기존 `md:`와 사실상 동일하게
// 동작하면서 관리자 토글에서도 즉시 반영된다.
export function CraftPageRenderer({
  resolver,
  craftState,
  defaultTree,
}: {
  resolver: Resolver;
  craftState?: string | null;
  defaultTree: ReactNode;
}) {
  return (
    <div className={`craft-home @container ${editorialSerif.variable}`}>
      <Editor resolver={resolver} enabled={false}>
        <Frame data={craftState ?? undefined}>{!craftState && defaultTree}</Frame>
      </Editor>
    </div>
  );
}
