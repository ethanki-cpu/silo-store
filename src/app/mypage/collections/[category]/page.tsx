"use client";

import { useParams } from "next/navigation";
import { CollectionsSubNav } from "@/components/mypage/CollectionsSubNav";
import { CollectionCategoryPanel } from "@/components/mypage/CollectionCategoryPanel";
import {
  COLLECTION_SUBTABS,
  type CollectionSubKey,
} from "@/components/mypage/mypageConfig";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function CollectionCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const memberId = useMyPageMember();

  const subtab = COLLECTION_SUBTABS.find((s) => s.key === category);

  return (
    <div>
      <CollectionsSubNav />
      {subtab ? (
        <CollectionCategoryPanel
          memberId={memberId}
          category={category as CollectionSubKey}
        />
      ) : (
        <p className="text-gray-500">알 수 없는 컬렉션 카테고리예요.</p>
      )}
    </div>
  );
}
