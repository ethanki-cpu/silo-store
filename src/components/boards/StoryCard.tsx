import Link from "next/link";
import type { ReactNode } from "react";
import { PostTags } from "./PostTags";

// EPIC-052: 게시판의 "story" 레이아웃(BoardRenderer.tsx)과 마이페이지
// "나의 컬렉션"(비공개, member_collections)이 시각적으로 동일한 카드를
// 쓰도록 뽑아낸 공용 프레젠테이션 컴포넌트 — 데이터 소스가 달라도(공개
// 게시판 글 vs 비공개 개인 컬렉션 항목) 카드 마크업은 하나만 존재한다
// (중복 UI 생성 금지).
export function StoryCard({
  href,
  photoUrl,
  title,
  summary,
  tags = [],
  meta,
  actions,
}: {
  href?: string;
  photoUrl?: string | null;
  title: string;
  summary?: string | null;
  tags?: string[];
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  const inner = (
    <>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={title}
          className="w-full aspect-[4/3] object-cover"
        />
      )}
      <h2 className="font-serif text-lg font-medium text-gray-900 mt-3 group-hover:underline">
        {title}
      </h2>
      {summary && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{summary}</p>
      )}
      <PostTags tags={tags} />
      {meta && (
        <p className="text-xs uppercase tracking-wide text-gray-400 mt-2">
          {meta}
        </p>
      )}
    </>
  );

  return (
    <div className="relative group">
      {actions && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          {actions}
        </div>
      )}
      {href ? (
        <Link href={href} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}
