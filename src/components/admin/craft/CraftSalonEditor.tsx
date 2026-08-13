"use client";

// EPIC-099(항목 3, Phase 2): 살롱데상 관리자 에디터 — 공용 CraftPageEditor
// 셸에 이 페이지의 resolver/defaultTree/"+ 섹션 추가" 목록만 끼워 넣는다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftSalonResolver } from "@/components/craft/salon/resolver";
import { salonDefaultTree, salonBlockOptions } from "@/components/craft/salon/defaultTree";

export function CraftSalonEditor({
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
      title="살롱데상"
      pageId={pageId}
      resolver={craftSalonResolver}
      defaultTree={salonDefaultTree}
      blockOptions={salonBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
