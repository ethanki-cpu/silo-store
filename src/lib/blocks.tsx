// EPIC-053: Block Editor의 Block 타입 정의.
// JSON 기반 Block 구조 — posts.body에 HTML 대신 이 JSON을 저장하거나,
// 별도 content_blocks 테이블(향후 확장)에서 관리할 수 있다.
// 현재는 HTML 렌더링과의 호환을 위해 HTML 문자열도 저장 가능하지만,
// 향후 버전관리를 위해 Block 구조를 준비해둔다.

// ============================================================
// 기본 Block Types
// ============================================================

export type BlockType =
  // 텍스트 블록
  | "heading1"   // 제목 H1
  | "heading2"   // 소제목 H2
  | "heading3"   // 소제목 H3
  | "paragraph"  // 본문
  | "blockquote" // 인용문
  | "divider"    // 구분선
  | "bulletList" // 글머리 목록
  | "orderedList" // 번호 목록
  | "taskList"   // 체크리스트
  // 미디어 블록
  | "image"      // 사진 1장
  | "imageGrid"  // 사진 여러 장 (Grid)
  | "video"      // 영상 (mp4)
  | "youtube"    // Youtube 임베드
  | "vimeo"      // Vimeo 임베드
  | "audio"      // 오디오
  | "pdf"        // PDF
  // Embed 블록
  | "instagram"  // Instagram
  | "spotify"    // Spotify
  | "googleMaps" // Google Maps
  | "linkCard"   // 외부 링크 카드
  // 레이아웃 블록
  | "columns2"   // 2단 레이아웃
  | "columns3"   // 3단 레이아웃
  | "spacer";    // 빈 공간

// ============================================================
// Block 속성 (BlockType별 구조)
// ============================================================

/** 이미지 블록 속성 */
export type ImageBlockAttrs = {
  /** Supabase Storage public URL */
  url: string;
  /** Storage Path (삭제/썸네일 생성용) */
  path?: string;
  /** 이미지 캡션 (선택) */
  caption?: string;
  /** ALT 텍스트 (접근성) */
  alt?: string;
  /** 대표 이미지 여부 (썸네일용) */
  isFeatured?: boolean;
  /** 이미지 너비 (%) — 레이아웃 블록 내 사용 시 */
  width?: number;
};

/** 이미지 Grid 블록 속성 */
export type ImageGridBlockAttrs = {
  /** 이미지 목록 (순서 변경 가능) */
  images: ImageBlockAttrs[];
  /** Grid 열 수 (2, 3, 4) */
  columns?: 2 | 3 | 4;
  /** 대표 이미지 인덱스 */
  featuredIndex?: number;
};

/** 비디오 블록 속성 */
export type VideoBlockAttrs = {
  /** Supabase Storage public URL (mp4) */
  url: string;
  /** Storage Path */
  path?: string;
  /** 캡션 */
  caption?: string;
  /** 자동재생 */
  autoplay?: boolean;
  /** 컨트롤 표시 */
  controls?: boolean;
  /** 반복 재생 */
  loop?: boolean;
  /** 음소거 */
  muted?: boolean;
};

/** Youtube/Vimeo 블록 속성 */
export type EmbedBlockAttrs = {
  /** 임베드 URL 또는 비디오 ID */
  url: string;
  /** 캡션 */
  caption?: string;
  /** 너비 (px 또는 %) */
  width?: number | string;
  /** 높이 (px) */
  height?: number;
};

/** 오디오 블록 속성 */
export type AudioBlockAttrs = {
  /** Supabase Storage public URL */
  url: string;
  /** Storage Path */
  path?: string;
  /** 캡션 */
  caption?: string;
  /** 자동재생 */
  autoplay?: boolean;
  /** 반복 재생 */
  loop?: boolean;
};

/** PDF 블록 속성 */
export type PdfBlockAttrs = {
  /** Supabase Storage public URL */
  url: string;
  /** Storage Path */
  path?: string;
  /** 파일명 표시용 */
  filename?: string;
  /** 캡션 */
  caption?: string;
  /** 표시 높이 (px) */
  height?: number;
};

/** 외부 링크 카드 블록 속성 */
export type LinkCardBlockAttrs = {
  url: string;
  title?: string;
  description?: string;
  image?: string; // OG 이미지
  /** 사용자가 직접 입력한 커스텀 타이틀 (선택) */
  customTitle?: string;
};

/** Google Maps 임베드 블록 속성 */
export type GoogleMapsBlockAttrs = {
  /** Embed URL 또는 장소 검색 URL */
  embedUrl: string;
  /** 표시 높이 */
  height?: number;
  /** 캡션 */
  caption?: string;
};

/** Instagram 임베드 블록 속성 */
export type InstagramBlockAttrs = {
  /** Instagram 포스트/릴스 URL */
  url: string;
  /** 캡션 */
  caption?: string;
};

/** Spotify 임베드 블록 속성 */
export type SpotifyBlockAttrs = {
  /** Spotify 트랙/앨범/플레이리스트 URL */
  url: string;
  /** 캡션 */
  caption?: string;
};

/** 체크리스트 아이템 */
export type TaskItem = {
  id: string;
  text: string;
  checked: boolean;
};

/** 구분선/스페이서 속성 */
export type DividerBlockAttrs = {
  style?: "solid" | "dashed" | "dotted";
  color?: string;
};

export type SpacerBlockAttrs = {
  height: number; // px
};

// ============================================================
// Block 데이터 구조
// ============================================================

export type BlockId = string;

/** 개별 Block */
export interface Block {
  id: BlockId;
  type: BlockType;
  /** 블록별 속성 (type에 따라 다른 구조) */
  attrs: Record<string, unknown>;
  /** 순서 (0-based) */
  order: number;
  /** 부모 Block ID (columns2/columns3 레이아웃 내 자식용) */
  parentId?: BlockId;
  /** 자식 Block IDs (레이아웃 블록용) */
  children?: BlockId[];
  /** 생성 시간 */
  createdAt?: string;
  /** 수정 시간 */
  updatedAt?: string;
}

// ============================================================
// Editor State
// ============================================================

export interface EditorState {
  /** Block 목록 */
  blocks: Block[];
  /** 에디터 메타데이터 */
  meta: {
    title?: string;
    featuredImage?: ImageBlockAttrs;
    createdAt?: string;
    updatedAt?: string;
    /** 임시저장 여부 */
    isDraft?: boolean;
    /** 자동저장 여부 */
    autoSavedAt?: string;
  };
}

// ============================================================
// Block 단위 조작 유틸리티
// ============================================================

/** 새 Block ID 생성 */
export function createBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 빈 Block 생성 (工厂函数) */
export function createBlock(
  type: BlockType,
  attrs: Record<string, unknown> = {},
  order: number = 0,
): Block {
  return {
    id: createBlockId(),
    type,
    attrs,
    order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** 기본 Block 목록 생성 (빈 문서) */
export function createDefaultBlocks(): Block[] {
  return [createBlock("paragraph", {}, 0)];
}

// ============================================================
// Block 타입 → HTML 변환 (저장/렌더링용)
// ============================================================

/** Block을 HTML 문자열로 변환 (posts.body 저장용) */
export function blockToHtml(block: Block): string {
  const { type, attrs } = block;

  switch (type) {
    case "heading1":
      return `<h1>${escapeHtml(String(attrs.text ?? ""))}</h1>`;
    case "heading2":
      return `<h2>${escapeHtml(String(attrs.text ?? ""))}</h2>`;
    case "heading3":
      return `<h3>${escapeHtml(String(attrs.text ?? ""))}</h3>`;
    case "paragraph":
      return `<p>${escapeHtml(String(attrs.text ?? ""))}</p>`;
    case "blockquote":
      return `<blockquote>${escapeHtml(String(attrs.text ?? ""))}</blockquote>`;
    case "divider":
      return "<hr />";
    case "bulletList": {
      const items = (attrs.items as string[]) ?? [];
      return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }
    case "orderedList": {
      const items = (attrs.items as string[]) ?? [];
      return `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
    }
    case "taskList": {
      const tasks = (attrs.tasks as TaskItem[]) ?? [];
      return `<ul>${tasks.map((task) => `<li>${task.checked ? "☑" : "☐"} ${escapeHtml(task.text)}</li>`).join("")}</ul>`;
    }
    case "image": {
      const imgAttrs = attrs as unknown as ImageBlockAttrs;
      const alt = imgAttrs.alt ? escapeHtml(imgAttrs.alt) : "";
      const caption = imgAttrs.caption ? `<figcaption>${escapeHtml(imgAttrs.caption)}</figcaption>` : "";
      return `<figure><img src="${escapeHtml(imgAttrs.url)}" alt="${alt}" />${caption}</figure>`;
    }
    case "imageGrid": {
      const gridAttrs = attrs as unknown as ImageGridBlockAttrs;
      const cols = gridAttrs.columns ?? 3;
      const images = gridAttrs.images ?? [];
      const imgs = images.map((img) => `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt ?? "")}" style="width:100%" />`).join("");
      return `<div class="image-grid image-grid-${cols}" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">${imgs}</div>`;
    }
    case "video": {
      const videoAttrs = attrs as unknown as VideoBlockAttrs;
      const controls = videoAttrs.controls !== false ? "controls" : "";
      const autoplay = videoAttrs.autoplay ? "autoplay" : "";
      const loop = videoAttrs.loop ? "loop" : "";
      const muted = videoAttrs.muted ? "muted" : "";
      return `<video src="${escapeHtml(videoAttrs.url)}" ${controls} ${autoplay} ${loop} ${muted} style="width:100%"></video>`;
    }
    case "youtube": {
      const ytAttrs = attrs as unknown as EmbedBlockAttrs;
      const videoId = extractYoutubeId(ytAttrs.url);
      if (!videoId) return "";
      return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${escapeHtml(videoId)}" frameborder="0" allowfullscreen></iframe>`;
    }
    case "vimeo": {
      const vAttrs = attrs as unknown as EmbedBlockAttrs;
      const videoId = extractVimeoId(vAttrs.url);
      if (!videoId) return "";
      return `<iframe src="https://player.vimeo.com/video/${escapeHtml(videoId)}" width="100%" height="315" frameborder="0" allowfullscreen></iframe>`;
    }
    case "audio": {
      const audioAttrs = attrs as unknown as AudioBlockAttrs;
      return `<audio src="${escapeHtml(audioAttrs.url)}" controls style="width:100%"></audio>`;
    }
    case "pdf": {
      const pdfAttrs = attrs as unknown as PdfBlockAttrs;
      return `<object data="${escapeHtml(pdfAttrs.url)}" type="application/pdf" width="100%" height="${pdfAttrs.height ?? 600}"><p>PDF를 표시할 수 없습니다. <a href="${escapeHtml(pdfAttrs.url)}">여기를 클릭해 다운로드</a></p></object>`;
    }
    case "linkCard": {
      const lcAttrs = attrs as unknown as LinkCardBlockAttrs;
      return `<a href="${escapeHtml(lcAttrs.url)}" class="link-card" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(lcAttrs.customTitle ?? lcAttrs.title ?? lcAttrs.url)}</strong>${lcAttrs.description ? `<p>${escapeHtml(lcAttrs.description)}</p>` : ""}</a>`;
    }
    case "instagram":
      return `<blockquote class="instagram-embed"><a href="${escapeHtml((attrs as unknown as InstagramBlockAttrs).url)}">Instagram</a></blockquote>`;
    case "spotify":
      return `<iframe src="https://open.spotify.com/embed?url=${encodeURIComponent((attrs as unknown as SpotifyBlockAttrs).url)}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    case "googleMaps":
      return `<iframe src="${escapeHtml((attrs as unknown as GoogleMapsBlockAttrs).embedUrl)}" width="100%" height="${(attrs as unknown as GoogleMapsBlockAttrs).height ?? 350}" style="border:0" allowfullscreen loading="lazy"></iframe>`;
    case "columns2":
    case "columns3":
      return `<div class="columns-${type === "columns2" ? "2" : "3"}" style="display:grid;grid-template-columns:${type === "columns2" ? "1fr 1fr" : "1fr 1fr 1fr"};gap:16px">${((attrs.content as Block[]) ?? []).map(blockToHtml).join("")}</div>`;
    case "spacer":
      return `<div style="height:${(attrs as unknown as SpacerBlockAttrs).height ?? 32}px"></div>`;
    default:
      return "";
  }
}

/** Block 배열을 HTML 문자열로 변환 */
export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(blockToHtml).join("\n");
}

// ============================================================
// Helper Functions
// ============================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

// ============================================================
// BlockRenderer (Preview/Display용)
// ============================================================

import React from "react";

interface BlockRendererProps {
  blocks: Block[];
  /** className for container */
  className?: string;
}

/** Block 배열을 React 노드로 렌더링 */
export function BlockRenderer({ blocks, className }: BlockRendererProps) {
  return (
    <div className={className}>
      {blocks.map((block) => (
        <BlockNode key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockNode({ block }: { block: Block }) {
  const { type, attrs } = block;

  switch (type) {
    case "heading1":
      return <h1 className="font-serif text-3xl font-bold my-4">{String(attrs.text ?? "")}</h1>;
    case "heading2":
      return <h2 className="font-serif text-2xl font-bold my-3">{String(attrs.text ?? "")}</h2>;
    case "heading3":
      return <h3 className="font-serif text-xl font-bold my-2">{String(attrs.text ?? "")}</h3>;
    case "paragraph":
      return <p className="my-2 leading-relaxed">{String(attrs.text ?? "")}</p>;
    case "blockquote":
      return (
        <blockquote className="border-l-4 border-gray-400 pl-4 my-4 italic text-gray-700">
          {String(attrs.text ?? "")}
        </blockquote>
      );
    case "divider":
      return <hr className="my-6 border-gray-300" />;
    case "bulletList": {
      const items = (attrs.items as string[]) ?? [];
      return (
        <ul className="list-disc pl-6 my-2 space-y-1">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }
    case "orderedList": {
      const items = (attrs.items as string[]) ?? [];
      return (
        <ol className="list-decimal pl-6 my-2 space-y-1">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      );
    }
    case "taskList": {
      const tasks = (attrs.tasks as TaskItem[]) ?? [];
      return (
        <ul className="list-none pl-6 my-2 space-y-1">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <span>{task.checked ? "☑" : "☐"}</span>
              <span className={task.checked ? "line-through text-gray-400" : ""}>{task.text}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "image": {
      const imgAttrs = attrs as unknown as ImageBlockAttrs;
      return (
        <figure className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgAttrs.url}
            alt={imgAttrs.alt ?? ""}
            className="max-w-full rounded-md"
          />
          {imgAttrs.caption && (
            <figcaption className="text-sm text-gray-500 text-center mt-1">
              {imgAttrs.caption}
            </figcaption>
          )}
        </figure>
      );
    }
    case "imageGrid": {
      const gridAttrs = attrs as unknown as ImageGridBlockAttrs;
      const cols = gridAttrs.columns ?? 3;
      return (
        <div
          className="my-4 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {(gridAttrs.images ?? []).map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img.url}
              alt={img.alt ?? ""}
              className="w-full rounded-md"
            />
          ))}
        </div>
      );
    }
    case "video": {
      const videoAttrs = attrs as unknown as VideoBlockAttrs;
      return (
        <video
          src={videoAttrs.url}
          controls={videoAttrs.controls !== false}
          autoPlay={videoAttrs.autoplay}
          loop={videoAttrs.loop}
          muted={videoAttrs.muted}
          className="w-full my-4 rounded-md"
        />
      );
    }
    case "youtube": {
      const ytAttrs = attrs as unknown as EmbedBlockAttrs;
      const videoId = extractYoutubeId(ytAttrs.url);
      if (!videoId) return null;
      return (
        <iframe
          width="100%"
          height="315"
          src={`https://www.youtube.com/embed/${videoId}`}
          frameBorder="0"
          allowFullScreen
          className="my-4 rounded-md"
        />
      );
    }
    case "vimeo": {
      const vAttrs = attrs as unknown as EmbedBlockAttrs;
      const videoId = extractVimeoId(vAttrs.url);
      if (!videoId) return null;
      return (
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          width="100%"
          height="315"
          frameBorder="0"
          allowFullScreen
          className="my-4 rounded-md"
        />
      );
    }
    case "audio": {
      const audioAttrs = attrs as unknown as AudioBlockAttrs;
      return (
        <audio
          src={audioAttrs.url}
          controls
          autoPlay={audioAttrs.autoplay}
          loop={audioAttrs.loop}
          className="w-full my-4"
        />
      );
    }
    case "pdf": {
      const pdfAttrs = attrs as unknown as PdfBlockAttrs;
      return (
        <object
          data={pdfAttrs.url}
          type="application/pdf"
          width="100%"
          height={pdfAttrs.height ?? 600}
          className="my-4 rounded-md border border-gray-300"
        >
          <p className="text-sm text-gray-500">
            PDF를 표시할 수 없습니다.{" "}
            <a href={pdfAttrs.url} download className="text-blue-600 underline">
              여기를 클릭해 다운로드
            </a>
          </p>
        </object>
      );
    }
    case "linkCard": {
      const lcAttrs = attrs as unknown as LinkCardBlockAttrs;
      return (
        <a
          href={lcAttrs.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-gray-300 rounded-lg p-4 my-4 hover:bg-gray-50 transition-colors"
        >
          <strong className="block">{lcAttrs.customTitle ?? lcAttrs.title ?? lcAttrs.url}</strong>
          {lcAttrs.description && (
            <p className="text-sm text-gray-600 mt-1">{lcAttrs.description}</p>
          )}
        </a>
      );
    }
    case "instagram": {
      const igAttrs = attrs as unknown as InstagramBlockAttrs;
      return (
        <blockquote className="instagram-embed my-4 border border-gray-200 rounded-lg p-4">
          <a href={igAttrs.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Instagram에서 보기
          </a>
        </blockquote>
      );
    }
    case "spotify": {
      const spAttrs = attrs as unknown as SpotifyBlockAttrs;
      return (
        <iframe
          src={`https://open.spotify.com/embed?url=${encodeURIComponent(spAttrs.url)}`}
          width="100%"
          height="80"
          frameBorder="0"
          allowTransparency
          allow="encrypted-media"
          className="my-4 rounded-md"
        />
      );
    }
    case "googleMaps": {
      const gmAttrs = attrs as unknown as GoogleMapsBlockAttrs;
      return (
        <iframe
          src={gmAttrs.embedUrl}
          width="100%"
          height={gmAttrs.height ?? 350}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          className="my-4 rounded-md"
        />
      );
    }
    case "columns2":
      return (
        <div
          className="my-4 grid grid-cols-2 gap-4"
        >
          {((attrs.content as Block[]) ?? []).map((child) => (
            <BlockNode key={child.id} block={child} />
          ))}
        </div>
      );
    case "columns3":
      return (
        <div
          className="my-4 grid grid-cols-3 gap-4"
        >
          {((attrs.content as Block[]) ?? []).map((child) => (
            <BlockNode key={child.id} block={child} />
          ))}
        </div>
      );
    case "spacer": {
      const spacerAttrs = attrs as unknown as SpacerBlockAttrs;
      return <div style={{ height: `${spacerAttrs.height ?? 32}px` }} />;
    }
    default:
      return null;
  }
}
