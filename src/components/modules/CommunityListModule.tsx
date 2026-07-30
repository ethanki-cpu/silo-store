import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";

// EPIC-056: Board Module 목록 ⑥ Community List Module — 제목/작성자/좋아요/
// 조회수/날짜만 보여주는 목록형 레이아웃. src/components/boards/
// BoardRenderer.tsx 안에 갇혀 있던 사설(private) 컴포넌트를 그대로
// 뽑아낸 것(마크업/동작 변경 없음) — BoardRenderer가 이 모듈을 그대로
// 재사용한다(중복 없음).
//
// EPIC-075: 3줄(제목 / 메타 / 태그)로 렌더링되던 아이템을 [글제목] | [작성자] |
// [좋아요] | [댓글] | [조회] | [작성날짜] | [태그] 컬럼이 한 줄에 들어오는
// 반응형 1-Row 테이블로 재작성 — 한 화면에서 더 많은 글이 보이도록. 좁은
// 화면에서는 덜 중요한 컬럼(작성자/좋아요/조회/태그)을 순서대로 숨겨 줄바꿈
// 없이 항상 한 줄을 유지한다(태그는 가장 먼저 숨김, 제목/날짜만 최후까지 남음).
// 목록형 레이아웃 취지상 썸네일(photo_url)은 제거했다 — 어떤 호출부도
// 썸네일을 기대하지 않는다(BoardRenderer 계열 4곳 전부 thumbnail prop 없이 호출).
function PostBadges({ post, isQna }: { post: BoardPost; isQna: boolean }) {
  if (!post.is_best && !post.is_docent_post && !isQna) return null;

  return (
    <span className="flex items-center gap-1 shrink-0">
      {post.is_best && (
        <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
          개념글
        </span>
      )}
      {post.is_docent_post && (
        <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
          도슨트
        </span>
      )}
      {isQna && (
        <span
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
            post.is_answered
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {post.is_answered ? "답변완료" : "답변대기"}
        </span>
      )}
    </span>
  );
}

export function CommunityListModule({
  boardId,
  posts,
  isQna,
  // EPIC-066: Board Widget이 "카테고리"까지 실제로 출력해야 한다는 요구 —
  // 카테고리는 게시글이 아니라 게시판 단위 속성이라 posts에는 없다.
  // 상세 페이지(boards/[id]/[postId])가 이미 하던 대로(board?.category를
  // 태그처럼 붙여 보여줌) 목록에서도 동일하게 태그 칩 하나로 표시한다.
  boardCategory,
  showLikes,
  showComments,
  showViewCount,
}: {
  boardId: string;
  posts: BoardPost[];
  isQna: boolean;
  boardCategory?: string | null;
  // EPIC-066: 게시판 관리의 좋아요/댓글/조회수 사용 여부 토글.
  showLikes?: boolean;
  showComments?: boolean;
  showViewCount?: boolean;
}) {
  return (
    <div className="divide-y divide-gray-100 text-sm">
      {posts.map((post) => {
        const tags = [...(post.tags ?? []), ...(boardCategory ? [boardCategory] : [])];
        return (
          <Link
            key={post.id}
            href={`/boards/${boardId}/${post.id}`}
            className="flex items-center gap-3 py-2.5 group"
          >
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <PostBadges post={post} isQna={isQna} />
              <h2 className="truncate font-medium text-gray-900 group-hover:underline">
                {post.title}
              </h2>
            </div>

            <span className="hidden sm:block w-20 shrink-0 truncate text-xs text-gray-500 text-right">
              {post.author_name}
            </span>

            {showLikes !== false && (
              <span className="hidden md:block w-12 shrink-0 text-xs text-gray-400 text-right tabular-nums">
                ♥ {post.like_count}
              </span>
            )}
            {showComments !== false && (
              <span className="hidden md:block w-12 shrink-0 text-xs text-gray-400 text-right tabular-nums">
                💬 {post.comment_count}
              </span>
            )}
            {showViewCount !== false && (
              <span className="hidden lg:block w-12 shrink-0 text-xs text-gray-400 text-right tabular-nums">
                👁 {post.view_count ?? 0}
              </span>
            )}

            <span className="w-20 shrink-0 text-xs text-gray-400 text-right tabular-nums">
              {new Date(post.created_at).toLocaleDateString()}
            </span>

            {tags.length > 0 && (
              // EPIC-075: PostTags(상세 페이지용, mt-4 + flex-wrap 전제)는 이 1-Row
              // 레이아웃과 맞지 않아(줄바꿈 유발) 재사용하지 않고, 한 줄을 벗어나지
              // 않는 축소 칩을 직접 그린다 — 최대 2개만, 넘치면 "+N"으로 개수만 표시.
              <div className="hidden xl:flex shrink-0 w-32 justify-end items-center gap-1 overflow-hidden whitespace-nowrap">
                {tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-300 text-gray-500 text-[11px] px-2 py-0.5 shrink-0"
                  >
                    #{tag}
                  </span>
                ))}
                {tags.length > 2 && (
                  <span className="text-[11px] text-gray-400 shrink-0">+{tags.length - 2}</span>
                )}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
