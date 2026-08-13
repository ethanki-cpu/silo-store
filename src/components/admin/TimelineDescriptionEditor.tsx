"use client";

// EPIC-097: TimelineWidgetEditor의 "Card Description" 필드용 미니 Tiptap
// 에디터 — src/components/editor/BlockEditor.tsx(게시글 본문용 풀 에디터)
// 에서 Bold/Italic/Underline/Strike/목록/링크만 남기고 표/태스크리스트/
// 이미지/갤러리/임베드 등 블록 확장은 전부 뺀 축소판. Block Editor와
// 마찬가지로 Tiptap JSON을 원본으로, HTML은 저장 시점에 한 번 파생해
// 같이 들고 다닌다(공개 렌더링이 에디터 없이 바로 dangerouslySetInnerHTML
// 할 수 있게 — AlternatingTimelineCanvas 참고).
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

function miniExtensions() {
  return [
    StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, link: false, underline: false }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 hover:underline" } }),
    Underline,
  ];
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active ? "bg-white text-gray-900" : "text-gray-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function TimelineDescriptionEditor({
  content,
  onChange,
  placeholder = "카드 설명을 입력하세요",
}: {
  content?: JSONContent;
  onChange: (json: JSONContent, html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...miniExtensions(), Placeholder.configure({ placeholder })],
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: "prose prose-sm prose-invert max-w-none min-h-[96px] px-3 py-2 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), sanitizeHtml(editor.getHTML()));
    },
  });

  // 아이템을 바꿔 끼울 때(다른 아코디언 항목을 열 때) 에디터 콘텐츠를
  // 새 content로 갈아끼운다 — key로 컴포넌트를 통째로 리마운트하는 대신
  // setContent를 쓰면 포커스/history가 불필요하게 초기화되지 않는다.
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(content ?? { type: "doc", content: [{ type: "paragraph" }] });
    if (current !== next) {
      editor.commands.setContent(content ?? { type: "doc", content: [{ type: "paragraph" }] }, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  function handleSetLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-gray-950">
      <div className="flex items-center gap-0.5 border-b border-white/10 bg-white/5 px-1.5 py-1">
        <ToolbarButton title="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton title="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton title="밑줄" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton title="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-white/10" aria-hidden />
        <ToolbarButton
          title="글머리 목록"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          ⋮≡
        </ToolbarButton>
        <ToolbarButton
          title="번호 목록"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.≡
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-white/10" aria-hidden />
        <ToolbarButton title="링크" active={editor.isActive("link")} onClick={handleSetLink}>
          🔗
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
