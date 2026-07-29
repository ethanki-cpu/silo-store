"use client";

import { useEditor, EditorContent, type Editor, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { uploadPostImage, uploadMultipleFiles, STORAGE_BUCKETS } from "@/lib/storage";
import {
  coreExtensions,
  FigureImage,
  GalleryBlock,
  EmbedBlock,
  LinkCardBlock,
  type JSONContent,
  type EmbedProvider,
  type GalleryImageAttrs,
  emptyDoc,
} from "@/lib/blockEditorCore";
import { Lightbox, type LightboxImage } from "./Lightbox";

// EPIC-053.1: Block Editor 확장.
// - 정본 저장 형식을 HTML에서 Tiptap JSON(ProseMirror doc)으로 전환 —
//   onChange가 이제 (json, html) 둘 다 넘겨준다. HTML은 미리보기/레거시
//   호환용 파생값일 뿐, 실제로 저장해야 하는 값은 json이다.
// - 이미지 Block을 캡션/ALT/대표이미지 지정/삭제/순서변경(드래그+버튼)
//   가능한 NodeView로 승격.
// - Gallery/Embed(Youtube/Vimeo/Instagram/Spotify/Maps)/LinkCard 블록 삽입.
// - Preview 모드(실제 게시글과 동일한 sanitize된 HTML을 그대로 렌더링).

// ============================================================
// Toolbar Button
// ============================================================

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded text-sm transition-colors ${
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

// ============================================================
// FigureImage NodeView — 캡션/ALT/삭제/순서변경/대표이미지 지정.
// ============================================================

function FigureImageView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const { src, alt, caption, featured } = node.attrs as {
    src: string;
    alt: string;
    caption: string;
    featured: boolean;
  };
  const [openLightbox, setOpenLightbox] = useState(false);

  function move(direction: -1 | 1) {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos == null) return;
    const { state, view } = editor;
    const targetPos = direction === -1 ? pos - 1 : pos + node.nodeSize + 1;
    const $target = state.doc.resolve(Math.max(0, Math.min(targetPos, state.doc.content.size)));
    const targetNode = direction === -1 ? state.doc.nodeAt($target.pos - 1) : state.doc.nodeAt($target.pos);
    if (!targetNode) return;
    const tr = state.tr;
    const from = pos;
    const to = pos + node.nodeSize;
    const slice = state.doc.slice(from, to);
    tr.delete(from, to);
    const insertAt = direction === -1 ? from - targetNode.nodeSize : from + targetNode.nodeSize - node.nodeSize;
    tr.insert(Math.max(0, insertAt), slice.content);
    view.dispatch(tr);
  }

  function setAsFeatured() {
    const { state, view } = editor;
    const tr = state.tr;
    state.doc.descendants((n, pos) => {
      if (n.type.name === "figureImage" && n.attrs.featured) {
        tr.setNodeAttribute(pos, "featured", false);
      }
    });
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos != null) tr.setNodeAttribute(pos, "featured", true);
    view.dispatch(tr);
  }

  return (
    <NodeViewWrapper className="figure-image-node my-4" data-drag-handle>
      <figure className="group relative inline-block max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onClick={() => setOpenLightbox(true)}
          className={`max-w-full rounded-md cursor-zoom-in ${featured ? "ring-2 ring-amber-400" : ""}`}
        />
        {featured && (
          <span className="absolute top-2 left-2 bg-amber-400 text-white text-xs px-2 py-0.5 rounded">
            대표 이미지
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" title="위로" className="bg-white/90 rounded px-1.5 text-xs" onClick={() => move(-1)}>
            ↑
          </button>
          <button type="button" title="아래로" className="bg-white/90 rounded px-1.5 text-xs" onClick={() => move(1)}>
            ↓
          </button>
          <button
            type="button"
            title="대표 이미지로 지정"
            className="bg-white/90 rounded px-1.5 text-xs"
            onClick={setAsFeatured}
          >
            ★
          </button>
          <button
            type="button"
            title="삭제"
            className="bg-white/90 rounded px-1.5 text-xs text-red-600"
            onClick={() => deleteNode()}
          >
            ✕
          </button>
        </div>
        <figcaption className="mt-1">
          <input
            type="text"
            value={caption}
            placeholder="캡션 (선택)"
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            className="text-sm text-gray-500 text-center w-full border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none bg-transparent"
          />
          <input
            type="text"
            value={alt}
            placeholder="ALT 텍스트 (접근성)"
            onChange={(e) => updateAttributes({ alt: e.target.value })}
            className="text-xs text-gray-400 text-center w-full border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none bg-transparent mt-0.5"
          />
        </figcaption>
      </figure>
      {openLightbox && (
        <Lightbox images={[{ src, alt, caption }]} onClose={() => setOpenLightbox(false)} />
      )}
    </NodeViewWrapper>
  );
}

// ============================================================
// Gallery NodeView
// ============================================================

function GalleryView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const images = (node.attrs.images as GalleryImageAttrs[]) ?? [];
  const columns = (node.attrs.columns as number) ?? 3;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setImages(next: GalleryImageAttrs[]) {
    updateAttributes({ images: next });
  }

  function removeAt(i: number) {
    setImages(images.filter((_, idx) => idx !== i));
  }

  function moveAt(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  }

  async function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const uploaded = await uploadMultipleFiles(Array.from(files), STORAGE_BUCKETS.GALLERY, "gallery");
    const added: GalleryImageAttrs[] = uploaded
      .filter((r) => !r.error)
      .map((r) => ({ src: r.url, path: r.path, alt: "", caption: "" }));
    setImages([...images, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const lightboxImages: LightboxImage[] = images.map((img) => ({ src: img.src, alt: img.alt, caption: img.caption }));

  return (
    <NodeViewWrapper className="gallery-node my-4" data-drag-handle>
      <div className="border border-dashed border-gray-300 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">갤러리 ({images.length}장)</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">
              열
              <select
                value={columns}
                onChange={(e) => updateAttributes({ columns: Number(e.target.value) })}
                className="ml-1 border border-gray-200 rounded text-xs"
              >
                {[2, 3, 4].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => fileInputRef.current?.click()}
            >
              + 이미지 추가
            </button>
            <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => deleteNode()}>
              갤러리 삭제
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleAddFiles(e.target.files)}
        />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {images.map((img, i) => (
            <div key={img.path ?? img.src} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                onClick={() => setLightboxIndex(i)}
                className="w-full aspect-square object-cover rounded cursor-zoom-in"
              />
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100">
                <button type="button" className="bg-white/90 rounded px-1 text-[10px]" onClick={() => moveAt(i, -1)}>
                  ←
                </button>
                <button type="button" className="bg-white/90 rounded px-1 text-[10px]" onClick={() => moveAt(i, 1)}>
                  →
                </button>
                <button
                  type="button"
                  className="bg-white/90 rounded px-1 text-[10px] text-red-600"
                  onClick={() => removeAt(i)}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={img.caption}
                placeholder="캡션"
                onChange={(e) => {
                  const next = [...images];
                  next[i] = { ...next[i], caption: e.target.value };
                  setImages(next);
                }}
                className="text-[11px] text-gray-500 w-full text-center mt-0.5 border-0 focus:outline-none bg-transparent"
              />
            </div>
          ))}
        </div>
      </div>
      {lightboxIndex !== null && (
        <Lightbox images={lightboxImages} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </NodeViewWrapper>
  );
}

// ============================================================
// Embed / LinkCard NodeView (편집 가능한 URL/캡션 + 실제 Preview)
// ============================================================

function EmbedView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { provider, url, caption } = node.attrs as { provider: EmbedProvider; url: string; caption: string };
  const labels: Record<EmbedProvider, string> = {
    youtube: "YouTube",
    vimeo: "Vimeo",
    instagram: "Instagram",
    spotify: "Spotify",
    googleMaps: "Google Maps",
  };

  return (
    <NodeViewWrapper className="embed-node my-4 border border-gray-200 rounded-md p-3" data-drag-handle>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">{labels[provider]} 임베드</span>
        <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => deleteNode()}>
          삭제
        </button>
      </div>
      <input
        type="text"
        value={url}
        placeholder="URL을 입력하세요"
        onChange={(e) => updateAttributes({ url: e.target.value })}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-2"
      />
      <EmbedPreview provider={provider} url={url} />
      <input
        type="text"
        value={caption}
        placeholder="캡션 (선택)"
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        className="text-xs text-gray-500 text-center w-full border-0 focus:outline-none bg-transparent mt-1"
      />
    </NodeViewWrapper>
  );
}

function EmbedPreview({ provider, url }: { provider: EmbedProvider; url: string }) {
  if (!url) return <p className="text-xs text-gray-400">URL을 입력하면 미리보기가 표시됩니다.</p>;

  if (provider === "instagram") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
        Instagram에서 보기 ↗
      </a>
    );
  }

  const src =
    provider === "youtube"
      ? (() => {
          const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ??
            url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
          return m ? `https://www.youtube.com/embed/${m[1]}` : null;
        })()
      : provider === "vimeo"
      ? (() => {
          const m = url.match(/vimeo\.com\/(\d+)/);
          return m ? `https://player.vimeo.com/video/${m[1]}` : null;
        })()
      : provider === "spotify"
      ? `https://open.spotify.com/embed?url=${encodeURIComponent(url)}`
      : url; // googleMaps: embed URL을 그대로 사용

  if (!src) return <p className="text-xs text-amber-600">URL에서 ID를 인식하지 못했어요.</p>;

  return (
    <iframe
      src={src}
      width="100%"
      height={provider === "spotify" ? 152 : provider === "googleMaps" ? 300 : 250}
      style={{ border: 0 }}
      loading="lazy"
      allow="encrypted-media"
      className="rounded"
    />
  );
}

function LinkCardView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { url, title, description } = node.attrs as { url: string; title: string; description: string };
  return (
    <NodeViewWrapper className="link-card-node my-4 border border-gray-200 rounded-md p-3" data-drag-handle>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">링크 카드</span>
        <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => deleteNode()}>
          삭제
        </button>
      </div>
      <input
        type="text"
        value={url}
        placeholder="https://..."
        onChange={(e) => updateAttributes({ url: e.target.value })}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-1"
      />
      <input
        type="text"
        value={title}
        placeholder="제목"
        onChange={(e) => updateAttributes({ title: e.target.value })}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-1"
      />
      <input
        type="text"
        value={description}
        placeholder="설명 (선택)"
        onChange={(e) => updateAttributes({ description: e.target.value })}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1"
      />
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 border border-gray-100 rounded p-2 hover:bg-gray-50"
        >
          <strong className="text-sm block">{title || url}</strong>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </a>
      )}
    </NodeViewWrapper>
  );
}

// ============================================================
// Toolbar
// ============================================================

type ToolbarProps = {
  editor: Editor;
  onImageUpload: (files: File[]) => Promise<void>;
  onGalleryUpload: (files: File[]) => Promise<void>;
  onAutoSave?: () => void;
  isSaving?: boolean;
  onTogglePreview: () => void;
  isPreview: boolean;
};

function Toolbar({
  editor,
  onImageUpload,
  onGalleryUpload,
  onAutoSave,
  isSaving,
  onTogglePreview,
  isPreview,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [embedMenuOpen, setEmbedMenuOpen] = useState(false);

  function insertEmbed(provider: EmbedProvider) {
    const url = window.prompt(`${provider} URL을 입력하세요`);
    setEmbedMenuOpen(false);
    if (!url) return;
    editor.chain().focus().insertContent({ type: "embed", attrs: { provider, url, caption: "" } }).run();
  }

  function insertLinkCard() {
    const url = window.prompt("링크 URL을 입력하세요");
    if (!url) return;
    const title = window.prompt("카드에 표시할 제목 (선택)") ?? "";
    editor
      .chain()
      .focus()
      .insertContent({ type: "linkCard", attrs: { url, title, description: "" } })
      .run();
  }

  return (
    <div className="flex flex-wrap gap-1 border border-gray-300 border-b-0 rounded-t-md bg-gray-50 p-2 items-center">
      <div className="flex gap-0.5">
        <ToolbarButton title="굵게 (B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton title="기울임 (I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton title="밑줄 (U)" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton title="취소선" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
          <span className="line-through">S</span>
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <div className="flex gap-0.5">
        {[1, 2, 3].map((level) => (
          <ToolbarButton
            key={level}
            title={`제목 ${level}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
            active={editor.isActive("heading", { level })}
          >
            H{level}
          </ToolbarButton>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <div className="flex gap-0.5">
        <ToolbarButton title="글머리 목록" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          •_LIST
        </ToolbarButton>
        <ToolbarButton title="번호 목록" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          1_LIST
        </ToolbarButton>
        <ToolbarButton title="체크리스트" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")}>
          ☑
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <div className="flex gap-0.5">
        <ToolbarButton title="인용문" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          &ldquo;
        </ToolbarButton>
        <ToolbarButton title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          —
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <div className="flex gap-0.5">
        <ToolbarButton title="왼쪽 정렬" onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}>
          ≡L
        </ToolbarButton>
        <ToolbarButton title="중앙 정렬" onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}>
          ≡C
        </ToolbarButton>
        <ToolbarButton title="오른쪽 정렬" onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}>
          ≡R
        </ToolbarButton>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

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

      <ToolbarButton title="이미지 업로드 (여러 장 가능)" onClick={() => fileInputRef.current?.click()}>
        🖼
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) await onImageUpload(files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      <ToolbarButton title="갤러리 삽입 (여러 장 → 그리드)" onClick={() => galleryInputRef.current?.click()}>
        🖼🖼
      </ToolbarButton>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) await onGalleryUpload(files);
          if (galleryInputRef.current) galleryInputRef.current.value = "";
        }}
      />

      <div className="relative">
        <ToolbarButton title="임베드 삽입" onClick={() => setEmbedMenuOpen((v) => !v)}>
          ▶
        </ToolbarButton>
        {embedMenuOpen && (
          <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-md text-sm min-w-[140px]">
            {(["youtube", "vimeo", "instagram", "spotify", "googleMaps"] as EmbedProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => insertEmbed(p)}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-50"
              >
                {p === "youtube" && "YouTube"}
                {p === "vimeo" && "Vimeo"}
                {p === "instagram" && "Instagram"}
                {p === "spotify" && "Spotify"}
                {p === "googleMaps" && "Google Maps"}
              </button>
            ))}
          </div>
        )}
      </div>

      <ToolbarButton title="외부 링크 카드" onClick={insertLinkCard}>
        🔗card
      </ToolbarButton>

      <div className="flex-1" />

      <ToolbarButton title="미리보기" onClick={onTogglePreview} active={isPreview}>
        {isPreview ? "편집으로" : "미리보기"}
      </ToolbarButton>

      {isSaving && <span className="text-xs text-gray-400">저장 중...</span>}
      {!isSaving && onAutoSave && (
        <button type="button" onClick={onAutoSave} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
          임시저장
        </button>
      )}
    </div>
  );
}

// ============================================================
// BlockEditor
// ============================================================

export type BlockEditorProps = {
  /** 초기 내용 — Tiptap JSON(ProseMirror doc). 레거시 글은 undefined일 수 있고, legacyHtml로 대체 로드한다. */
  value?: JSONContent | null;
  /** 레거시(EPIC-052/053 이전) 글의 HTML — value가 없을 때만 사용, Tiptap이 HTML 파싱해 로드한다. */
  legacyHtml?: string;
  /** 내용 변경 시 호출 — JSON(정본)과 HTML(파생, 미리보기/레거시 캐시용) 둘 다 전달. */
  onChange: (json: JSONContent, html: string) => void;
  placeholder?: string;
  onAutoSave?: (json: JSONContent, html: string) => void;
  autoSaveInterval?: number;
  className?: string;
};

export function BlockEditor({
  value,
  legacyHtml,
  onChange,
  placeholder,
  onAutoSave,
  autoSaveInterval = 30000,
  className = "",
}: BlockEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const extensions = useMemo(
    () => [
      ...coreExtensions().filter((ext) => !["figureImage", "gallery", "embed", "linkCard"].includes((ext as { name?: string }).name ?? "")),
      Placeholder.configure({ placeholder: placeholder ?? "내용을 입력하세요..." }),
      FigureImage.extend({ addNodeView: () => ReactNodeViewRenderer(FigureImageView) }),
      GalleryBlock.extend({ addNodeView: () => ReactNodeViewRenderer(GalleryView) }),
      EmbedBlock.extend({ addNodeView: () => ReactNodeViewRenderer(EmbedView) }),
      LinkCardBlock.extend({ addNodeView: () => ReactNodeViewRenderer(LinkCardView) }),
    ],
    [placeholder],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value ?? legacyHtml ?? emptyDoc(),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (files.length > 0) {
            handleImageFiles(files);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const clipboardData = event.clipboardData;
        if (clipboardData?.files.length) {
          const files = Array.from(clipboardData.files).filter((f) => f.type.startsWith("image/"));
          if (files.length > 0) {
            handleImageFiles(files);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getHTML());
    },
  }, [extensions]);

  // 자동 저장 타이머
  useEffect(() => {
    if (!onAutoSave || !editor) return;
    const intervalId = setInterval(() => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      if (html !== "<p></p>" && html.length > 0) {
        setIsSaving(true);
        onAutoSave(json, html);
        setTimeout(() => {
          setIsSaving(false);
          setLastSaved(new Date());
        }, 500);
      }
    }, autoSaveInterval);
    return () => clearInterval(intervalId);
  }, [editor, onAutoSave, autoSaveInterval]);

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
          editor
            .chain()
            .focus()
            .insertContent({
              type: "figureImage",
              attrs: { src: result.url, path: result.path, alt: file.name, caption: "", featured: false },
            })
            .run();
        } catch (err) {
          console.error("이미지 업로드 오류:", err);
        }
      }
    },
    [editor],
  );

  const handleGalleryUpload = useCallback(
    async (files: File[]) => {
      if (!editor) return;
      const uploaded = await uploadMultipleFiles(files, STORAGE_BUCKETS.GALLERY, "gallery");
      const images: GalleryImageAttrs[] = uploaded
        .filter((r) => !r.error)
        .map((r) => ({ src: r.url, path: r.path, alt: "", caption: "" }));
      if (images.length === 0) return;
      editor.chain().focus().insertContent({ type: "gallery", attrs: { images, columns: 3 } }).run();
    },
    [editor],
  );

  const handleManualSave = useCallback(() => {
    if (!editor || !onAutoSave) return;
    const json = editor.getJSON();
    const html = editor.getHTML();
    setIsSaving(true);
    onAutoSave(json, html);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 500);
  }, [editor, onAutoSave]);

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
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) handleImageFiles(files);
    },
    [handleImageFiles],
  );

  if (!editor) return null;

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${className}`}>
      <Toolbar
        editor={editor}
        onImageUpload={handleImageFiles}
        onGalleryUpload={handleGalleryUpload}
        onAutoSave={onAutoSave ? handleManualSave : undefined}
        isSaving={isSaving}
        onTogglePreview={() => setIsPreview((v) => !v)}
        isPreview={isPreview}
      />

      {isPreview ? (
        <div
          className="prose prose-sm max-w-none px-4 py-3 min-h-[300px] bg-white"
          // 실제 게시글(PostBody)과 동일하게 sanitize된 HTML을 그대로 보여준다 —
          // 별도 미리보기 전용 렌더러를 만들지 않고 editor.getHTML() 결과를 재사용.
          dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
        />
      ) : (
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative ${isDragging ? "bg-blue-50" : ""}`}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-b-md">
              <p className="text-blue-600 font-medium">이미지를 여기에 놓으세요</p>
            </div>
          )}
          <EditorContent editor={editor} />
          {lastSaved && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
              마지막 저장: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
