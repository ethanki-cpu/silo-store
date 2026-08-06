import type { JSONContent } from "@tiptap/core";
import { findFeaturedImage, findFirstImage } from "@/lib/blockEditorCore";

const MAX_DESCRIPTION_LENGTH = 120;

// EPIC-085: Dynamic SEO/OG 파이프라인 — 게시글 body_json에서 description/
// ogImage를 뽑아낸다. 이미지 쪽은 이미 blockEditorCore.ts에 있던
// findFeaturedImage()/findFirstImage()(★ 대표 이미지 지정 + 폴백 로직,
// EPIC-079-HOTFIX-3/PHASE-5)를 그대로 재사용한다 — "본문 내 첫 번째 이미지
// 또는 갤러리 첫 슬라이드"라는 이번 요구사항과 findFirstImage()의 동작이
// 정확히 같아서 새로 만들 이유가 없다.

/** 문서에서 텍스트가 있는 첫 번째 paragraph 노드의 텍스트만 뽑는다(제목/캡션 등은 제외). */
function extractFirstParagraphText(json: JSONContent | null | undefined): string | null {
  if (!json) return null;

  function collectText(node: JSONContent): string {
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(collectText).join("");
  }

  function walk(node: JSONContent): string | null {
    if (node.type === "paragraph") {
      const text = collectText(node).trim();
      if (text) return text;
      // 빈 paragraph(빈 줄)는 건너뛰고 다음 형제로 계속 찾는다.
    }
    for (const child of node.content ?? []) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }

  return walk(json);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export type ExtractedPostMetadata = {
  description: string;
  /** 찾은 이미지가 없으면 undefined — 존재하지 않는 기본 이미지 경로를
   * 지어내지 않는다(깨진 og:image보다 아예 없는 편이 낫다). */
  ogImage?: string;
};

export function extractPostMetadata(
  bodyJson: JSONContent | null | undefined,
  options?: { fallbackDescription?: string; fallbackImage?: string | null },
): ExtractedPostMetadata {
  const rawDescription = extractFirstParagraphText(bodyJson);
  const description = rawDescription
    ? truncate(rawDescription, MAX_DESCRIPTION_LENGTH)
    : (options?.fallbackDescription ??
        "사일로 스토어 — 멤버십 기반 커뮤니티 플랫폼. 사일로상점(물품 소매/대여), 살롱데상(클럽 모임·게시판·살롱 공간), 스튜디오(공간 대관)를 함께 제공합니다.");

  const ogImage =
    findFeaturedImage(bodyJson)?.url ?? findFirstImage(bodyJson) ?? options?.fallbackImage ?? undefined;

  return { description, ogImage: ogImage ?? undefined };
}
