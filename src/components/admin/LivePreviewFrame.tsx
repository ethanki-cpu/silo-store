"use client";

// EPIC-118(사용자 지시): 기존 MobilePreviewFrame.tsx는 실제 Navbar를
// 그대로 쓰지 않고 로고+슬라이드만 손으로 흉내 낸 "가짜" 미리보기였다
// (주석에 명시돼 있었음: "정확한 픽셀 동기화보다 실시간으로 반영된다는
// 감각이 목적") — 그래서 이 화면에 새로 추가되는 설정(상단 탭 섹션
// 높이/1단·2단 위치 등)은 애초에 이 미리보기가 그릴 줄 모르는 요소라
// "설정해도 아무 변화 없다"는 신고로 이어졌다. 매번 새 설정마다 이 가짜
// 미리보기를 따라 그려주는 대신, 실제 배포되는 홈페이지("/")를 그대로
// iframe으로 띄우고 CSS transform: scale()로 축소해 PC/모바일 두 크기를
// 보여준다 — 100% 실제 렌더링이라 "미리보기에는 안 보이는데 실제로는
// 반영된 설정"이 구조적으로 생길 수 없다.
//
// HOTFIX(사용자 신고 — "홈페이지 설정관리에 프리뷰가 안 나오는데? PC와
// 모바일 버전 실시간으로 보이게 해줘"): EPIC-118 당시엔 "저장하기"를
// 눌러야만(DB에 실제로 반영된 뒤) iframe이 새로고침되는 방식이었다 —
// 이번엔 타이핑하는 즉시 반영되는 진짜 실시간 미리보기로 업그레이드.
// `overrides`를 넘기면 iframe URL에 `__adminPreview=1`을 붙이고,
// Navbar.tsx가 그 파라미터를 보고 postMessage로 오는 값을 DB 조회
// 대신 즉시 적용한다(그 파라미터가 없는 일반 방문자에게는 완전히
// no-op). iframe이 처음 로드되거나 새로고침(refreshKey 변경)될 때마다
// "ready" 메시지를 보내오면 그 시점의 최신 overrides를 보내주고, 그
// 후로도 overrides가 바뀔 때마다(=타이핑할 때마다) 다시 보낸다 — "저장
// 하기"를 누르지 않아도 실시간으로 보인다. 기존 저장 시 refreshKey로
// iframe을 통째로 새로고침하는 동작은 그대로 유지(실제 DB 반영 여부를
// 눈으로 재확인하는 "새로고침" 버튼 용도로 남겨둠).
import { useEffect, useRef } from "react";

const DEVICE_PRESETS = {
  pc: { width: 1280, height: 900, boxWidth: 420 },
  mobile: { width: 390, height: 844, boxWidth: 200 },
} as const;

const PREVIEW_MESSAGE_TYPE = "silo-admin-preview-override";
const PREVIEW_READY_TYPE = "silo-admin-preview-ready";

export function LivePreviewFrame({
  device,
  refreshKey,
  path = "/",
  overrides,
}: {
  device: keyof typeof DEVICE_PRESETS;
  refreshKey: number;
  path?: string;
  /** 저장 전, 지금 타이핑 중인 값 — 넘기면 실시간 미리보기 모드로 동작한다. */
  overrides?: Record<string, unknown>;
}) {
  const preset = DEVICE_PRESETS[device];
  const scale = preset.boxWidth / preset.width;
  const boxHeight = Math.round(preset.height * scale);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewSrc = overrides ? `${path}${path.includes("?") ? "&" : "?"}__adminPreview=1` : path;

  useEffect(() => {
    if (!overrides) return;
    function post() {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage({ type: PREVIEW_MESSAGE_TYPE, ...overrides }, window.location.origin);
    }
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if ((event.data as { type?: string } | null)?.type === PREVIEW_READY_TYPE) post();
    }
    window.addEventListener("message", handleMessage);
    // 이미 로드가 끝난 뒤(ready 신호를 놓친 뒤) overrides만 바뀐 경우
    // (타이핑 중)에도 즉시 반영되도록 매번 한 번 더 보낸다.
    post();
    return () => window.removeEventListener("message", handleMessage);
  }, [overrides]);

  return (
    <div
      className="overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm"
      style={{ width: preset.boxWidth, height: boxHeight }}
    >
      <iframe
        ref={iframeRef}
        key={refreshKey}
        src={previewSrc}
        title={`${device} 미리보기`}
        style={{
          width: preset.width,
          height: preset.height,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
