"use client";

// EPIC-134(사용자 지시 — "GrapesJS를 도입하여... 밑바닥부터 새로 구축하라"):
// 기존 Craft.js 기반 "상단 탭 디자인"/"사용자 메뉴 디자인" 두 탭을 대체하는
// 통합 헤더 캔버스 에디터. GrapesJS는 순수 vanilla-JS 라이브러리라(React
// 컴포넌트가 아님) 이 컴포넌트가 유일하게 하는 일은: (1) 컨테이너 ref에
// `grapesjs.init()`으로 마운트하고 언마운트 시 `editor.destroy()`로 정리,
// (2) 두 가지 커스텀 컴포넌트 타입("header-item" 칩, "header-row" 캔버스)
// 만 등록해 캔버스에서 만들 수 있는 것을 그 둘로 제한 — 임의 HTML을
// 자유롭게 그리는 범용 페이지 빌더가 아니라 "탭/메뉴 항목의 순서와 부가
// 스타일만 정하는" 제한된 구조적 에디터로 설계했다. 그래야 저장 시
// 캔버스의 컴포넌트 트리를 곧바로 HeaderLayoutItem[]로 직렬화할 수 있고,
// Navbar.tsx(실제 사이트 헤더)가 이 목록의 순서/refId만 읽어 자신의 기존
// renderTab()/계정 메뉴 렌더링을 그대로 재사용해 그릴 수 있다 — GrapesJS가
// 만든 raw HTML을 사이트에 직접 주입하지 않으므로 로그인 상태 게이팅/
// 드롭다운/메가메뉴/모바일 반응형 같은 실제 동작이 전혀 깨지지 않는다.
import { useEffect, useRef, useState } from "react";
import type { Editor } from "grapesjs";
import {
  HEADER_MENU_ITEM_KEYS,
  HEADER_MENU_ITEM_LABELS,
  type HeaderLayoutItem,
  type HeaderLayoutItemStyle,
} from "@/lib/headerLayoutSettings";

function itemStyleAttr(style?: HeaderLayoutItemStyle): string {
  return [
    style?.fontSizePx ? `font-size:${style.fontSizePx}px;` : "",
    style?.color ? `color:${style.color};` : "",
    style?.bold ? `font-weight:bold;` : "",
    style?.marginLeftPx ? `margin-left:${style.marginLeftPx}px;` : "",
    style?.marginRightPx ? `margin-right:${style.marginRightPx}px;` : "",
  ].join("");
}

function headerItemHtml(type: "tab" | "menu", refId: string, label: string, style?: HeaderLayoutItemStyle): string {
  return `<span data-header-item="true" data-item-type="${type}" data-ref-id="${refId}" class="header-item-chip" style="${itemStyleAttr(
    style,
  )}">${label}</span>`;
}

const CANVAS_CSS = `
  [data-header-row] { display:flex; flex-wrap:wrap; align-items:center; gap:8px; min-height:56px; padding:14px; border:1px dashed #94a3b8; border-radius:8px; background:#f8fafc; }
  .header-item-chip { display:inline-flex; align-items:center; padding:6px 12px; border-radius:6px; background:#fff; border:1px solid #cbd5e1; font-size:13px; cursor:move; user-select:none; }
  .header-item-chip[data-item-type="menu"] { background:#eef2ff; border-color:#c7d2fe; }
  body { font-family: sans-serif; }
`;

export type HeaderTabRef = { key: string; label: string };

export function HeaderGrapesEditor({
  tabs,
  initialItems,
  onSave,
  saving,
  savedMessage,
}: {
  tabs: HeaderTabRef[];
  initialItems: HeaderLayoutItem[];
  onSave: (items: HeaderLayoutItem[]) => void;
  saving: boolean;
  savedMessage: string | null;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const blocksRef = useRef<HTMLDivElement | null>(null);
  const stylesRef = useRef<HTMLDivElement | null>(null);
  const layersRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [ready, setReady] = useState(false);

  // tabs/initialItems는 최초 마운트 시점의 값만 캔버스 시드로 쓴다(이후
  // 부모가 리렌더돼 새 배열 인스턴스를 넘겨도 캔버스를 다시 그리면 진행
  // 중이던 편집이 날아가므로) — 그래서 deps를 의도적으로 비워 마운트에만
  // 실행한다. 이 컴포넌트는 부모(admin 설정 페이지)가 topNavRows/
  // headerLayoutValue를 이미 다 불러온 뒤에만 렌더하므로, 최초 렌더 시점의
  // tabs/initialItems는 항상 최종 값이다(로딩 중 빈 배열로 시드될 걱정 없음).
  useEffect(() => {
    let cancelled = false;
    let createdEditor: Editor | null = null;
    const seedTabs = tabs;
    const seedItems = initialItems;

    import("grapesjs").then(({ default: grapesjs }) => {
      if (cancelled || !canvasRef.current) return;

      const labelByRef = new Map<string, string>();
      seedTabs.forEach((t) => labelByRef.set(`tab:${t.key}`, t.label));
      HEADER_MENU_ITEM_KEYS.forEach((k) => labelByRef.set(`menu:${k}`, HEADER_MENU_ITEM_LABELS[k]));

      const editor = grapesjs.init({
        container: canvasRef.current,
        height: "460px",
        width: "100%",
        fromElement: false,
        storageManager: false,
        blockManager: { appendTo: blocksRef.current ?? undefined },
        layerManager: { appendTo: layersRef.current ?? undefined },
        styleManager: {
          appendTo: stylesRef.current ?? undefined,
          sectors: [
            { id: "text", name: "텍스트", open: true, properties: ["color", "font-size", "font-weight"] },
            { id: "spacing", name: "여백", open: true, properties: ["margin-left", "margin-right"] },
          ],
        },
        panels: { defaults: [] },
      });

      editor.DomComponents.addType("header-item", {
        isComponent: (el) => (el.getAttribute && el.getAttribute("data-header-item") === "true" ? {} : false),
        model: {
          defaults: {
            tagName: "span",
            name: "항목",
            draggable: "[data-header-row]",
            droppable: false,
            editable: false,
            removable: true,
            copyable: false,
            stylable: ["color", "font-size", "font-weight", "margin-left", "margin-right"],
          },
        },
      });

      editor.DomComponents.addType("header-row", {
        isComponent: (el) => (el.getAttribute && el.getAttribute("data-header-row") === "true" ? {} : false),
        model: {
          defaults: {
            tagName: "div",
            name: "헤더 행",
            draggable: false,
            droppable: "[data-header-item]",
            removable: false,
            copyable: false,
            stylable: false,
          },
        },
      });

      editor.addStyle(CANVAS_CSS);

      const rowHtml = `<div data-header-row="true">${seedItems
        .map((it) => headerItemHtml(it.type, it.refId, labelByRef.get(`${it.type}:${it.refId}`) ?? it.refId, it.style))
        .join("")}</div>`;
      editor.setComponents(rowHtml);

      seedTabs.forEach((tab) => {
        editor.BlockManager.add(`tab-${tab.key}`, {
          label: tab.label,
          category: "상단 탭",
          content: headerItemHtml("tab", tab.key, tab.label),
        });
      });
      HEADER_MENU_ITEM_KEYS.forEach((key) => {
        editor.BlockManager.add(`menu-${key}`, {
          label: HEADER_MENU_ITEM_LABELS[key],
          category: "사용자 메뉴",
          content: headerItemHtml("menu", key, HEADER_MENU_ITEM_LABELS[key]),
        });
      });

      createdEditor = editor;
      editorRef.current = editor;
      setReady(true);
    });

    return () => {
      cancelled = true;
      createdEditor?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaveClick() {
    const editor = editorRef.current;
    if (!editor) return;
    const row = editor.getWrapper()?.find("[data-header-row]")[0];
    const children = row?.components().models ?? [];
    const items: HeaderLayoutItem[] = children
      .map((comp, i) => {
        const attrs = comp.getAttributes();
        const type: "tab" | "menu" = attrs["data-item-type"] === "menu" ? "menu" : "tab";
        const refId = typeof attrs["data-ref-id"] === "string" ? attrs["data-ref-id"] : "";
        const styleObj = comp.getStyle();
        const style: HeaderLayoutItemStyle = {};
        if (typeof styleObj.color === "string") style.color = styleObj.color;
        if (typeof styleObj["font-size"] === "string") {
          const n = parseInt(styleObj["font-size"], 10);
          if (!Number.isNaN(n)) style.fontSizePx = n;
        }
        if (styleObj["font-weight"] === "bold") style.bold = true;
        if (typeof styleObj["margin-left"] === "string") {
          const n = parseInt(styleObj["margin-left"], 10);
          if (!Number.isNaN(n)) style.marginLeftPx = n;
        }
        if (typeof styleObj["margin-right"] === "string") {
          const n = parseInt(styleObj["margin-right"], 10);
          if (!Number.isNaN(n)) style.marginRightPx = n;
        }
        return {
          id: comp.getId() || `item-${i}`,
          type,
          refId,
          style: Object.keys(style).length > 0 ? style : undefined,
        };
      })
      .filter((it) => it.refId);
    onSave(items);
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500">
          왼쪽 블록을 캔버스로 끌어다 놓아 상단 탭과 사용자 메뉴 항목의 순서를 자유롭게 섞어 배치하세요. 캔버스에서
          항목을 클릭하면 오른쪽 스타일 패널에서 색상/크기/여백을 바꿀 수 있어요.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {savedMessage && <span className="text-xs text-green-700">{savedMessage}</span>}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving || !ready}
            className="rounded-md bg-gray-800 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
      <div className="flex" style={{ minHeight: 460 }}>
        <div className="w-56 shrink-0 overflow-y-auto border-r border-gray-200">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">블록</div>
          <div ref={blocksRef} />
          <div className="border-b border-t border-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">레이어</div>
          <div ref={layersRef} />
        </div>
        <div className="min-w-0 flex-1" ref={canvasRef} />
        <div className="w-64 shrink-0 overflow-y-auto border-l border-gray-200">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">스타일</div>
          <div ref={stylesRef} />
        </div>
      </div>
    </div>
  );
}
