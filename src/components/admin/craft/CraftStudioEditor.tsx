"use client";

// EPIC-099(항목 3, Phase 2): 스튜디오 관리자 에디터 — 공용 CraftPageEditor
// 셸에 이 페이지의 resolver/defaultTree/"+ 섹션 추가" 목록만 끼워 넣는다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftStudioResolver } from "@/components/craft/studio/resolver";
import { studioDefaultTree, studioBlockOptions } from "@/components/craft/studio/defaultTree";

export function CraftStudioEditor({
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
      title="스튜디오"
      pageId={pageId}
      resolver={craftStudioResolver}
      defaultTree={studioDefaultTree}
      blockOptions={studioBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
