"use client";

// EPIC-089: "전체 글 관리"에 4대 도메인(사일로상점/살롱데상/스튜디오/
// 마이페이지) 탭만 있고 "공통/기타"(어느 사이트 메뉴 브랜치에도 매칭되지
// 않는 게시판) 탭이 없어, 그런 게시판의 글은 이 화면 어디에서도 조회할
// 방법이 없었다(AdminPostsBoardView는 이미 domain="common"을 지원했지만
// 그 값을 넘기는 라우트가 없었을 뿐) — 나머지 4개 탭과 동일한 패턴으로 추가.
import { AdminPostsBoardView } from "@/components/admin/AdminPostsBoardView";

export default function AdminPostsCommonPage() {
  return <AdminPostsBoardView domain="common" />;
}
