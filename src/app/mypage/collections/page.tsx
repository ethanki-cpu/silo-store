"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// EPIC-045: "나의 컬렉션"은 상위 메뉴이며 하위 항목(9개 카테고리)으로
// 진입하는 구조 — 인덱스 자체에는 콘텐츠가 없어 첫 서브카테고리로 이동.
export default function CollectionsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mypage/collections/treasure");
  }, [router]);

  return null;
}
