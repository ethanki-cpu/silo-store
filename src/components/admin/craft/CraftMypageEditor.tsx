"use client";

// EPIC-099(항목 3, Phase 2): 마이 페이지 관리자 에디터 — 공용 CraftPageEditor
// 셸에 이 페이지의 resolver/defaultTree/"+ 섹션 추가" 목록만 끼워 넣는다.
import { CraftPageEditor } from "@/components/craft/shared/CraftPageEditor";
import { craftMypageResolver } from "@/components/craft/mypage/resolver";
import { mypageDefaultTree, mypageBlockOptions } from "@/components/craft/mypage/defaultTree";

export function CraftMypageEditor({
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
      title="마이 페이지"
      pageId={pageId}
      resolver={craftMypageResolver}
      defaultTree={mypageDefaultTree}
      blockOptions={mypageBlockOptions}
      initialState={initialState}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
