"use client";

// EPIC-105: 하단 Footer 관리 — 다른 페밀리(shop 등)와 동일하게 공용
// CraftPageEditor 셸에 이 페이지의 resolver/defaultTree/"+ 섹션 추가"
// 목록만 끼워 넣는다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftFooterResolver } from "@/components/craft/footer/resolver";
import { footerDefaultTree, footerBlockOptions } from "@/components/craft/footer/defaultTree";

export function CraftFooterEditor({
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
      title="하단 Footer"
      pageId={pageId}
      resolver={craftFooterResolver}
      defaultTree={footerDefaultTree}
      blockOptions={footerBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
