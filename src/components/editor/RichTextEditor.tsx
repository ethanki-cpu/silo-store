"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

// EPIC-052: "핵심 콘텐츠 작성 시스템" — Tiptap(ProseMirror) 기반 Block
// Editor. 특정 게시판 전용이 아니라 src/app/boards/[id]/write/page.tsx
// 하나(모든 Board Definition 게시판이 공유하는 글쓰기 폼)에서 쓰도록
// 설계해, 향후 게시판이 몇 개가 늘어도 이 컴포넌트 하나만 재사용하면
// 된다. 저장 형식은 HTML 문자열 — 별도 JSON 컬럼 없이 기존 posts.body
// (text)에 그대로 담기므로 스키마 변경이 필요 없다(기존 데이터 재사용).
function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`px-2 py-1 rounded text-sm border ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap gap-1.5 border border-gray-300 border-b-0 rounded-t-md bg-gray-50 p-2">
      <ToolbarButton
        label="굵게"
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="기울임"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        I
      </ToolbarButton>
      <ToolbarButton
        label="제목"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
      >
        H
      </ToolbarButton>
      <ToolbarButton
        label="글머리 목록"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        •
      </ToolbarButton>
      <ToolbarButton
        label="번호 목록"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        label="인용"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
      >
        &ldquo;
      </ToolbarButton>
      <ToolbarButton
        label="링크"
        onClick={() => {
          const url = window.prompt("링크 URL을 입력하세요");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().setLink({ href: url }).run();
        }}
        active={editor.isActive("link")}
      >
        🔗
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "내용을 입력하세요" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 글쓰기 폼이 다른 데이터(예: 게시판 전환)로 초기값을 바꿀 때만
  // 에디터 내용을 동기화 — 매 onChange마다 되돌리지 않도록 value와
  // 현재 에디터 HTML이 다를 때만 setContent한다.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} />
      <div className="border border-gray-300 rounded-b-md">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
