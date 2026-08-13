"use client";

// EPIC-098: 홈페이지 Craft.js 블록들이 공유하는 "더블클릭으로 텍스트/이미지
// 수정" 원시 컴포넌트 — 사용자가 명시적으로 요청한 상호작용 범위(드래그로
// 새 블록 추가/자유 배치는 이번 스코프 밖, 이미 채워진 뼈대의 텍스트/이미지
// 만 바꾼다)에 맞춘 최소 구현이다. Craft.js의 노드 시스템(useNode)에는
// 묶이지 않는다 — 각 블록(EditorialHeroBlock 등)이 useNode()로 자기 props를
// 읽고 setProp으로 커밋하는 콜백을 여기 내려주기만 하면 되므로, 이 파일은
// "지금 에디터가 편집 가능 상태인가"만 useEditor로 확인한다.
import { useEditor } from "@craftjs/core";
import { useState, type ReactNode } from "react";
import { uploadFile } from "@/lib/storage";

export function useCraftEditable(): boolean {
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  return enabled;
}

export function EditableText({
  value,
  onCommit,
  as = "span",
  className,
  placeholder = "텍스트를 입력하세요",
}: {
  value: string;
  onCommit: (next: string) => void;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  className?: string;
  placeholder?: string;
}) {
  const editable = useCraftEditable();
  const [editing, setEditing] = useState(false);
  const Tag = as;

  if (!editable) {
    return <Tag className={className}>{value || placeholder}</Tag>;
  }

  return (
    <Tag
      className={`${className ?? ""} ${
        editing
          ? "outline outline-2 outline-blue-400 outline-offset-2"
          : "cursor-text outline-offset-2 hover:outline hover:outline-1 hover:outline-blue-300"
      }`}
      contentEditable={editing}
      suppressContentEditableWarning
      onDoubleClick={() => setEditing(true)}
      onBlur={(e) => {
        if (!editing) return;
        setEditing(false);
        const next = e.currentTarget.textContent ?? "";
        if (next !== value) onCommit(next);
      }}
    >
      {value || placeholder}
    </Tag>
  );
}

export function EditableImage({
  src,
  onCommit,
  alt = "",
  className,
  uploadFolder = "craft-home",
}: {
  src: string;
  onCommit: (nextUrl: string) => void;
  alt?: string;
  className?: string;
  uploadFolder?: string;
}) {
  const editable = useCraftEditable();
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadFile(file, "post-images", uploadFolder);
    setUploading(false);
    if (!error && url) onCommit(url);
  }

  if (!editable) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <label className={`group relative block cursor-pointer ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium uppercase tracking-wide text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
        {uploading ? "업로드 중..." : "이미지 변경"}
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

// 편집 모드일 때만 블록 전체에 얇은 점선 테두리를 둘러 "여기가 하나의
// 블록"임을 관리자에게 알려주는 래퍼 — 선택/드래그 UI는 없어도 최소한
// 블록 경계는 보여야 어디를 더블클릭해야 할지 가늠할 수 있다.
export function EditableBlockFrame({ children, label }: { children: ReactNode; label: string }) {
  const editable = useCraftEditable();
  if (!editable) return <>{children}</>;
  return (
    <div className="group/block relative">
      <span className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-gray-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white opacity-0 transition-opacity group-hover/block:opacity-100">
        {label}
      </span>
      <div className="outline-dashed outline-1 outline-gray-300 outline-offset-[-1px]">{children}</div>
    </div>
  );
}
