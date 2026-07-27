"use client";

import { CategoryTreeManager } from "@/components/admin/CategoryTreeManager";

// EPIC-035: 기존에는 이 인덱스가 기본 서브 탭("상단 탭/카테고리 관리")으로
// 단순 redirect만 했다(EPIC-025). 이제 여기를 상단 탭/좌측 사이드바/우측
// 사이드바 3개 트리를 한 화면에서 드래그앤드롭으로 관리하는 통합 화면으로
// 바꾼다.
// EPIC-035-Fix: 기존 top-tabs/sidebar-left/sidebar-right 3개 페이지(정적
// NavNodeEditor 기반)는 이 화면과 병존하며 혼란을 줄 수 있어 삭제됨 —
// site_navigations 관리는 이제 이 화면 하나로 일원화.
export default function AdminNavigationIndexPage() {
  return (
    <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full space-y-8">
      <p className="text-sm text-gray-500">
        드래그해서 순서를 바꾸거나, 다른 항목 위로 드롭해서 하위 항목으로
        옮길 수 있어요. 각 항목의 [관리]에서 공개 설정·주제·대표 이미지·소개를
        편집하세요.
      </p>
      <CategoryTreeManager title="상단 탭" targetTypes={["tab", "dropdown"]} />
      <CategoryTreeManager
        title="왼쪽 사이드바"
        targetTypes={["sidebar_left"]}
      />
      <CategoryTreeManager
        title="오른쪽 사이드바"
        targetTypes={["sidebar_right"]}
      />
    </main>
  );
}
