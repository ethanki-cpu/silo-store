"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { NativeInstagramEmbed } from "@/components/content/NativeInstagramEmbed";
import { AuthProvider } from "@/lib/AuthProvider";

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
//
// HOTFIX(실사용 테스트로 재현 — 최초 마운트 시 정상 치환됐다가, 잠시 뒤
// 원래 blockquote로 되돌아가는 현상 확인): 최초 1회 스캔만으로는
// 불안정하다 — 이 페이지가 하이드레이션 이후 한 번 더(정확한 트리거는
// 특정 못함, RSC 스트리밍/라우터 캐시 관련 재도색으로 추정) prose
// 컨테이너의 innerHTML을 다시 그리는 경우가 실측으로 확인됐는데, 그때는
// dangerouslySetInnerHTML의 __html 문자열 값 자체가 바뀌지 않아 React
// 리렌더 경로로는 감지가 안 되고, 내가 만든 mount div만 통째로 사라지고
// 원본 blockquote가 되돌아온다. 원인을 한 곳으로 못 좁혀 근본 차단
// 대신, MutationObserver로 컨테이너를 계속 지켜보다가 처리 안 된
// blockquote가 (다시) 나타날 때마다 즉시 재처리하는 방식으로 우회한다 —
// 몇 번을 다시 그려도 매번 즉시 따라잡아 사용자 눈에는 항상 네이티브로
// 보인다.
function scan(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(".instagram-media[data-instgrm-permalink]").forEach((el) => {
    if (el.dataset.nativeIgInit === "true") return;
    el.dataset.nativeIgInit = "true";

    const permalink = el.getAttribute("data-instgrm-permalink");
    if (!permalink) return;

    const mount = document.createElement("div");
    mount.className = "native-instagram-embed-mount";
    el.replaceWith(mount);

    // HOTFIX(실사용 재현 — "로딩에서 영원히 멈춘다"/"로그인해도 401"):
    // createRoot()는 앱의 메인 React 트리와 완전히 분리된 새 트리를 만든다
    // — Context는 트리를 넘어 전달되지 않으므로, 이 안에서 useAuth()를
    // 부르는 InstagramMediaSlider는 실제 <AuthProvider>를 조상으로 만나지
    // 못하고 항상 createContext()의 기본값(loading:true, session:null)만
    // 본다. 이 기본값 때문에 로그인 여부와 무관하게 매번 401이 나거나
    // (loading을 기다리지 않던 이전 버전), loading이 영원히 true라 요청 자체가
    // 안 나가거나(loading을 기다리게 고친 버전) 했다 — 두 증상 다 같은
    // "이 트리엔 진짜 AuthProvider가 없다"는 원인의 다른 얼굴이었다. 이
    // 트리 전용으로 AuthProvider를 다시 한번 감싸 자체적으로 세션을
    // 확인하게 한다(같은 supabase 세션을 다시 읽으므로 별도 로그인 없이도
    // 정확한 로그인 상태를 얻는다 — 페이지에 임베드가 여러 개면 그만큼
    // 중복 확인이 발생하지만, 보통 게시글당 임베드가 많지 않아 감수할
    // 만하다).
    createRoot(mount).render(
      createElement(AuthProvider, null, createElement(NativeInstagramEmbed, { permalink })),
    );
  });
}

/**
 * root(기본 document)를 즉시 한 번 스캔하고, 이후로도 MutationObserver로
 * 계속 지켜보며 처리 안 된 blockquote가 나타날 때마다 재처리한다.
 * 반환하는 함수를 호출하면 감시를 멈춘다(컴포넌트 unmount 시 정리용).
 */
export function processNativeInstagramEmbeds(root: ParentNode = document): () => void {
  scan(root);

  const target = root instanceof Element ? root : document.body;
  const observer = new MutationObserver(() => scan(root));
  observer.observe(target, { childList: true, subtree: true });

  return () => observer.disconnect();
}
