"use client";

import { useMemo } from "react";
import { UniversalBlockRenderer } from "@/components/content/UniversalBlockRenderer";

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

// EPIC-085: 실제 읽기 전용 렌더링(sanitize/커스텀 폰트/갤러리 캐러셀/
// Instagram·raw HTML 임베드/Lightbox)은 여러 화면에서 재사용 가능하도록
// UniversalBlockRenderer로 옮겼다 — 이 컴포넌트는 게시글 상세 페이지에서만
// 필요한 관심사(대표 이미지 본문 중복 제거, 레거시 plain-text 글 판별)만
// 얹는 얇은 래퍼로 남는다.
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
  const dedupedBody = useMemo(
    () => (looksLikeHtml ? stripDuplicateFeaturedImage(body, featuredImageUrl) : body),
    [body, looksLikeHtml, featuredImageUrl],
  );

  return (
    <UniversalBlockRenderer
      body={dedupedBody}
      className="prose prose-sm max-w-none mt-8 text-gray-800"
      plainTextClassName="text-gray-800 leading-relaxed whitespace-pre-wrap mt-8 text-[15px]"
    />
  );
}
