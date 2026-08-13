"use client";

// EPIC-099(항목 3, Phase 2): 온라인 도슨트 관리자 에디터 — 공용 CraftPageEditor
// 셸에 이 페이지의 resolver/defaultTree/"+ 섹션 추가" 목록만 끼워 넣는다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftDocentResolver } from "@/components/craft/docent/resolver";
import { docentDefaultTree, docentBlockOptions } from "@/components/craft/docent/defaultTree";

export function CraftDocentEditor({
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
      title="온라인 도슨트"
      pageId={pageId}
      resolver={craftDocentResolver}
      defaultTree={docentDefaultTree}
      blockOptions={docentBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
