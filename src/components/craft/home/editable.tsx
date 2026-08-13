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

// EPIC-098 후속(사용자 지시): 기존 히어로 슬라이드쇼(HeroSlideshow.tsx,
// EPIC-092/094)처럼 PC/모바일용 이미지를 따로 둘 수 있게 한다. 그쪽은 부모가
// PC/모바일 두 인스턴스를 각각 mount하고 <picture>로 "반대쪽 기기에는 투명
// 픽셀만" 트릭을 썼지만, 여기는 애초에 desktop/mobile URL을 한 컴포넌트가
// 동시에 알고 있어 더 간단하다 — <source media>가 모바일 뷰포트에서 모바일
// 파일을, 그 외엔 <img src>(데스크톱 파일)를 그대로 받는다. 모바일 URL이
// 없으면(기본값) source 자체를 안 그려 데스크톱 파일 하나로 자연히 폴백.
const MOBILE_MEDIA_QUERY = "(max-width: 767px)"; // Tailwind md 브레이크포인트와 동일

export function EditableResponsiveImage({
  srcDesktop,
  srcMobile,
  onCommitDesktop,
  onCommitMobile,
  alt = "",
  className,
  uploadFolder = "craft-home",
}: {
  srcDesktop: string;
  srcMobile?: string;
  onCommitDesktop: (nextUrl: string) => void;
  onCommitMobile: (nextUrl: string) => void;
  alt?: string;
  className?: string;
  uploadFolder?: string;
}) {
  const editable = useCraftEditable();
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  async function handleFile(file: File | null, target: "desktop" | "mobile") {
    if (!file) return;
    const setUploading = target === "desktop" ? setUploadingDesktop : setUploadingMobile;
    setUploading(true);
    const { url, error } = await uploadFile(file, "post-images", uploadFolder);
    setUploading(false);
    if (error || !url) return;
    if (target === "desktop") onCommitDesktop(url);
    else onCommitMobile(url);
  }

  if (!editable) {
    return (
      <picture>
        {srcMobile && <source media={MOBILE_MEDIA_QUERY} srcSet={srcMobile} />}
        <img src={srcDesktop} alt={alt} className={className} />
      </picture>
    );
  }

  return (
    <div className={`group relative block ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={srcDesktop} alt={alt} className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
        <label className="cursor-pointer rounded bg-white/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-900">
          {uploadingDesktop ? "업로드 중..." : "PC 이미지 변경"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null, "desktop")}
          />
        </label>
        <label className="cursor-pointer rounded bg-white/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-900">
          {uploadingMobile ? "업로드 중..." : srcMobile ? "모바일 이미지 변경" : "모바일 이미지 추가"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null, "mobile")}
          />
        </label>
      </div>
    </div>
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
