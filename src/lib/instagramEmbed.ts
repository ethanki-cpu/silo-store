"use client";

// EPIC-079-PHASE-2 후속 핫픽스: Instagram 임베드가 항상 "차단됨" 아이콘만
// 보이던 버그의 근본 원인 — EPIC-079-PHASE-1이 도입한 직접 iframe 방식
// (`https://www.instagram.com/{p|reel|tv}/{id}/embed/captioned/`)이 실제로는
// 한 번도 동작한 적이 없었다. 그 URL의 응답 헤더를 직접 확인해보니
// `X-Frame-Options: DENY`가 박혀 있어 Instagram이 자기 자신을 그 어떤
// 사이트에도 <iframe>으로 못 넣게 명시적으로 막고 있었다(사설 iframe으로는
// 원천적으로 우회 불가). Instagram이 공식적으로 지원하는 유일한 임베드
// 방법은 `<blockquote class="instagram-media" data-instgrm-permalink="...">`
// 마크업 + `embed.js` 위젯 스크립트다(script가 내부적으로 자기만 허용된
// 방식으로 iframe을 새로 만들어 넣음) — sanitize-html이 <script> 태그
// 자체는 계속 막지만(Stored XSS 방지 원칙 유지), 저장되는 HTML에는 안전한
// blockquote 마크업만 담고, 이 위젯 스크립트는 게시글을 실제로 보여주는
// 신뢰된 코드(PostBody/BlockEditor 미리보기)에서만 한 번 전역으로 로드한다
// — 사용자가 입력한 임의의 HTML이 스크립트를 실행시킬 수 있는 경로는
// 여전히 없다.

declare global {
  interface Window {
    instgrm?: {
      Embeds?: { process: () => void };
    };
  }
}

const EMBED_SCRIPT_SRC = "https://www.instagram.com/embed.js";
let scriptLoadPromise: Promise<void> | null = null;

function loadInstagramEmbedScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.instgrm?.Embeds) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = EMBED_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

// EPIC-079-PHASE-2 후속 핫픽스 추가 조사: 공식 방식으로 바꾼 뒤에도 실제
// 브라우저에서 재현 테스트해보니(instagram.com의 oEmbed API로 "임베드 가능"
// 판정까지 받은 진짜 게시물조차) `/embed/*` 응답이 여전히
// `X-Frame-Options: DENY`를 내려보내 embed.js가 만든 iframe도 높이가 0에서
// 전혀 자라지 못하는 경우가 실제로 있었다 — Instagram 서버 쪽(특정 게시물/
// 요청 환경에 따른 정책 변경 또는 일시적 제한)의 문제로 보이며 우리 쪽
// 코드로는 근본적으로 우회할 수 없다. "아예 아무것도 안 보이는 빈 박스"보다
// "Instagram에서 보기 링크"가 항상 낫기 때문에, 처리 후 일정 시간 안에
// 실제로 높이가 자라지 않은(=로드 실패) iframe은 자동으로 링크 카드로
// 대체한다 — Instagram이 정상 응답하면 실제 임베드가, 응답을 막으면
// 깨진 빈 박스 대신 항상 클릭 가능한 링크가 보장된다.
const FALLBACK_TIMEOUT_MS = 6000;
const RENDERED_HEIGHT_THRESHOLD = 40;

function extractPermalink(el: HTMLElement): string {
  const attr = el.getAttribute("data-instgrm-permalink");
  if (attr) return attr;
  const src = (el as HTMLIFrameElement).src ?? "";
  const m = src.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/` : src;
}

function buildFallbackLink(permalink: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = permalink;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "Instagram에서 게시물 보기 ↗";
  a.style.cssText =
    "display:inline-block;padding:10px 16px;border:1px solid #dbdbdb;border-radius:8px;color:#385185;text-decoration:none;font-size:14px;";
  // EPIC-079-HOTFIX: 아래 processInstagramEmbeds()의 "이미 폴백 링크가
  // 있으면 추가하지 않고 지우기만 한다"는 중복 방지 체크가 이 함수로 만든
  // 진짜 폴백 링크만 인식하도록 하는 마커 — href만으로 판별하면
  // BlockEditor.tsx가 blockquote 안에 넣어둔 "Instagram 게시물 보기"
  // 사전 링크(embed.js가 로드되기 전까지 잠깐 보이는 장식용 앵커, href가
  // 똑같이 permalink)까지 "이미 폴백이 있다"고 오판해버린다.
  a.dataset.igFallback = "true";
  return a;
}

// 페이지 안의 `.instagram-media` blockquote를 실제 임베드로 변환(또는
// 갱신)한다 — 스크립트가 아직 없으면 로드 후 실행, 이미 있으면 즉시 실행.
// 처리 후에도 실제로 렌더링되지 않은 것은 위 이유로 링크 카드로 교체한다.
// EPIC-079-PHASE-2 후속 핫픽스 추가 조사 2: embed.js는 실패해도 blockquote를
// 그대로 두지 않고 class를 "instagram-media-registered"로 바꿔 "처리
// 시도함" 표시만 남긴 채 iframe도 안 만드는 경우가 있었다(iframe으로 전혀
// 안 바뀌므로 위 iframe 높이 체크에 안 걸림) — iframe 여부와 무관하게
// "instagram-media"가 클래스 이름에 포함된 모든 잔여 요소를 스캔한다.
export function processInstagramEmbeds(): void {
  loadInstagramEmbedScript().then(() => {
    window.instgrm?.Embeds?.process();

    setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[class*="instagram-media"]').forEach((el) => {
        const isRenderedIframe =
          el.tagName === "IFRAME" && el.getBoundingClientRect().height >= RENDERED_HEIGHT_THRESHOLD;
        if (isRenderedIframe) return;

        const permalink = extractPermalink(el);
        // embed.js가 같은 blockquote를 두 번 이상 처리 시도해(재렌더링 등)
        // 실패 잔여물이 여러 개 남는 경우가 있다 — 부모 안에 이미 이 함수가
        // 만든 폴백 링크(data-ig-fallback)가 있으면 하나 더 추가하지 않고
        // 그냥 제거만 한다(중복 버튼 방지).
        // EPIC-079-HOTFIX: 이전엔 href만으로 판별했는데, BlockEditor.tsx의
        // InstagramEmbedPreview가 blockquote 안에 넣어두는 "Instagram
        // 게시물 보기" 사전 링크(embed.js가 아직 처리 전일 때 보이는 장식용
        // 앵커, href가 똑같이 permalink)까지 "폴백이 이미 있다"고 오판해
        // 실제로 embed.js가 성공적으로 만든 <iframe>까지 이 타임아웃에서
        // 그냥 지워버리는(교체 없이 el.remove()) 진짜 버그였다 — 실제
        // MutationObserver로 재현/확인함(정상 성공한 임베드가 6초 뒤 통째로
        // 사라짐). data-ig-fallback 마커로 "진짜 폴백 링크"만 인식한다.
        const parent = el.parentElement;
        const alreadyHasFallback = parent
          ? Array.from(parent.querySelectorAll<HTMLAnchorElement>("a[data-ig-fallback='true']")).some(
              (a) => a.href === permalink,
            )
          : false;

        if (alreadyHasFallback) {
          el.remove();
        } else {
          el.replaceWith(buildFallbackLink(permalink));
        }
      });
    }, FALLBACK_TIMEOUT_MS);
  });
}
