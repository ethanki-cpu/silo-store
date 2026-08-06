"use client";

import { useParams } from "next/navigation";
import { WriteBoardForm } from "@/components/boards/WriteBoardForm";

// EPIC-079-PHASE-2/3/4: URL의 board_slug는 "처음에 어떤 게시판에서 글쓰기
// 진입했는지"를 나타내는 초기값일 뿐이고, 실제 게시 대상은 화면 안의
// "게시될 페이지 선택" 드롭다운이 최종 결정한다.
//
// EPIC-084: 실제 폼/제출 로직은 WriteBoardForm으로 뽑았다 — Contextual
// Write(/write?boardId=)도 board_slug 없이 같은 로직을 재사용해야 하기
// 때문. 이 파일은 이제 URL 경로의 board_slug를 초기값으로 넘기기만 한다.
export default function WritePostPage() {
  const { board_slug } = useParams<{ board_slug: string }>();
  return <WriteBoardForm initialBoardSlug={board_slug} />;
}
