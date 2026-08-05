"use client";

import { sanitizeHtml } from "./sanitize";

// EPIC-079-PHASE-4: Tiptap의 renderHTML(DOMOutputSpec)은 문자열 children을
// 항상 escape하므로, 사용자가 붙여넣은 임베드 HTML을 그대로 저장/렌더링할
// 방법이 없다(blockEditorCore.ts의 customHtml renderHTML 참고) — 대신
// 원본을 wrapper div의 data-raw-html 속성(자동 escape/unescape되는 표준
// 어트리뷰트라 안전하게 round-trip됨)에 실어 보내고, 게시글이 실제로 보이는
// 화면(PostBody/BlockEditor 미리보기)에서 이 함수가 그 속성을 읽어 안의
// placeholder div에 주입한다. body_json→HTML 변환 시점(renderPostHtml)에
// 이미 한 번 sanitize된 값이지만, 실제로 DOM에 주입되는(=스크립트가 실행될
// 수 있는) 이 시점에서 다시 한 번 sanitizeHtml을 거쳐 이중으로 방어한다.
export function processRawHtmlEmbeds(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('div[data-provider="customHtml"][data-raw-html]').forEach((wrapper) => {
    const target = wrapper.querySelector<HTMLElement>("[data-raw-html-embed]");
    if (!target || target.dataset.injected === "true") return;
    target.innerHTML = sanitizeHtml(wrapper.getAttribute("data-raw-html") ?? "");
    target.dataset.injected = "true";
  });
}
