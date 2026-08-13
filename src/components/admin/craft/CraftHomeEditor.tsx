"use client";

// EPIC-102: 홈페이지 전용 독자 구현이던 이 파일을 다른 5개 페밀리(shop 등)와
// 동일한 공용 셸(CraftPageEditor)로 마이그레이션 — Toolbox(원자 블록 드래그
// 추가)/SettingsSidebar(설정 패널)를 홈페이지 에디터도 그대로 받는다.
// 기존 "+ 섹션 추가" 목록(6종)은 homeBlockOptions로 옮겨 Toolbox의 "섹션"
// 그룹으로 계속 노출된다 — 동작 자체는 바뀌지 않고 진입점만 통일된다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftHomeResolver } from "@/components/craft/home/resolver";
import { homeDefaultTree, homeBlockOptions } from "@/components/craft/home/defaultTree";

export function CraftHomeEditor({
  pageId,
  initialState,
  onClose,
  onSaved,
}: {
  pageId: string;
  initialState?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <CraftPageEditor
      title="홈페이지"
      pageId={pageId}
      resolver={craftHomeResolver}
      defaultTree={homeDefaultTree}
      blockOptions={homeBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
