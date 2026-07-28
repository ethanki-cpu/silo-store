import Link from "next/link";
import { CtaButtons } from "@/components/modules/CtaButtons";

// EPIC-056: Board Module 목록 ② Board Header Module — 게시판 제목 +
// 글쓰기 버튼(+ Application Module 성격의 CTA 버튼). Search/Sort는 이제
// 별도 모듈(SearchInput/SortSelect)이라 여기서는 포함하지 않는다 —
// src/components/boards/BoardHeader.tsx가 이 모듈 + SearchInput +
// SortSelect를 조합해 기존 게시판 헤더를 그대로 렌더링한다(시각적 변경
// 없음).
export function BoardHeaderModule({
  boardName,
  writeHref,
  ctas = [],
}: {
  boardName: string;
  writeHref?: string;
  ctas?: { label: string; href: string }[];
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
        {boardName}
      </h1>
      <div className="shrink-0 flex items-center gap-2">
        <CtaButtons ctas={ctas} />
        {writeHref && (
          <Link
            href={writeHref}
            className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-700 transition-colors"
          >
            글쓰기
          </Link>
        )}
      </div>
    </div>
  );
}
