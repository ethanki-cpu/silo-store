import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";
import { TimelineView } from "@/components/TimelineView";
import { PostTags } from "@/components/boards/PostTags";
import { formatPostMeta } from "@/lib/postMeta";
import { htmlToExcerpt } from "@/lib/htmlExcerpt";
import { metaStyleToCss, type PostMetaStyle } from "@/components/boards/PostDetailHeader";
import type { BoardRendererProps } from "./types";

// Timeline Engine(EPIC-050): 연→월 순으로 묶어 보여주는 그룹핑은
// TimelineView(src/components/TimelineView.tsx)가 공용으로 처리한다 — 여기는
// BoardPost를 그 계약({id, createdAt})에 맞게 어댑팅하고, 항목 하나의
// 마크업만 담당한다.
//
// HOTFIX-097(사용자 지시): "글을 찾을 수 없어요" 클릭 버그(post_boards
// cross-post 상세 조회 미반영)를 API 쪽에서 고친 것과 별개로, 디자인을
// Common Ninja 스타일로 다시 만든다 — 선 위에는 날짜+제목만 보이는 얇은
// 라벨을 두고, hover하면 썸네일+본문 일부(excerpt)+날짜를 담은 카드가
// 떠오른다. renderTimelinePostLabel/renderTimelinePostPreview 둘 다 내보내서
// DbFeedModules.tsx(Page Builder의 Timeline 위젯)도 동일한 마크업을 그대로
// 재사용한다(중복 구현 없음, GalleryModule/GalleryRenderer가 이미 쓰는
// 관례와 동일).
// HOTFIX-098(사용자 신고 — "정렬을 가운데로 했는데 아무것도 안 바뀌어"):
// "게시물 출력방식"(날짜/작성자 스타일, boards.widget_settings.postMetaStyle)
// 이 지금까지 PostDetailHeader(게시글 상세)에만 적용되고 타임라인 라벨/
// 미리보기에는 전혀 반영되지 않아, 같은 게시판 설정 폼 안의 값을 바꿔도
// 타임라인 화면은 그대로였다 — metaStyleToCss(PostDetailHeader.tsx에서
// export)를 그대로 재사용해 날짜/제목/메타 텍스트 정렬·크기·색상·굵기에
// 적용한다.
export function renderTimelinePostLabel(
  boardId: string,
  post: BoardPost,
  boardCategory?: string | null,
  metaStyle?: PostMetaStyle | null,
) {
  const style = metaStyleToCss(metaStyle);
  return (
    <Link href={`/boards/${boardId}/${post.slug ?? post.id}`} className="block" style={style}>
      <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
      <p className="font-serif text-gray-900 hover:underline">{post.title}</p>
      <PostTags tags={[...(post.tags ?? []), ...(boardCategory ? [boardCategory] : [])]} />
    </Link>
  );
}

export function renderTimelinePostPreview(boardId: string, post: BoardPost, metaStyle?: PostMetaStyle | null) {
  const imageUrl = post.thumbnail_visible !== false ? (post.featured_image_url ?? post.photo_url) : null;
  const excerpt = htmlToExcerpt(post.body, 90);
  const style = metaStyleToCss(metaStyle);
  return (
    <Link href={`/boards/${boardId}/${post.slug ?? post.id}`} className="block">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-16 w-full items-center justify-center bg-gray-50 text-xs text-gray-300">
          이미지 없음
        </div>
      )}
      <div className="p-3" style={style}>
        <p className="text-[11px] text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
        <p className="mt-0.5 font-serif text-sm font-semibold text-gray-900 line-clamp-1">{post.title}</p>
        {excerpt && <p className="mt-1 text-xs leading-relaxed text-gray-500 line-clamp-3">{excerpt}</p>}
        <p className="mt-1.5 text-[11px] text-gray-400">{formatPostMeta(post)}</p>
      </div>
    </Link>
  );
}

export function TimelineRenderer({
  boardId,
  posts,
  boardCategory,
  timelineOrientation,
  timelineShowPreview,
  postMetaStyle,
}: BoardRendererProps) {
  const entries = posts.map((post) => ({ ...post, createdAt: post.created_at }));

  return (
    <TimelineView
      entries={entries}
      orientation={timelineOrientation ?? "vertical"}
      renderItem={(entry) => renderTimelinePostLabel(boardId, entry, boardCategory, postMetaStyle)}
      renderPreview={
        timelineShowPreview === false
          ? undefined
          : (entry) => renderTimelinePostPreview(boardId, entry, postMetaStyle)
      }
    />
  );
}
