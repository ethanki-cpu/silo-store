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
//
// HOTFIX-147.10(사용자 재신고 — 바로크 Act 1: "첫번째가 영상이어야 하는데
// 사진이다" 재현, 실측으로 근본 원인 특정): HOTFIX-147.4의 "children을 bare
// edge로 요청하면 순서가 보존된다"는 가설은 실제로는 틀렸다 — 순서는 bare/
// nested 요청 방식과 무관하게 항상 동일했다(dev.silostore.net에서 진단
// 전용 라우트로 3가지 필드 조합을 직접 대조해 확인, HOTFIX-147.9-진단 커밋
// 참고). 진짜 원인은 이 함수 자체: 이 자식의 media_type이 분명 VIDEO인데
// media_url이 (개별 조회로도, 필드 조합을 바꿔도) 영구히 비어있고
// thumbnail_url만 내려오는 게시물이 실제로 존재한다(2020년 게시물, Meta
// 쪽의 구형 캐러셀 영상 자산에 대한 알려진 Graph API 한계로 보임 — 우리
// 쪽 코드로 우회할 방법이 없다: 재생 가능한 원본 파일 자체를 API가 안 줌).
// 기존 코드는 이 경우 media_type을 통째로 "IMAGE"로 바꿔 저장했는데, 그러면
// "원래 영상이었다"는 사실 자체가 사라져 사용자가 보기엔 그냥 평범한 사진과
// 구분이 안 됐다. 이제 media_type은 항상 사실대로 반환하고(VIDEO면 VIDEO),
// 대신 playable(실제 재생 가능한 파일을 구했는지) 플래그를 따로 둬서
// 호출부가 "영상이지만 정지 이미지로만 보여줄 수 있다"는 것을 알고
// media_item_types에 구분되는 값("VIDEO_THUMBNAIL")을 저장하게 한다
// (렌더러가 재생 버튼 아이콘을 얹어 최소한 "이건 영상이었다"는 걸 보여줄
// 수 있도록 — src/components/content/InstagramFeedPost.tsx 참고).
export const GRAPH_API_VERSION = "v21.0";

export type IgChild = {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  thumbnail_url?: string;
};

export type ResolvedIgChild = { media_type: "IMAGE" | "VIDEO"; media_url: string; playable: boolean };

export async function resolveChildMediaUrl(
  child: IgChild,
  accessToken: string,
): Promise<ResolvedIgChild | null> {
  if (child.media_url) return { media_type: child.media_type, media_url: child.media_url, playable: true };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${child.id}?fields=media_type,media_url,thumbnail_url&access_token=${accessToken}`,
    );
    const data = (await res.json()) as { media_type?: string; media_url?: string; thumbnail_url?: string };
    const resolvedType = data.media_type === "VIDEO" ? "VIDEO" : "IMAGE";
    if (res.ok && data.media_url) {
      return { media_type: resolvedType, media_url: data.media_url, playable: true };
    }
    if (res.ok && data.thumbnail_url) {
      return { media_type: resolvedType, media_url: data.thumbnail_url, playable: false };
    }
  } catch {
    // best-effort — 아래 thumbnail_url 폴백으로 넘어간다.
  }

  if (child.thumbnail_url) return { media_type: child.media_type, media_url: child.thumbnail_url, playable: false };
  return null;
}

// HOTFIX-147.10: instagram_feeds.media_item_types에 저장할 문자열 — 진짜
// 재생 가능한 VIDEO만 "VIDEO"로 저장하고, 재생 불가능한(정지 이미지로 대체된)
// VIDEO는 "VIDEO_THUMBNAIL"로 구분해 렌더러가 <video> 대신 재생 버튼 아이콘을
// 얹은 <img>로 그리게 한다(media_item_types는 CHECK 제약이 없는 배열 컬럼이라
// 새 문자열 추가에 마이그레이션이 필요 없음).
export function storedMediaItemType(resolved: ResolvedIgChild): string {
  return resolved.media_type === "VIDEO" && !resolved.playable ? "VIDEO_THUMBNAIL" : resolved.media_type;
}
