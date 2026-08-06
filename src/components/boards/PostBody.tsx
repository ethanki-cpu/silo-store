"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { Lightbox, type LightboxImage } from "@/components/editor/Lightbox";
import { processInstagramEmbeds } from "@/lib/instagramEmbed";
import { processRawHtmlEmbeds } from "@/lib/rawHtmlEmbed";
import { processGalleryCarousels } from "@/lib/galleryCarousel";

// EPIC-079-HOTFIX-3: 대표 이미지가 상세 헤더(PostDetailHeader의 photoUrl)
// 위쪽에 한 번, 그리고 사용자가 붙여넣은/업로드한 그 이미지가 본문 안에
// 또 한 번 — 똑같은 사진이 화면에 두 번 나오는 문제 신고 — 대표 이미지로
// "지정"되는 것 자체는 유지하되(신고에서도 이건 원한 동작이라고 명시),
// 헤더에 이미 보여준 바로 그 이미지 인스턴스만 본문에서 제외한다(같은
// URL이 본문에 또 나오면 그건 남긴다 — 사용자가 의도적으로 여러 번 쓴
// 것일 수 있으므로 첫 매치 하나만 제거).
function stripDuplicateFeaturedImage(html: string, featuredImageUrl: string | null): string {
  if (!featuredImageUrl || typeof window === "undefined") return html;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const img = Array.from(doc.querySelectorAll("img")).find((el) => el.getAttribute("src") === featuredImageUrl);
    if (!img) return html;
    // figure/figcaption까지 통째로 제거해야 캡션만 덩그러니 남지 않는다.
    const figure = img.closest("figure");
    (figure ?? img).remove();
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

// EPIC-052: Tiptap Block Editor 도입 이전 글(plain text)과 이후 글(HTML)이
// 같은 posts.body 컬럼에 섞여 있어, 태그 포함 여부로 렌더링 방식을
// 나눈다 — HTML이면 정제 후 렌더링(서버에서 이미 한 번 정제했지만,
// 이중 방어), 아니면 기존처럼 줄바꿈만 살려 보여준다.
//
// EPIC-053.1: 본문 안의 이미지(figure)/갤러리(.gallery) 클릭 시 에디터와
// 동일한 Lightbox를 띄운다 — dangerouslySetInnerHTML로 삽입된 raw HTML도
// 이벤트 버블링을 타고 올라오므로, 감싼 div에 delegated click 핸들러
// 하나만 달면 별도 하이드레이션 없이 동작한다.
export function PostBody({
  body,
  featuredImageUrl = null,
}: {
  body: string;
  /** 상세 헤더에 이미 보여준 대표 이미지 URL — 지정하면 본문에서 같은
   * 이미지 한 장(첫 매치)을 제거해 중복 표시를 막는다. */
  featuredImageUrl?: string | null;
}) {
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(body);
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);
  const dedupedBody = useMemo(
    () => (looksLikeHtml ? stripDuplicateFeaturedImage(body, featuredImageUrl) : body),
    [body, looksLikeHtml, featuredImageUrl],
  );

  // EPIC-079-PHASE-2 후속 핫픽스: 본문에 Instagram blockquote가 있으면
  // embed.js를 로드해 실제 임베드로 바꿔치기한다 — dangerouslySetInnerHTML로
  // 넣은 정적 HTML은 그 자체로는 아무것도 렌더링하지 않는 빈 blockquote일
  // 뿐이라 이 처리가 없으면 아무것도 안 보인다(src/lib/instagramEmbed.ts).
  // EPIC-079-PHASE-4: customHtml(rawHtml) 임베드를 먼저 실제 DOM에
  // 주입한 다음(instagramEmbed.ts와 동일하게 dangerouslySetInnerHTML로
  // 넣은 정적 마크업은 그 자체로 아무것도 렌더링하지 않음) instagram
  // 위젯을 처리한다 — 순서가 중요: 사용자가 raw HTML로 Instagram 공식
  // embed 코드를 붙여넣은 경우, 그 blockquote가 DOM에 존재해야
  // processInstagramEmbeds가 찾아낼 수 있다.
  useEffect(() => {
    if (!looksLikeHtml) return;
    if (body.includes('data-provider="customHtml"')) {
      processRawHtmlEmbeds();
    }
    if (body.includes("instagram-media")) {
      processInstagramEmbeds();
    }
    if (body.includes("gallery-carousel")) {
      processGalleryCarousels();
    }
  }, [body, looksLikeHtml]);

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
          className="prose prose-sm max-w-none mt-8 text-gray-800"
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(dedupedBody) }}
        />
        {lightbox && (
          <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
        )}
      </>
    );
  }

  return (
    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mt-8 text-[15px]">
      {body}
    </p>
  );
}
