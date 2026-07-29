import Link from "next/link";
import type { ReactNode } from "react";

// EPIC-046/047: Editorial Magazine 게시글 헤더 — 좌측 글 번호/작성일, 가운데
// 큰 제목, 우측 Author/작성자(프로필 링크). 대표 이미지가 있으면 헤더
// 아래 Full Width로 표시한다(reading-width 제한 없이 페이지 폭 전체).
// 좋아요/조회/댓글 수는 Board Engine(EPIC-047) 공통 통계 라인으로 표시.
export function PostDetailHeader({
  postNumber,
  createdAt,
  updatedAt,
  title,
  authorId,
  authorName,
  photoUrl,
  likeCount,
  viewCount,
  commentCount,
  badges,
  showLikes = true,
  showComments = true,
  showViewCount = true,
  editHref,
}: {
  postNumber: number | null;
  createdAt: string;
  updatedAt?: string;
  title: string;
  authorId: string;
  authorName: string;
  photoUrl?: string | null;
  likeCount: number;
  viewCount: number | null;
  commentCount: number;
  badges?: ReactNode;
  // EPIC-066: 게시판 관리의 좋아요/댓글/조회수 사용 여부 토글.
  showLikes?: boolean;
  showComments?: boolean;
  showViewCount?: boolean;
  /** 작성자 본인(또는 관리자)에게만 전달 — 있으면 "수정" 링크를 보여준다. */
  editHref?: string;
}) {
  const statParts = [
    ...(showLikes ? [`좋아요 ${likeCount}`] : []),
    ...(showViewCount ? [`조회 ${viewCount ?? 0}`] : []),
    ...(showComments ? [`댓글 ${commentCount}`] : []),
  ];
  const wasEdited = updatedAt && updatedAt !== createdAt;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4 md:gap-8 items-start">
        <div className="order-2 md:order-1">
          {postNumber !== null && (
            <p className="text-xs uppercase tracking-wide text-gray-400">
              No. {postNumber}
            </p>
          )}
          <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
            {new Date(createdAt).toLocaleDateString()}
          </p>
          {wasEdited && (
            <p className="text-xs uppercase tracking-wide text-gray-300 mt-1">
              수정 {new Date(updatedAt!).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="order-1 md:order-2 text-center">
          {badges && (
            <div className="flex items-center justify-center gap-2 mb-3">
              {badges}
            </div>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-gray-900">
            {title}
          </h1>
          {statParts.length > 0 && (
            <p className="text-xs uppercase tracking-wide text-gray-400 mt-3">
              {statParts.join(" · ")}
            </p>
          )}
        </div>

        <div className="order-3 md:text-right">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Author
          </p>
          <Link
            href={`/u/${authorId}`}
            className="text-sm font-medium text-gray-800 mt-1 block hover:underline"
          >
            {authorName}
          </Link>
          {editHref && (
            <Link href={editHref} className="text-xs text-gray-400 hover:underline hover:text-gray-600 mt-2 block">
              수정
            </Link>
          )}
        </div>
      </div>

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={title}
          className="w-full aspect-[21/9] object-cover mt-8"
        />
      )}
    </div>
  );
}
