"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { Lightbox, type LightboxImage } from "@/components/editor/Lightbox";
import { processNativeInstagramEmbeds } from "@/lib/nativeInstagramEmbed";
import { processRawHtmlEmbeds } from "@/lib/rawHtmlEmbed";
import { processGalleryCarousels } from "@/lib/galleryCarousel";
import { processPollEmbeds } from "@/lib/pollEmbed";
import { useCustomFonts } from "@/lib/useCustomFonts";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-085: Tiptap JSON 블록(posts.body_json)이 저장 시점(renderPostHtml,
// blockEditorCore.ts)에 변환된 HTML(posts.body)을 순수 읽기 전용으로
// 렌더링하는 공용 컴포넌트 — 지금까지 이 로직이 PostBody.tsx 안에만 있어
// 게시글 상세 화면 하나에서만 재사용 가능했다. 에디터 편집용 툴바/노드뷰
// 핸들러는 여기 전혀 없다(순수 읽기 뷰) — BlockEditor.tsx의 편집 NodeView와
// 완전히 분리된 코드 경로.
//
// 이 컴포넌트가 다루는 노드 타입(전부 blockEditorCore.ts의 renderHTML +
// globals.css가 이미 정의해둔 마크업/클래스를 그대로 재사용):
// - Text/Heading: 커스텀 폰트(@font-face, useCustomFonts)/색상(TextStyle+Color,
//   style="color:...")/정렬(TextAlign, style="text-align:...")/인용구(blockquote)
// - FigureImage: 에디터에서 드래그로 조절한 width가 style="width:...px"로 그대로 반영
// - Gallery: CSS scroll-snap 캐러셀(processGalleryCarousels가 화살표/점 보강)
// - Table: 반응형 가로 스크롤(globals.css `table{display:block;overflow-x:auto}`)
// - SourceAttribution: target="_blank" rel="noopener noreferrer" 출처 배지
// - Embed: YouTube/Vimeo/Maps/Spotify/Instagram — 반응형 iframe/aspect-ratio wrapper
export function UniversalBlockRenderer({
  body,
  className = "prose prose-sm max-w-none text-gray-800",
  plainTextClassName = "text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]",
}: {
  /** posts.body — 이미 renderPostHtml()로 sanitize된 HTML 문자열(레거시
   * plain-text 글은 태그가 없어 아래에서 그대로 줄바꿈만 살려 보여준다). */
  body: string;
  className?: string;
  /** Tiptap 이전(plain text) 글 렌더링용 클래스 — 호출부가 className과
   * 다른 여백/타이포그래피를 원하면 별도로 지정할 수 있다. */
  plainTextClassName?: string;
}) {
  // 에디터 툴바(BlockEditor.tsx)와 동일한 훅 — 같은 <style id="custom-fonts-style">
  // 태그를 공유해 본문에 쓰인 커스텀 폰트를 항상 최신 목록으로 주입한다.
  useCustomFonts();
  const { session } = useAuth();
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(body);
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  // dangerouslySetInnerHTML로 넣은 정적 마크업(Instagram blockquote, raw HTML
  // 임베드 placeholder, 갤러리 캐러셀)은 그 자체로는 아무 동작도 하지
  // 않으므로 — 실제 화면에 보일 때마다 여기서 활성화한다.
  useEffect(() => {
    if (!looksLikeHtml) return;
    if (body.includes('data-provider="customHtml"')) {
      processRawHtmlEmbeds();
    }
    // EPIC-143-후속(사용자 지시 — "옛 iframe이 렌더링되는 게 아니라, 실시간
    // 파싱되어 사일로 네이티브 UI로 교체돼야 한다"): 이전엔 Instagram 공식
    // embed.js가 이 blockquote를 iframe으로 부풀렸다(processInstagramEmbeds,
    // instagramEmbed.ts) — 이제 그 자리를 R2 네이티브 렌더러가 대신한다.
    // 과거에 이미 작성된 게시글도 저장된 마크업 자체는 그대로고 렌더링
    // 시점에만 교체하는 것이라, 이 한 줄만 바꾸면 기존 글도 즉시 소급 적용된다.
    if (body.includes("instagram-media")) {
      processNativeInstagramEmbeds();
    }
    if (body.includes("gallery-carousel")) {
      processGalleryCarousels();
    }
    // EPIC-096(요구사항 3.2): 인라인 설문 placeholder를 실제 투표 위젯으로.
    // session.access_token이 나중에(로그인 완료 후) 채워지면 재실행되도록
    // 의존성에 넣는다 — 처음엔 비로그인으로 그리고 로그인되면 투표 버튼이
    // 살아난다(dataset.pollInit 가드가 있어 매번 새로 fetch하진 않도록,
    // 토큰이 바뀌는 시점에만 자연히 다시 그려짐).
    if (body.includes("poll-embed")) {
      processPollEmbeds(session?.access_token ?? null);
    }
  }, [body, looksLikeHtml, session?.access_token]);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const img = target.closest("img");
    if (!img) return;

    const gallery = img.closest(".gallery");
    const scope = gallery ?? img.closest("figure") ?? img.parentElement;
    const imgs = Array.from((gallery ?? scope)?.querySelectorAll("img") ?? [img]);

    const images: LightboxImage[] = imgs.map((el) => ({
      src: el.getAttribute("src") ?? "",
      alt: el.getAttribute("alt") ?? "",
      caption: el.closest("figure")?.querySelector("figcaption")?.textContent ?? "",
    }));
    const index = Math.max(0, imgs.indexOf(img));
    setLightbox({ images, index });
  }

  if (looksLikeHtml) {
    return (
      <>
        <div
          className={className}
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
        />
        {lightbox && (
          <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
        )}
      </>
    );
  }

  return <p className={plainTextClassName}>{body}</p>;
}
