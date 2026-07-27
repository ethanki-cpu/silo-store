import type { ReactNode } from "react";

// EPIC-046: Editorial Magazine 게시글 헤더 — 좌측 글 번호/작성일, 가운데
// 큰 제목, 우측 Author/작성자. 대표 이미지가 있으면 헤더 아래 Full Width로
// 표시한다(reading-width 제한 없이 페이지 폭 전체).
export function PostDetailHeader({
  postNumber,
  createdAt,
  title,
  authorName,
  photoUrl,
  badges,
}: {
  postNumber: number | null;
  createdAt: string;
  title: string;
  authorName: string;
  photoUrl?: string | null;
  badges?: ReactNode;
}) {
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
        </div>

        <div className="order-3 md:text-right">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Author
          </p>
          <p className="text-sm font-medium text-gray-800 mt-1">
            {authorName}
          </p>
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
