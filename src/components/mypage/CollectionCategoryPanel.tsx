"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "@/components/modules/EmptyState";
import { COLLECTION_SUBTABS, type CollectionSubKey } from "./mypageConfig";
import {
  CollectionModal,
  type CollectionCategory,
  type CollectionModalItem,
} from "./CollectionModal";
import { StoryCard } from "@/components/boards/StoryCard";

type Treasure = {
  id: string;
  item_name: string;
  item_photo_url: string | null;
  order_type: "purchase" | "rental";
  created_at: string;
};

type CollectionItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

// EPIC-045: 옛 CollectionsPanel.tsx가 9개 서브탭을 내부 state로 전환하며
// 한 화면에서 다 그리던 것을, 라우트당 한 카테고리만 받는 형태로 분리 —
// 데이터 조회/등록/수정/삭제 로직 자체는 그대로 재사용.
// EPIC-052: "나의 컬렉션"은 비공개(member_collections, 스키마/공개 범위
// 변경 없음)로 유지하되, 카드 마크업만 게시판 story 레이아웃과 공유하는
// StoryCard로 통일 — 공개 게시판과 동일한 시각 언어를 재사용한다.
export function CollectionCategoryPanel({
  memberId,
  category,
}: {
  memberId: string;
  category: CollectionSubKey;
}) {
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalItem, setModalItem] = useState<
    CollectionModalItem | null | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);

    async function load() {
      if (category === "treasure") {
        const { data } = await supabase
          .from("orders")
          .select("id, order_type, created_at, items(name, photo_url)")
          .eq("member_id", memberId)
          .eq("payment_status", "confirmed")
          .order("created_at", { ascending: false });

        if (cancelled) return;

        const rows = (data ?? []) as unknown as {
          id: string;
          order_type: "purchase" | "rental";
          created_at: string;
          items: { name: string; photo_url: string | null } | null;
        }[];

        setTreasures(
          rows.map((r) => ({
            id: r.id,
            item_name: r.items?.name ?? "알 수 없는 물품",
            item_photo_url: r.items?.photo_url ?? null,
            order_type: r.order_type,
            created_at: r.created_at,
          })),
        );
      } else {
        const { data } = await supabase
          .from("member_collections")
          .select("id, title, description, image_url, created_at")
          .eq("member_id", memberId)
          .eq("category", category)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        setItems((data ?? []) as CollectionItem[]);
      }

      if (!cancelled) setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId, category, reloadKey]);

  async function handleDelete(itemId: string) {
    if (!window.confirm("이 항목을 삭제할까요?")) return;

    const { error } = await supabase
      .from("member_collections")
      .delete()
      .eq("id", itemId)
      .eq("member_id", memberId);

    if (!error) setReloadKey((k) => k + 1);
  }

  return (
    <div>
      {category !== "treasure" && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setModalItem(null)}
            className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm"
          >
            + 아이템 추가
          </button>
        </div>
      )}

      {loadingData ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : category === "treasure" ? (
        treasures.length === 0 ? (
          <EmptyState title="아직 입양(구매/대여)한 물품이 없어요." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {treasures.map((t) => (
              <StoryCard
                key={t.id}
                photoUrl={t.item_photo_url}
                title={t.item_name}
                meta={
                  <>
                    {t.order_type === "purchase" ? "구매" : "대여"} ·{" "}
                    {new Date(t.created_at).toLocaleDateString()}
                  </>
                }
              />
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <EmptyState
          title={`아직 등록한 ${
            COLLECTION_SUBTABS.find((s) => s.key === category)?.label ?? ""
          }이(가) 없어요.`}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <StoryCard
              key={item.id}
              photoUrl={item.image_url}
              title={item.title}
              summary={item.description}
              meta={new Date(item.created_at).toLocaleDateString()}
              actions={
                <>
                  <button
                    type="button"
                    aria-label="수정"
                    onClick={() =>
                      setModalItem({
                        id: item.id,
                        title: item.title,
                        description: item.description,
                        image_url: item.image_url,
                      })
                    }
                    className="rounded-full bg-white/90 w-7 h-7 flex items-center justify-center shadow text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    aria-label="삭제"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-full bg-white/90 w-7 h-7 flex items-center justify-center shadow text-xs"
                  >
                    🗑️
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      {modalItem !== undefined && category !== "treasure" && (
        <CollectionModal
          memberId={memberId}
          category={category as CollectionCategory}
          item={modalItem}
          onClose={() => setModalItem(undefined)}
          onSaved={() => {
            setModalItem(undefined);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
