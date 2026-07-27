import Link from "next/link";

// EPIC-046: Editorial Magazine 게시판 공통 헤더 — 게시판명(마스트헤드),
// 우측 글쓰기 버튼, 얇은 Divider. 모든 게시판(boards/[id])이 이 컴포넌트
// 하나를 공유한다.
export function BoardHeader({
  boardName,
  writeHref,
}: {
  boardName: string;
  writeHref?: string;
}) {
  return (
    <header className="mb-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          {boardName}
        </h1>
        {writeHref && (
          <Link
            href={writeHref}
            className="shrink-0 rounded-md bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-700 transition-colors"
          >
            글쓰기
          </Link>
        )}
      </div>
      <div className="mt-4 border-t border-gray-200" />
    </header>
  );
}
