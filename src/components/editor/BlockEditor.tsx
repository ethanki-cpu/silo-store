"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { Image } from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useCallback, useRef, useState } from "react";
import { uploadPostImage } from "@/lib/storage";

// EPIC-053: Block Editor 확장 — Tiptap 기반 Notion 스타일 Block Editor.
// EPIC-052의 기본 RichTextEditor에서 다음을 확장:
// - 더 많은 Block 타입 (heading1-3, divider, taskList)
// - Toolbar 확장 (밑줄, 취소선, 텍스트 색상, 배경색, 정렬)
// - 이미지 업로드 (Drag & Drop, 붙여넣기, 여러장 업로드)
// - 자동 저장 (Auto Save)
// - 임시 저장 (Draft)
// - Block 단위 조작 UI

// ============================================================
// Toolbar Button Component
// ============================================================

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  className = "",
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`
        p-1.5 rounded text-sm transition-colors
        ${active
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// ============================================================
// Toolbar Component
// ============================================================

type ToolbarProps = {
  editor: Editor;
  onImageUpload?: (files: File[]) => Promise<void>;
  onAutoSave?: () => void;
  isSaving?: boolean;
};

function Toolbar({ editor, onImageUpload, onAutoSave, isSaving }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0 && onImageUpload) {
        await onImageUpload(files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onImageUpload],
  );

  return (
    <div className="flex flex-wrap gap-1 border border-gray-300 border-b-0 rounded-t-md bg-gray-50 p-2 items-center">
      {/* 텍스트 스타일 */}
      <div className="flex gap-0.5">
        <ToolbarButton
          title="굵게 (B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          title="기울임 (I)"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          title="밑줄 (U)"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          title="취소선"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
        >
          <span className="line-through">S</span>
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 제목 */}
      <div className="flex gap-0.5">
        <ToolbarButton
          title="제목 1 (H1)"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="제목 2 (H2)"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="제목 3 (H3)"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 목록 */}
      <div className="flex gap-0.5">
        <ToolbarButton
          title="글머리 목록"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          •_LIST
        </ToolbarButton>
        <ToolbarButton
          title="번호 목록"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1_LIST
        </ToolbarButton>
        <ToolbarButton
          title="체크리스트"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive("taskList")}
        >
          ☑
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 인용/구분선 */}
      <div className="flex gap-0.5">
        <ToolbarButton
          title="인용문"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          &ldquo;
        </ToolbarButton>
        <ToolbarButton
          title="구분선"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          —
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 정렬 */}
      <div className="flex gap-0.5">
        <ToolbarButton
          title="왼쪽 정렬"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
        >
          ≡L
        </ToolbarButton>
        <ToolbarButton
          title="중앙 정렬"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
        >
          ≡C
        </ToolbarButton>
        <ToolbarButton
          title="오른쪽 정렬"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
        >
          ≡R
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* 링크 */}
      <ToolbarButton
        title="링크"
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

      {/* 이미지 업로드 */}
      <ToolbarButton
        title="이미지 업로드"
        onClick={() => fileInputRef.current?.click()}
      >
        🖼
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex-1" />

      {/* 저장 상태 */}
      {isSaving && (
        <span className="text-xs text-gray-400">저장 중...</span>
      )}
      {!isSaving && onAutoSave && (
        <button
          type="button"
          onClick={onAutoSave}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          임시저장
        </button>
      )}
    </div>
  );
}


// ============================================================
// Block Editor Props
// ============================================================

export type BlockEditorProps = {
  /** 현재 에디터 내용 (HTML) */
  value: string;
  /** 내용 변경 시 호출 */
  onChange: (html: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 자동 저장 콜백 (debounced) */
  onAutoSave?: (html: string) => void;
  /** 자동 저장 간격 (ms, 기본 30000 = 30초) */
  autoSaveInterval?: number;
  /** 추가 CSS 클래스 */
  className?: string;
};

// ============================================================
// Block Editor Component
// ============================================================

export function BlockEditor({
  value,
  onChange,
  placeholder,
  onAutoSave,
  autoSaveInterval = 30000,
  className = "",
}: BlockEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        blockquote: {},
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 hover:underline",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "내용을 입력하세요...",
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
      Color,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full rounded-md my-4",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
      },
      handleDrop: (view, event, _slice, moved) => {
        // 이미지 파일 드롭 처리
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (files.length > 0) {
            handleImageFiles(files);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        // 클립보드 이미지 붙여넣기 처리
        const clipboardData = event.clipboardData;
        if (clipboardData?.files.length) {
          const files = Array.from(clipboardData.files).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (files.length > 0) {
            handleImageFiles(files);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 에디터 인스턴스 저장
  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  // 자동 저장 타이머
  useEffect(() => {
    if (!onAutoSave || !editor) return;

    const intervalId = setInterval(() => {
      const html = editor.getHTML();
      if (html !== "<p></p>" && html.length > 0) {
        setIsSaving(true);
        onAutoSave(html);
        setTimeout(() => {
          setIsSaving(false);
          setLastSaved(new Date());
        }, 500);
      }
    }, autoSaveInterval);

    return () => clearInterval(intervalId);
  }, [editor, onAutoSave, autoSaveInterval]);

  // 내용 동기화 (외부에서 value가变了 경우)
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  // 이미지 파일 처리 (업로드 + 에디터에 삽입)
  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (!editor) return;

      for (const file of files) {
        try {
          const result = await uploadPostImage(file, "editor");
          if (result.error) {
            console.error("이미지 업로드 실패:", result.error);
            continue;
          }
          editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
        } catch (err) {
          console.error("이미지 업로드 오류:", err);
        }
      }
    },
    [editor],
  );

  // 외부 이미지 업로드 콜백
  const handleImageUpload = useCallback(
    async (files: File[]) => {
      await handleImageFiles(files);
    },
    [handleImageFiles],
  );

  // 임시 저장 수동 트리거
  const handleManualSave = useCallback(() => {
    if (!editor || !onAutoSave) return;
    const html = editor.getHTML();
    setIsSaving(true);
    onAutoSave(html);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 500);
  }, [editor, onAutoSave]);

  // 드래그 앤 드롭 상태 관리
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length > 0) {
        handleImageFiles(files);
      }
    },
    [handleImageFiles],
  );

  if (!editor) return null;

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${className}`}>
      <Toolbar
        editor={editor}
        onImageUpload={handleImageUpload}
        onAutoSave={handleManualSave}
        isSaving={isSaving}
      />

      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative ${isDragging ? "bg-blue-50" : ""}`}
      >
        {/* 드래그 오버레이 */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-b-md">
            <p className="text-blue-600 font-medium">이미지를 여기에 놓으세요</p>
          </div>
        )}

        <EditorContent editor={editor} />

        {/* 마지막 저장 시간 표시 */}
        {lastSaved && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            마지막 저장: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 레거시 호환성: 기존 RichTextEditor는 BlockEditor로 대체
// ============================================================

/** @deprecated EPIC-053: RichTextEditor → BlockEditor로 대체 */
export const RichTextEditor = BlockEditor;
