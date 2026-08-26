// HOTFIX-143.5(사용자 신고 — 바로크 Act 1/2, 아르데코 Gertrude Lawrence 게시글의
// 인스타그램 캐러셀에서 일부 항목이 통째로 사라짐): src/app/api/instagram/
// fetch/route.ts가 캐러셀 자식(children) 하나하나를 Graph API의
// `children{id,media_type,media_url,thumbnail_url}` 서브필드 한 번으로 같이
// 받아왔는데, 실사용 데이터로 확인해보니 이 서브필드 응답이 특정 자식(특히
// VIDEO)의 media_url을 아예 비워서 내려주는 경우가 있다 — 기존 코드는
// media_url이 없으면 그 자식을 통째로 건너뛰어(continue) 캐러셀에서 사진/
// 영상 한 장이 완전히 사라졌다(순서도 밀림). 이 헬퍼는 그 자식 노드를 다시
// 단독으로 조회해(`GET /{child-id}?fields=...`) 진짜 media_url을 얻어내고,
// 그마저 실패하면 thumbnail_url이라도 정지 이미지로 대체해 최소한 아무것도
// 사라지지 않게 한다.
export const GRAPH_API_VERSION = "v21.0";

export type IgChild = {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  thumbnail_url?: string;
};

export type ResolvedIgChild = { media_type: "IMAGE" | "VIDEO"; media_url: string };

export async function resolveChildMediaUrl(
  child: IgChild,
  accessToken: string,
): Promise<ResolvedIgChild | null> {
  if (child.media_url) return { media_type: child.media_type, media_url: child.media_url };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${child.id}?fields=media_type,media_url,thumbnail_url&access_token=${accessToken}`,
    );
    const data = (await res.json()) as { media_type?: string; media_url?: string; thumbnail_url?: string };
    if (res.ok && data.media_url) {
      return { media_type: data.media_type === "VIDEO" ? "VIDEO" : "IMAGE", media_url: data.media_url };
    }
    if (res.ok && data.thumbnail_url) {
      return { media_type: "IMAGE", media_url: data.thumbnail_url };
    }
  } catch {
    // best-effort — 아래 thumbnail_url 폴백으로 넘어간다.
  }

  if (child.thumbnail_url) return { media_type: "IMAGE", media_url: child.thumbnail_url };
  return null;
}
