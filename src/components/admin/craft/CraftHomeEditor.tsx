"use client";

// EPIC-098: 홈페이지 Craft.js 에디터 — TimelineWidgetEditor.tsx와 동일한
// 전체화면 오버레이 UX 패턴. 상호작용 범위는 사용자가 명시한 대로 "완성된
// 뼈대 위에서 텍스트/이미지를 더블클릭으로 바꾸는" 것까지만(EditableText/
// EditableImage, src/components/craft/home/editable.tsx) — 드래그로 블록을
// 추가/재배치하는 Toolbox/Layers 패널은 이번 스코프 밖.
import { useState } from "react";
import { Editor, Frame, Element, useEditor } from "@craftjs/core";
import { supabase } from "@/lib/supabaseClient";
import { craftHomeResolver } from "@/components/craft/home/resolver";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { EditorialHeroBlock } from "@/components/craft/home/blocks/EditorialHeroBlock";
import { LatestIssueBlock } from "@/components/craft/home/blocks/LatestIssueBlock";
import { EditorialGridBlock } from "@/components/craft/home/blocks/EditorialGridBlock";
import { TextDirectoryBlock } from "@/components/craft/home/blocks/TextDirectoryBlock";
import { NewsletterBlock } from "@/components/craft/home/blocks/NewsletterBlock";
import { MinimalFooterBlock } from "@/components/craft/home/blocks/MinimalFooterBlock";
import { editorialSerif } from "@/components/craft/home/font";

function EditorToolbar({
  pageId,
  onClose,
  onSaved,
}: {
  pageId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { query } = useEditor();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const serialized = query.serialize();
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({ craft_state: serialized, updated_at: new Date().toISOString() })
      .eq("id", pageId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Craft 에디터 — 홈페이지</h2>
        <span className="hidden text-xs text-gray-400 sm:inline">
          텍스트/이미지를 더블클릭하면 바로 수정할 수 있어요
        </span>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          닫기
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <Editor resolver={craftHomeResolver} enabled>
        <EditorToolbar pageId={pageId} onClose={onClose} onSaved={onSaved} />
        <div className={`craft-home ${editorialSerif.variable} flex-1 overflow-y-auto`}>
          <Frame data={initialState ?? undefined}>
            {!initialState && (
              <Element is={RootContainer} canvas id="ROOT">
                <EditorialHeroBlock {...EditorialHeroBlock.craft.props} />
                <LatestIssueBlock {...LatestIssueBlock.craft.props} />
                <EditorialGridBlock {...EditorialGridBlock.craft.props} />
                <TextDirectoryBlock {...TextDirectoryBlock.craft.props} />
                <NewsletterBlock {...NewsletterBlock.craft.props} />
                <MinimalFooterBlock {...MinimalFooterBlock.craft.props} />
              </Element>
            )}
          </Frame>
        </div>
      </Editor>
    </div>
  );
}
