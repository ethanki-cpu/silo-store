// EPIC-065: Widget Builder — Video 위젯. shop/projects/[id]/page.tsx가
// 이미 쓰던 <video controls> 마크업을 그대로 재사용한다(새 플레이어 없음).
//
// EPIC-067-HOTFIX: url이 비어 있을 때 조용히 null을 반환하던 것을 다른
// 데이터 의존 위젯(Board/Gallery/Timeline의 EmptyBoardHint 등)과 동일하게
// 안내 placeholder로 교체 — Video는 board_id 계열이 아니라 위젯 추가 시
// 설정 화면이 자동으로 열리지 않아(AdminPageEditorPage의 needsBoard 분기),
// url을 아직 입력하지 않은 상태에서 화면에 아무 표시도 없으면 운영자가
// "위젯이 고장났다"고 오인하기 쉬웠다.
//
// EPIC-067-HOTFIX 추가: "URL을 넣었는데도 로드가 안 된다"는 실제 사례
// (`/treasures`)를 재현한 결과, 운영자가 유튜브 워치 URL
// (youtube.com/watch?v=...)을 입력했는데 `<video src>`는 미디어 파일
// URL만 재생 가능해 MEDIA_ELEMENT_ERROR로 조용히 실패하고 있었다 — Inspector
// 필드가 "영상 URL"이라고만 안내할 뿐 유튜브/비메오 링크는 안 된다는 제약을
// 알려주지 않아 운영자 입장에서는 당연히 될 거라 생각할 만한 입력이었다.
// 유튜브/비메오 URL을 감지해 <iframe> embed로, 그 외(직접 업로드한 mp4 등)는
// 기존 <video> 태그로 재생하도록 분기한다.
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id =
        u.pathname === "/watch"
          ? u.searchParams.get("v")
          : u.pathname.startsWith("/shorts/")
            ? u.pathname.split("/")[2]
            : u.pathname.startsWith("/embed/")
              ? u.pathname.split("/")[2]
              : null;
      if (!id) return null;
      const start = u.searchParams.get("t") ?? u.searchParams.get("start");
      const startSeconds = start ? parseInt(start, 10) : null;
      return `https://www.youtube.com/embed/${id}${startSeconds ? `?start=${startSeconds}` : ""}`;
    }

    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (!id) return null;
      const start = u.searchParams.get("t") ?? u.searchParams.get("start");
      const startSeconds = start ? parseInt(start, 10) : null;
      return `https://www.youtube.com/embed/${id}${startSeconds ? `?start=${startSeconds}` : ""}`;
    }

    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (!id || !/^\d+$/.test(id)) return null;
      return `https://player.vimeo.com/video/${id}`;
    }

    if (host === "player.vimeo.com") {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

export function VideoWidget({ url, caption }: { url: string; caption?: string }) {
  if (!url) {
    return (
      <p className="text-gray-400 text-sm">영상 URL이 아직 설정되지 않았어요.</p>
    );
  }

  const embedUrl = toEmbedUrl(url);

  return (
    <figure>
      {embedUrl ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <video src={url} controls className="w-full rounded-lg bg-black" />
      )}
      {caption && <figcaption className="mt-2 text-xs text-gray-500 text-center">{caption}</figcaption>}
    </figure>
  );
}
