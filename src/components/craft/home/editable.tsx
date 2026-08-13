"use client";

// EPIC-098: 홈페이지 Craft.js 블록들이 공유하는 "더블클릭으로 텍스트/이미지
// 수정" 원시 컴포넌트. EditableText/EditableImage/EditableResponsiveImage는
// Craft.js의 노드 시스템에 묶이지 않는다 — 각 블록(EditorialHeroBlock 등)이
// useNode()로 자기 props를 읽고 setProp으로 커밋하는 콜백을 여기 내려주기만
// 하면 되므로, "지금 에디터가 편집 가능 상태인가"만 useEditor로 확인한다.
// EPIC-099(항목 2)부터는 EditableBlockFrame이 복제/삭제/드래그 컨트롤을
// 위해 useNode()도 직접 부른다(아래 해당 함수 주석 참고).
import { useEditor, useNode } from "@craftjs/core";
import { createElement, useState, type ReactNode } from "react";
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

// EPIC-100(항목 2, LCP 최적화): 화면 최상단 히어로 이미지만 `priority`를
// true로 넘긴다 — 그 이미지는 lazy 로딩을 걸면 오히려 LCP가 늦어지므로
// `fetchPriority="high"` + `loading="eager"`(기본값과 같지만 명시)로 우선
// 로드하고, 스크롤을 내려야 보이는 나머지 전부(Grid/Directory/Spotlight 등)는
// `loading="lazy" decoding="async"`로 초기 로딩 비용에서 제외한다.
function imgLoadingProps(priority: boolean) {
  return priority
    ? { loading: "eager" as const, fetchPriority: "high" as const, decoding: "async" as const }
    : { loading: "lazy" as const, decoding: "async" as const };
}

export function EditableImage({
  src,
  onCommit,
  alt = "",
  className,
  uploadFolder = "craft-home",
  priority = false,
}: {
  src: string;
  onCommit: (nextUrl: string) => void;
  alt?: string;
  className?: string;
  uploadFolder?: string;
  priority?: boolean;
}) {
  const editable = useCraftEditable();
  const [uploading, setUploading] = useState(false);
  const loadingProps = imgLoadingProps(priority);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadFile(file, "post-images", uploadFolder);
    setUploading(false);
    if (!error && url) onCommit(url);
  }

  if (!editable) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} {...loadingProps} />;
  }

  return (
    <label className={`group relative block cursor-pointer ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" {...loadingProps} />
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
  priority = false,
}: {
  srcDesktop: string;
  srcMobile?: string;
  onCommitDesktop: (nextUrl: string) => void;
  onCommitMobile: (nextUrl: string) => void;
  alt?: string;
  className?: string;
  uploadFolder?: string;
  priority?: boolean;
}) {
  const editable = useCraftEditable();
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const loadingProps = imgLoadingProps(priority);

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
        <img src={srcDesktop} alt={alt} className={className} {...loadingProps} />
      </picture>
    );
  }

  return (
    <div className={`group relative block ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={srcDesktop} alt={alt} className="h-full w-full object-cover" {...loadingProps} />
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

// EPIC-099(항목 2, "Toolbox UI"): 편집 모드일 때 블록 전체에 얇은 점선
// 테두리를 두르고, 우측 상단에 드래그 핸들/복제/삭제 컨트롤을 얹는다.
// useNode()는 이 컴포넌트가 직접 Craft 노드가 아니어도(그냥 각 블록이 자기
// render 안에서 부르는 평범한 자식 컴포넌트) 그 블록의 노드 컨텍스트를
// 그대로 물려받아 동작한다 — Craft가 유저 컴포넌트 렌더 트리 전체를 하나의
// NodeContext로 감싸기 때문에, 6개 블록 파일을 전혀 건드리지 않고 이 파일
// 하나만 고쳐서 전 블록에 새 컨트롤을 배선할 수 있었다. "정해진 6종 안에서만
// 복제/삭제/순서 변경"이라는 스코프 그대로 — 새로운 블록 "종류"를 즉석에서
// 만들 수 있는 자유 캔버스/컴포넌트 팔레트는 여기 없다(그건
// CraftHomeEditor.tsx의 "+ 섹션 추가" 버튼이 정해진 6종 목록으로만 제공).
export function EditableBlockFrame({ children, label }: { children: ReactNode; label: string }) {
  const editable = useCraftEditable();
  const {
    id,
    connectors: { drag },
  } = useNode();
  const { actions, query } = useEditor();

  if (!editable) return <>{children}</>;

  function handleDuplicate() {
    const node = query.node(id).get();
    const parentId = node.data.parent;
    if (!parentId) return;
    const parentNode = query.node(parentId).get();
    const index = parentNode.data.nodes.indexOf(id);
    // 버그 수정: `query.node(id).toNodeTree()`는 원본과 "같은 id"를 그대로
    // 들고 있는 트리를 반환한다 — addNodeTree에 그대로 넘기면 같은 id를 가진
    // 노드 두 개가 내부 노드 맵에 동시에 존재하게 돼(ERROR_DUPLICATE_NODEID가
    // craft.js에 있는 이유), 겉보기엔 복제가 성공한 것처럼 보여도 이후
    // 아무 노드나 삭제하는 순간 "Cannot read properties of undefined
    // (reading 'children')"로 전체 렌더 트리가 깨지는 걸 로컬에서 재현
    // 확인했다. `query.parseReactElement()`는 새 React element로부터
    // "새 id"를 발급하는 API(+ 섹션 추가와 동일 경로)라 이걸로 우회한다 —
    // 지금 편집된 라이브 props(node.data.props)를 그대로 복사해 새 노드를 만든다.
    const element = createElement(node.data.type as React.ElementType, node.data.props);
    const tree = query.parseReactElement(element).toNodeTree();
    actions.addNodeTree(tree, parentId, index + 1);
  }

  function handleDelete() {
    actions.delete(id);
  }

  return (
    <div className="group/block relative">
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover/block:opacity-100">
        <span className="rounded bg-gray-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
          {label}
        </span>
        <button
          ref={(dom) => { if (dom) drag(dom); }}
          type="button"
          title="드래그해서 순서 변경"
          className="pointer-events-auto cursor-grab rounded bg-gray-900/80 px-1.5 py-0.5 text-xs text-white hover:bg-gray-700"
        >
          ⠿
        </button>
        <button
          type="button"
          title="이 섹션 복제"
          onClick={handleDuplicate}
          className="pointer-events-auto rounded bg-gray-900/80 px-1.5 py-0.5 text-xs text-white hover:bg-gray-700"
        >
          ⧉
        </button>
        <button
          type="button"
          title="이 섹션 삭제"
          onClick={handleDelete}
          className="pointer-events-auto rounded bg-gray-900/80 px-1.5 py-0.5 text-xs text-white hover:bg-red-600"
        >
          🗑
        </button>
      </div>
      <div className="outline-dashed outline-1 outline-gray-300 outline-offset-[-1px]">{children}</div>
    </div>
  );
}
