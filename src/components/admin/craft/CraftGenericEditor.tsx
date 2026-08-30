"use client";

// HOTFIX-152.18(사용자 지시 — "페이지가 만들어질때 craft 에디터를
// default로 깔아"): 어떤 slug에도(CRAFT_EDITORS 화이트리스트에 없어도)
// 쓸 수 있는 범용 Craft 관리자 에디터 — CraftDocentEditor.tsx와 동일한
// 패턴이지만 페이지 전용 블록 없이 genericResolver/genericDefaultTree만
// 쓴다. 새로 만든 카테고리 페이지는 전부 이 에디터로 시작하고, 나중에
// 특정 섹션 전용 블록이 필요해지면(예: 이번 세션의 SiloTimelineEmbedBlock
// 마이그레이션처럼) 그때 전용 에디터를 만들어 CRAFT_EDITORS/CRAFT_RENDERERS
// 화이트리스트에 등록하면 된다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftGenericResolver } from "@/components/craft/generic/resolver";
import { genericDefaultTree, genericBlockOptions } from "@/components/craft/generic/defaultTree";

export function CraftGenericEditor({
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
      title="페이지"
      pageId={pageId}
      resolver={craftGenericResolver}
      defaultTree={genericDefaultTree}
      blockOptions={genericBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
