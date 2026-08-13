"use client";

// EPIC-099(항목 3, Phase 2): 사일로 상점 관리자 에디터 — 공용 CraftPageEditor
// 셸에 이 페이지의 resolver/defaultTree/"+ 섹션 추가" 목록만 끼워 넣는다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftShopResolver } from "@/components/craft/shop/resolver";
import { shopDefaultTree, shopBlockOptions } from "@/components/craft/shop/defaultTree";

export function CraftShopEditor({
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
      title="사일로 상점"
      pageId={pageId}
      resolver={craftShopResolver}
      defaultTree={shopDefaultTree}
      blockOptions={shopBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
