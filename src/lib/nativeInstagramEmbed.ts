"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { NativeInstagramEmbed } from "@/components/content/NativeInstagramEmbed";

// EPIC-143-후속: posts.body(raw HTML, dangerouslySetInnerHTML로 삽입)에 저장된
// 정적 Instagram blockquote 마크업은 그 자체로 아무 동작도 하지 않는다
// (galleryCarousel.ts/pollEmbed.ts와 동일한 이유) — 지금까지는
// src/lib/instagramEmbed.ts가 Instagram 공식 embed.js를 로드해 iframe으로
// 부풀렸는데, 그 자리를 이 함수가 대신한다: 같은 blockquote를 찾아 DOM에서
// 들어내고, 그 자리에 React 루트를 새로 마운트해 NativeInstagramEmbed를
// 그린다. 이 저장소의 다른 임베드 처리기들과 달리 실제 React 컴포넌트(state/
// embla 훅)가 필요해 순수 문자열 innerHTML 치환 대신 react-dom/client의
// createRoot를 쓴다 — React 18+ 공식 API로, 외부에서 관리되는 DOM 서브트리에
// React 트리를 얹는 표준적인 방법이다.
export function processNativeInstagramEmbeds(root: ParentNode = document): void {
  const matches = root.querySelectorAll<HTMLElement>(".instagram-media[data-instgrm-permalink]");
  // TEMP-DEBUG(사용자 신고 — "임베드가 안 바뀐다" 원인 규명용, 확인 후 제거 예정).
  console.log("[nativeIgDebug] processNativeInstagramEmbeds called, matches=", matches.length);
  matches.forEach((el) => {
    if (el.dataset.nativeIgInit === "true") {
      console.log("[nativeIgDebug] already init, skipping");
      return;
    }
    el.dataset.nativeIgInit = "true";

    const permalink = el.getAttribute("data-instgrm-permalink");
    console.log("[nativeIgDebug] permalink=", permalink);
    if (!permalink) return;

    const mount = document.createElement("div");
    mount.className = "native-instagram-embed-mount";
    el.replaceWith(mount);
    console.log("[nativeIgDebug] replaced blockquote with mount div");

    try {
      createRoot(mount).render(createElement(NativeInstagramEmbed, { permalink }));
      console.log("[nativeIgDebug] createRoot().render() called without throwing");
    } catch (e) {
      console.error("[nativeIgDebug] createRoot/render threw:", e);
    }
  });
}
