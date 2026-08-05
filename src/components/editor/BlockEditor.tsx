"use client";

import { useEditor, EditorContent, type Editor, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { uploadPostImage, uploadMultipleFiles, STORAGE_BUCKETS } from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";
import {
  coreExtensions,
  FigureImage,
  GalleryBlock,
  EmbedBlock,
  LinkCardBlock,
  embedSrc,
  detectProvider,
  clampInstagramWidth,
  INSTAGRAM_WIDTH_MIN,
  INSTAGRAM_WIDTH_MAX,
  type JSONContent,
  type EmbedProvider,
  type EmbedAspectRatio,
  type GalleryImageAttrs,
  emptyDoc,
} from "@/lib/blockEditorCore";
import { Lightbox, type LightboxImage } from "./Lightbox";
import { processInstagramEmbeds } from "@/lib/instagramEmbed";
import { processRawHtmlEmbeds } from "@/lib/rawHtmlEmbed";
import { sanitizeHtml } from "@/lib/sanitize";
import { EmbedConfigModal, type EmbedInsertResult } from "./EmbedConfigModal";

// EPIC-053.1: Block Editor 확장.
// - 정본 저장 형식을 HTML에서 Tiptap JSON(ProseMirror doc)으로 전환 —
//   onChange가 이제 (json, html) 둘 다 넘겨준다. HTML은 미리보기/레거시
//   호환용 파생값일 뿐, 실제로 저장해야 하는 값은 json이다.
// - 이미지 Block을 캡션/ALT/대표이미지 지정/삭제/순서변경(드래그+버튼)
//   가능한 NodeView로 승격.
// - Gallery/Embed(Youtube/Vimeo/Instagram/Spotify/Maps)/LinkCard 블록 삽입.
// - Preview 모드(실제 게시글과 동일한 sanitize된 HTML을 그대로 렌더링).

// EPIC-079-FINAL-FIX: 다른 웹사이트에서 이미지/영상 "링크 텍스트"만 복사해
// 붙여넣었을 때(파일 바이트도, <img>/<iframe> 태그도 없는 순수 URL) 자동
// 인식용 — 이미지/영상 파일 확장자 URL을 판별한다.
const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i;
const VIDEO_URL_RE = /\.(mp4|webm|mov|m3u8)(\?\S*)?$/i;

// EPIC-079-HOTFIX-2: "다른 웹사이트에서 이미지를 복사해 붙여넣으면(파일
// 바이트로) 안 된다"는 신고 조사 — 실제로는 조용히 아무것도 안 됐다(에러도
// 없음). 원인: `useEditor({ immediatelyRender: false, ... editorProps })`에서
// `editor`는 첫 렌더에 null이었다가 마운트 후에야 실제 Editor 인스턴스로
// 바뀌는데, `editorProps.handlePaste`/`handleDrop` 안에서 `editor`에 의존하는
// `handleImageFiles`(useCallback)를 호출하면 그 클로저가 **최초 렌더 시점의
// stale한 editor=null**을 계속 참조한다(`useEditor`가 `[extensions]`
// 의존성이 안 바뀌는 한 이 콜백들을 다시 만들지 않으므로 영원히 갱신 안 됨).
// `handleImageFiles`는 `if (!editor) return;`으로 조용히 아무 일도 안 하고
// 끝나버려 사용자에게는 "복사한 이미지를 붙여넣었는데 반응이 없다"로만
// 보였다 — 순수 URL 텍스트 붙여넣기 분기(바로 아래)가 이미 같은 이유로
// `editor` 대신 콜백이 직접 받는 `view` 파라미터를 쓰도록 되어 있었는데,
// 이미지 파일 분기만 그 패턴을 안 따르고 있었다. 이 함수는 컴포넌트
// 클로저에 전혀 의존하지 않는 모듈 스코프 함수로 만들어 그 문제 자체를
// 원천 차단한다 — 매번 호출 시점의 살아있는 `view`를 직접 받는다.
async function uploadAndInsertImages(view: EditorView, files: File[]) {
  for (const file of files) {
    try {
      const result = await uploadPostImage(file, "editor");
      if (result.error) {
        console.error("이미지 업로드 실패:", result.error);
        continue;
      }
      const nodeType = view.state.schema.nodes.figureImage;
      if (!nodeType) continue;
      const node = nodeType.create({
        src: result.url,
        path: result.path,
        alt: file.name,
        caption: "",
        featured: false,
      });
      // handleImageFiles(toolbar/드롭 업로드)와 동일하게 항상 문서 끝에
      // 삽입한다 — 커서 위치에 그대로 넣으면 직전에 삽입한 atom 블록을
      // 통째로 교체해버리는 기존에 확인된 버그(EPIC-079 주석 참고)가 있다.
      view.dispatch(view.state.tr.insert(view.state.doc.content.size, node));
    } catch (err) {
      console.error("이미지 업로드 오류:", err);
    }
  }
}

// ============================================================
// Toolbar Button
// ============================================================

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  // EPIC-079-PHASE-5: title은 hover해야만 보이는 네이티브 툴팁이라, 아이콘만
  // 보고는 기능을 추측하기 어렵다는 피드백 — 항상 보이는 작은 텍스트
  // 라벨이 필요한 버튼에만 이 prop을 넘긴다(전체 툴바에 다 붙이면 좁은
  // 화면에서 줄바꿈이 심해져, "외부자료/이미지/갤러리" 3개로 범위를 좁힘).
  label?: string;
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
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${
        label ? "flex flex-col items-center gap-0.5 px-2" : ""
      }`}
    >
      {children}
      {label && <span className="text-[10px] leading-none whitespace-nowrap">{label}</span>}
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
    // EPIC-079-HOTFIX-3: 대표 이미지는 문서 전체에서 하나뿐이어야 하므로
    // embed(★로 지정된 유튜브/비메오/인스타그램)의 featured도 함께 끈다.
    state.doc.descendants((n, pos) => {
      if ((n.type.name === "figureImage" || n.type.name === "embed") && n.attrs.featured) {
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

const EMBED_DEFAULT_HEIGHT: Record<EmbedProvider, number> = {
  youtube: 315,
  vimeo: 315,
  spotify: 152,
  googleMaps: 350,
  instagram: 550,
  twitter: 550,
  naverBlog: 600,
  naverMap: 400,
  raw: 400,
  customHtml: 400,
};

// EPIC-079-HOTFIX-3: 이 provider만 실제 썸네일 resolve가 가능하다
// (embedThumbnail.ts 참고 — youtube는 CDN URL 규칙, vimeo는 공개 oEmbed,
// instagram은 permalink og:image 스크래핑). 나머지(spotify/지도/X 등)는
// 신뢰할 만한 이미지 썸네일 자체가 없어 버튼을 아예 보여주지 않는다.
const FEATURABLE_EMBED_PROVIDERS: EmbedProvider[] = ["youtube", "vimeo", "instagram"];

function EmbedView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const { provider, url, caption, height, aspectRatio, hideCaption, width, rawHtml, featured } = node.attrs as {
    provider: EmbedProvider;
    url: string;
    caption: string;
    height: number | null;
    aspectRatio: EmbedAspectRatio | null;
    hideCaption: boolean;
    width: number | null;
    rawHtml: string;
    featured: boolean;
  };
  const [resolvingThumbnail, setResolvingThumbnail] = useState(false);
  const labels: Record<EmbedProvider, string> = {
    youtube: "YouTube",
    vimeo: "Vimeo",
    instagram: "Instagram",
    spotify: "Spotify",
    googleMaps: "Google Maps",
    twitter: "X (Twitter)",
    naverBlog: "네이버 블로그",
    naverMap: "네이버 지도",
    raw: "임베드",
    customHtml: "HTML 코드",
  };

  // EPIC-079-HOTFIX-3: FigureImageView.setAsFeatured와 동일한 패턴 —
  // 이미지든 임베드든 대표 이미지는 문서 전체에서 하나뿐이어야 하므로,
  // 지정 전에 다른 모든 figureImage/embed의 featured를 먼저 끈다.
  async function setAsFeaturedEmbed() {
    if (!url) return;
    setResolvingThumbnail(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/embed-thumbnail?provider=${provider}&url=${encodeURIComponent(url)}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.thumbnailUrl) {
        alert(data.error ?? "썸네일을 찾지 못했어요.");
        return;
      }
      const { state, view } = editor;
      const tr = state.tr;
      state.doc.descendants((n, pos) => {
        if (n.type.name === "figureImage" && n.attrs.featured) {
          tr.setNodeAttribute(pos, "featured", false);
        }
        if (n.type.name === "embed" && n.attrs.featured) {
          tr.setNodeAttribute(pos, "featured", false);
        }
      });
      const pos = typeof getPos === "function" ? getPos() : null;
      if (pos != null) {
        tr.setNodeAttribute(pos, "featured", true);
        tr.setNodeAttribute(pos, "thumbnailUrl", data.thumbnailUrl);
      }
      view.dispatch(tr);
    } catch {
      alert("썸네일을 찾지 못했어요.");
    } finally {
      setResolvingThumbnail(false);
    }
  }

  return (
    <NodeViewWrapper className="embed-node my-4 border border-gray-200 rounded-md p-3" data-drag-handle>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">
          {labels[provider]} 임베드
          {featured && (
            <span className="ml-2 bg-amber-400 text-white text-[10px] px-1.5 py-0.5 rounded normal-case tracking-normal">
              대표 이미지
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {FEATURABLE_EMBED_PROVIDERS.includes(provider) && (
            <button
              type="button"
              title="대표 이미지로 지정"
              className={`text-xs hover:underline ${featured ? "text-amber-600" : "text-gray-500"}`}
              onClick={setAsFeaturedEmbed}
              disabled={resolvingThumbnail}
            >
              {resolvingThumbnail ? "찾는 중..." : featured ? "★ 대표 이미지" : "☆ 대표 이미지로 지정"}
            </button>
          )}
          <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => deleteNode()}>
            삭제
          </button>
        </div>
      </div>
      {provider === "customHtml" ? (
        <textarea
          value={rawHtml}
          placeholder='임베드 코드(HTML)를 붙여넣으세요 — 예: <blockquote>...</blockquote>, <iframe>...'
          onChange={(e) => updateAttributes({ rawHtml: e.target.value })}
          rows={5}
          className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 mb-2"
        />
      ) : (
        <input
          type="text"
          value={url}
          placeholder={
            provider === "googleMaps"
              ? "Google Maps 지도 링크(공유 URL)를 입력하세요"
              : "URL을 입력하세요"
          }
          onChange={(e) => updateAttributes({ url: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-2"
        />
      )}
      <EmbedPreview
        provider={provider}
        url={url}
        height={height}
        aspectRatio={aspectRatio}
        hideCaption={hideCaption}
        width={width}
        rawHtml={rawHtml}
      />
      {/* EPIC-079-PHASE-3: instagram은 캡션 노출 여부를, youtube는 화면
          비율을 삽입 후에도 다시 바꿀 수 있게 한다(모달은 삽입 시점 설정일
          뿐, 이후 편집은 이 NodeView가 담당). */}
      {provider === "instagram" && (
        <>
          <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
            <input
              type="checkbox"
              checked={hideCaption}
              onChange={(e) => updateAttributes({ hideCaption: e.target.checked })}
            />
            본문(캡션) 숨기기
          </label>
          {/* EPIC-079-PHASE-4: 공식 위젯이 실제로 존중하는 값은 너비뿐
              (높이는 콘텐츠에 맞춰 위젯이 자동으로 정함 — 바로 아래 높이
              입력이 instagram에서 항상 숨겨지는 이유). */}
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs text-gray-500 shrink-0">
              너비 ({clampInstagramWidth(width)}px)
            </label>
            <input
              type="range"
              min={INSTAGRAM_WIDTH_MIN}
              max={INSTAGRAM_WIDTH_MAX}
              value={clampInstagramWidth(width)}
              onChange={(e) => updateAttributes({ width: Number(e.target.value) })}
              className="flex-1"
            />
          </div>
        </>
      )}
      {provider === "youtube" && (
        <div className="flex items-center gap-2 mt-2">
          <label className="text-xs text-gray-500 shrink-0">화면 비율</label>
          <select
            value={aspectRatio ?? "16:9"}
            onChange={(e) => updateAttributes({ aspectRatio: e.target.value as EmbedAspectRatio })}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value="16:9">16:9 가로형</option>
            <option value="9:16">9:16 쇼츠(세로형)</option>
          </select>
        </div>
      )}
      {/* EPIC-079-PHASE-2 후속 핫픽스: instagram은 이제 iframe이 아니라
          embed.js 위젯이 자체적으로 크기를 정하는 blockquote라, 높이 입력이
          아무 효과가 없어 숨긴다. EPIC-079-PHASE-3: youtube가 화면비율
          모드(aspectRatio 지정)일 때도 고정 높이(px) 입력은 무시되므로 함께
          숨긴다(반응형 aspect-ratio wrapper가 대신 크기를 결정). */}
      {provider !== "instagram" && provider !== "customHtml" && !(provider === "youtube" && aspectRatio) && (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* EPIC-079-FINAL-FIX: 이전엔 높이만 조절 가능하고 너비는 항상
              컨테이너 100%로 고정돼 있었다("사이즈가 변경이 안 된다"는
              신고의 실제 원인) — 너비도 픽셀 단위로 직접 지정할 수 있게
              추가(비우면 기존처럼 100%). */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">너비(px, 비우면 100%)</label>
            <input
              type="number"
              min={100}
              max={1600}
              value={width ?? ""}
              placeholder="100%"
              onChange={(e) => updateAttributes({ width: e.target.value ? Number(e.target.value) : null })}
              className="w-24 text-xs border border-gray-200 rounded px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">
              높이(px, 보이는 영역)
            </label>
            <input
              type="number"
              min={100}
              max={1200}
              value={height ?? EMBED_DEFAULT_HEIGHT[provider]}
              onChange={(e) => updateAttributes({ height: Number(e.target.value) || null })}
              className="w-24 text-xs border border-gray-200 rounded px-2 py-1"
            />
          </div>
        </div>
      )}
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

function EmbedPreview({
  provider,
  url,
  height,
  aspectRatio,
  hideCaption,
  width,
  rawHtml,
}: {
  provider: EmbedProvider;
  url: string;
  height: number | null;
  aspectRatio?: EmbedAspectRatio | null;
  hideCaption?: boolean;
  width?: number | null;
  rawHtml?: string;
}) {
  if (provider === "customHtml") return <CustomHtmlEmbedPreview html={rawHtml ?? ""} />;
  if (!url) return <p className="text-xs text-gray-400">URL을 입력하면 미리보기가 표시됩니다.</p>;

  const src = embedSrc(provider, url);

  if (!src) {
    return (
      <p className="text-xs text-amber-600">
        {provider === "googleMaps"
          ? "이 URL에서 지도를 인식하지 못했어요 — google.com/maps로 시작하는 링크를 입력해주세요(단축 URL은 지원하지 않아요)."
          : "URL에서 ID를 인식하지 못했어요."}
      </p>
    );
  }

  // EPIC-079-PHASE-2 후속 핫픽스: instagram.com의 /embed/* 엔드포인트가
  // X-Frame-Options: DENY라 iframe으로는 절대 못 띄운다(항상 "차단됨"
  // 아이콘만 나오던 원인) — 공식 blockquote+embed.js 위젯으로 대체.
  if (provider === "instagram") {
    return <InstagramEmbedPreview permalink={src} hideCaption={Boolean(hideCaption)} width={width ?? null} />;
  }

  // EPIC-079-PHASE-3: youtube + 화면 비율 지정 시 고정 높이 대신 반응형
  // aspect-ratio wrapper로 미리보기 — renderHTML()의 실제 저장 마크업과
  // 동일한 방식이라 에디터 미리보기와 실제 게시글이 항상 같아 보인다.
  if (provider === "youtube" && aspectRatio) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: aspectRatio === "9:16" ? 360 : "100%",
          aspectRatio: aspectRatio === "9:16" ? "9/16" : "16/9",
        }}
      >
        <iframe
          src={src}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          loading="lazy"
          className="rounded"
        />
      </div>
    );
  }

  return (
    <iframe
      src={src}
      width={width ? `${width}px` : "100%"}
      height={height ?? EMBED_DEFAULT_HEIGHT[provider]}
      style={{ border: 0, maxWidth: "100%" }}
      loading="lazy"
      allow={provider === "spotify" ? "encrypted-media" : undefined}
      className="rounded"
    />
  );
}

function InstagramEmbedPreview({
  permalink,
  hideCaption,
  width,
}: {
  permalink: string;
  hideCaption: boolean;
  width: number | null;
}) {
  const w = clampInstagramWidth(width);
  // EPIC-079-HOTFIX: 이전엔 `useRef`+`useEffect`로 컨테이너를 얻었는데,
  // Tiptap의 ReactNodeViewRenderer가 NodeView마다 별도 React 렌더 트리를
  // 관리하는 탓에(에디터 메인 트리와 커밋/effect 타이밍이 분리됨) 이 ref가
  // 위 useEffect가 실행되는 시점에 아직 채워지지 않는 경우가 실제로
  // 있었다 — 그 결과 blockquote가 영원히 만들어지지 않고 빈 wrapper div만
  // 남는 버그가 재현됨(콘솔 에러 없이 조용히 실패해 눈에 띄지 않았음). ref
  // 자체는 그대로 useRef로 두고(mutation이 허용되는 escape hatch), 콜백
  // ref가 실행되는 순간(=DOM 커밋 완료 시점)을 별도 state로 신호만 보내
  // effect가 "노드가 준비된 다음"에만 실행되도록 한다(React Compiler는
  // useState 반환값을 직접 mutate하는 걸 금지하므로 container 자체를
  // state로 들고 있을 수 없다 — mountTick은 트리거 용도일 뿐 읽지 않는다).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mountTick, setMountTick] = useState(0);
  const setContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setMountTick((t) => t + 1);
  }, []);

  // EPIC-079-HOTFIX: MutationObserver로 직접 재현/확인한 진짜 원인 —
  // 삽입 직후(또는 자동저장처럼 부모가 리렌더될 때마다) 이 effect가 같은
  // permalink/hideCaption/width로 여러 번 실행된다. 그중 한 번이 성공적으로
  // 처리(embed.js가 blockquote를 실제 <iframe>으로 변환)한 *뒤에* 또 한 번
  // 더 실행되면, `container.innerHTML = ""`가 방금 embed.js가 만든 iframe을
  // 무조건 지워버리고 새 빈 blockquote로 되돌린 채 effect가 끝나(대개 그 뒤
  // 재실행이 더는 없어) 최종적으로 빈 wrapper만 남았다 — 콘솔 에러 없이
  // 조용히 실패해 원인 파악이 어려웠다. "같은 설정으로 이미 무언가 그려져
  // 있으면 다시 지우지 않는다"는 멱등성 가드가 필요한데, 그 판정을 React
  // ref(컴포넌트 인스턴스에 묶임)가 아니라 **DOM 노드 자신의 dataset**에
  // 저장한다 — 컨테이너가 통째로 새로 만들어지는 경우(진짜 리마운트)에는
  // 새 노드의 dataset이 비어있으니 정상적으로 다시 그리고, 같은 노드에
  // 대한 반복 실행만 걸러낸다.
  const IG_KEY_ATTR = "igKey";

  // 버그 재현/수정(EPIC-079-PHASE-4): 이전엔 key={permalink-hideCaption-width}로
  // React가 새 <blockquote> DOM 노드를 강제로 만들게 했는데, 그 사이 embed.js가
  // 이미 그 blockquote를 자기 방식대로 완전히 다른 구조(iframe 등)로 갈아치워
  // 둔 상태라, React가 "예전에 자기가 만든 그 blockquote"를 부모에서
  // removeChild하려다 실제 DOM에는 그 노드가 더 이상 없어 `NotFoundError:
  // Failed to execute 'removeChild'`로 크래시했다(에디터에서 캡션/너비를 바꿀
  // 때마다 재현됨 — "본문 숨기기 누르면 오류 페이지" 리포트의 원인). 해결:
  // React는 빈 wrapper div만 선언적으로 관리하고, 그 안의 blockquote는
  // React JSX 트리에 전혀 등장하지 않는 완전한 명령형(imperative) DOM으로
  // 직접 만들고 지운다 — React가 diff할 자식이 애초에 없으므로 embed.js가
  // 그 안을 무엇으로 바꾸든 React의 재조정과 절대 충돌하지 않는다.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const key = `${permalink}|${hideCaption}|${w}`;
    if (container.dataset[IG_KEY_ATTR] === key) {
      return;
    }
    container.dataset[IG_KEY_ATTR] = key;
    container.innerHTML = "";

    const blockquote = document.createElement("blockquote");
    blockquote.className = "instagram-media";
    blockquote.setAttribute("data-instgrm-permalink", permalink);
    blockquote.setAttribute("data-instgrm-version", "14");
    if (!hideCaption) blockquote.setAttribute("data-instgrm-captioned", "true");
    // EPIC-079-HOTFIX: renderHTML(blockEditorCore.ts)의 실제 저장 마크업과
    // 동일한 스타일로 맞춰 에디터 미리보기와 실제 게시글이 항상 같아 보이게
    // 한다(Instagram 공식 embed.js 마크업의 box-shadow + calc() width 트릭).
    blockquote.style.cssText = `background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin:1px; max-width:${w}px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);`;

    const link = document.createElement("a");
    link.href = permalink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Instagram 게시물 보기";
    blockquote.appendChild(link);

    container.appendChild(blockquote);
    processInstagramEmbeds();
  }, [mountTick, permalink, hideCaption, w]);

  return <div ref={setContainer} />;
}

// 버그 수정(EPIC-079-FINAL-FIX): 이 컴포넌트가 sanitizeHtml()로 정제된
// HTML(예: 사용자가 붙여넣은 Instagram 공식 embed 코드)을 innerHTML로 DOM에
// 넣기만 하고, embed.js를 한 번도 호출하지 않았다 — sanitizeHtml이
// <script> 태그 자체는 항상 제거하므로(Stored XSS 방지), 붙여넣은 코드에
// 원래 딸려있던 `<script src=".../embed.js">`는 여기서 사라지고, 그
// 스크립트가 원래 하던 일(blockquote를 실제 iframe으로 변환)을 대신 실행할
// 사람이 아무도 없었다 — 그 결과 정적 blockquote(스켈레톤 UI)만 남고 실제
// 임베드가 렌더링되지 않았다. InstagramEmbedPreview(공식 URL 삽입 경로)는
// 이미 processInstagramEmbeds()를 호출하고 있었는데 이 경로만 빠져있었다.
function CustomHtmlEmbedPreview({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = sanitizeHtml(html);
    // Instagram 공식 코드가 섞여 있으면 embed.js를 강제로 로드/재실행한다
    // (스크립트가 DOM에 아직 없으면 instagramEmbed.ts가 동적으로 <head>에
    // 주입한 뒤 로드 완료 시 처리 — window.instgrm이 이미 있으면 즉시 처리).
    if (html.includes("instagram-media")) {
      processInstagramEmbeds();
    }
  }, [html]);

  if (!html.trim()) {
    return <p className="text-xs text-gray-400">HTML 코드를 입력하면 미리보기가 표시됩니다.</p>;
  }
  return <div ref={ref} />;
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
  const [embedModalOpen, setEmbedModalOpen] = useState(false);

  // EPIC-079: focus("end") 없이 focus()만 쓰면, 직전에 삽입한 atom 블록(이미지/
  // 임베드/갤러리/링크카드는 전부 group:"block", atom:true) 바로 뒤에 selection이
  // NodeSelection으로 남는 경우가 있어(빈 문단 사이에서 ProseMirror가 텍스트
  // 위치를 못 찾고 그 블록 자체를 선택) 다음 insertContent가 새로 추가되는 게
  // 아니라 그 블록을 통째로 "교체"해버렸다(연속으로 이미지+임베드를 넣으면
  // 이미지가 사라지는 버그로 재현 확인) — 항상 문서 끝에서 삽입하도록 고정.
  // EPIC-079-PHASE-3: window.prompt() 기반 단일 URL 입력을 EmbedConfigModal로
  // 교체 — 플랫폼별 옵션(비율/캡션/사이즈)까지 한 번에 받아 삽입한다.
  function insertEmbedWithConfig(result: EmbedInsertResult) {
    editor
      .chain()
      .focus("end")
      .insertContent({
        type: "embed",
        attrs: {
          provider: result.provider,
          url: result.url,
          caption: "",
          height: result.height,
          aspectRatio: result.aspectRatio,
          hideCaption: result.hideCaption,
          width: result.width,
          rawHtml: result.rawHtml,
        },
      })
      .run();
  }

  function insertLinkCard() {
    const url = window.prompt("링크 URL을 입력하세요");
    if (!url) return;
    const title = window.prompt("카드에 표시할 제목 (선택)") ?? "";
    editor
      .chain()
      .focus("end")
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

      <ToolbarButton title="이미지 업로드 (여러 장 가능)" label="이미지 업로드" onClick={() => fileInputRef.current?.click()}>
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

      <ToolbarButton title="갤러리 삽입 (여러 장 → 그리드)" label="갤러리 삽입" onClick={() => galleryInputRef.current?.click()}>
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

      <ToolbarButton title="외부자료 삽입 (유튜브/인스타/스포티파이/X/지도 등)" label="외부자료 삽입" onClick={() => setEmbedModalOpen(true)}>
        ▶
      </ToolbarButton>
      {embedModalOpen && (
        <EmbedConfigModal
          onClose={() => setEmbedModalOpen(false)}
          onInsert={(result) => {
            insertEmbedWithConfig(result);
            setEmbedModalOpen(false);
          }}
        />
      )}

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
  const previewRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const extensions = useMemo(
    () => [
      ...coreExtensions().filter((ext) => !["figureImage", "gallery", "embed", "linkCard"].includes((ext as { name?: string }).name ?? "")),
      Placeholder.configure({ placeholder: placeholder ?? "내용을 입력하세요..." }),
      FigureImage.extend({ addNodeView: () => ReactNodeViewRenderer(FigureImageView) }),
      GalleryBlock.extend({ addNodeView: () => ReactNodeViewRenderer(GalleryView) }),
      EmbedBlock.extend({
        addNodeView: () =>
          ReactNodeViewRenderer(EmbedView, {
            // 버그 수정(EPIC-079-PHASE-4): InstagramEmbedPreview를 React
            // 리렌더와 완전히 분리된 명령형 DOM으로 바꿔도(위 참고)
            // NotFoundError(removeChild)가 계속 재현됐다 — 진짜 원인은 한 겹
            // 더 위에 있었다. ProseMirror는 이 노드의 DOM을 자체
            // MutationObserver로 감시하다가, embed.js가 blockquote를
            // iframe으로 바꿔치기하는 걸 "사용자가 에디터에서 직접 DOM을
            // 편집했다"로 오인해 자기 모델에 맞춰 되돌리려 하고, 그 되돌리기
            // 시도가 React가 이미 관리 중인 DOM과 충돌해 크래시로 이어졌다.
            // 이 노드는 atom:true라 애초에 사용자가 contentEditable로 내부를
            // 직접 편집할 일이 없으므로, 이 노드 내부 mutation은 전부
            // ProseMirror가 무시하도록 명시한다.
            ignoreMutation: () => true,
          }),
      }),
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
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (files.length > 0) {
            uploadAndInsertImages(view, files);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        if (clipboardData.files.length) {
          const files = Array.from(clipboardData.files).filter((f) => f.type.startsWith("image/"));
          if (files.length > 0) {
            uploadAndInsertImages(view, files);
            return true;
          }
        }

        // EPIC-079-FINAL-FIX: 다른 웹사이트 이미지를 "복사"했는데 파일
        // 바이트가 아니라 <img src="..."> 마크업으로만 오는 경우는 이미
        // FigureImage의 parseHTML 규칙(스키마 레벨, blockEditorCore.ts)이
        // 기본 붙여넣기 경로에서 알아서 처리한다 — 여기서 별도 처리 불필요.
        // 반면 사람이 유튜브/인스타 링크나 이미지 URL을 "텍스트로" 복사해
        // 붙여넣는 경우는 클립보드에 <img>/<iframe> 태그 자체가 없어 그
        // 스키마 규칙이 못 잡는다 — 순수 URL 텍스트만 있을 때 이걸 감지해
        // 자동으로 이미지/임베드로 바꿔준다. 여기서는 (React Compiler가
        // useEditor(...) 설정 객체 안에서 그 결과물인 editor 변수를 다시
        // 참조하는 자기순환을 못 다뤄 최적화를 통째로 포기하는 문제가 있어)
        // editor 대신 handlePaste가 직접 받는 ProseMirror view로 트랜잭션을
        // 만든다 — Tiptap 훅과 완전히 무관한 경로라 안전하다.
        const text = clipboardData.getData("text/plain").trim();
        const isPlainUrl = /^https?:\/\/\S+$/i.test(text);
        if (!isPlainUrl) return false;

        function insertAtomNode(type: "figureImage" | "embed", attrs: Record<string, unknown>) {
          const nodeType = view.state.schema.nodes[type];
          if (!nodeType) return false;
          const node = nodeType.create(attrs);
          view.dispatch(view.state.tr.replaceSelectionWith(node));
          view.focus();
          return true;
        }

        if (IMAGE_URL_RE.test(text)) {
          return insertAtomNode("figureImage", { src: text, path: null, alt: "", caption: "", featured: false });
        }

        const embedDefaults = {
          caption: "",
          height: null,
          aspectRatio: null,
          hideCaption: false,
          width: null,
          rawHtml: "",
        };

        const provider = detectProvider(text);
        if (provider) {
          return insertAtomNode("embed", { ...embedDefaults, provider, url: text });
        }

        // 유튜브/비메오 등으로 인식은 안 되지만 직접 재생 가능한 영상
        // 파일(.mp4 등) URL이면 raw iframe 임베드로 넣는다(브라우저가
        // 프레임 안에서 네이티브 비디오 플레이어를 보여준다).
        if (VIDEO_URL_RE.test(text)) {
          return insertAtomNode("embed", { ...embedDefaults, provider: "raw", url: text });
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getHTML());
    },
  }, [extensions]);

  // EPIC-079-PHASE-4: "미리보기" 모드는 dangerouslySetInnerHTML로 정적
  // 마크업만 넣는다 — instagram 위젯/customHtml raw HTML 둘 다 실제로
  // 화면에 보이려면 이 시점에 한 번 더 처리해야 한다(PostBody.tsx와 동일
  // 이유, 순서도 동일하게 rawHtml 주입 먼저 → instagram 위젯 처리).
  useEffect(() => {
    if (!isPreview || !previewRef.current) return;
    processRawHtmlEmbeds(previewRef.current);
    processInstagramEmbeds();
  }, [isPreview, editor]);

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
            .focus("end")
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
      editor.chain().focus("end").insertContent({ type: "gallery", attrs: { images, columns: 3 } }).run();
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
          ref={previewRef}
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
