"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";
import { COLLECTION_SUBTABS, type CollectionSubKey } from "../mypageConfig";
import {
  CollectionModal,
  type CollectionCategory,
  type CollectionModalItem,
} from "../CollectionModal";

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

export function CollectionsPanel({ memberId }: { memberId: string }) {
  const [subTab, setSubTab] = useState<CollectionSubKey>("treasure");
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalItem, setModalItem] = useState<CollectionModalItem | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);

    async function load() {
      if (subTab === "treasure") {
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
          .eq("category", subTab)
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
  }, [memberId, subTab, reloadKey]);

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
      <div className="flex flex-wrap gap-2 mb-4">
        {COLLECTION_SUBTABS.map((sub) => (
          <button
            key={sub.key}
            type="button"
            onClick={() => setSubTab(sub.key)}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              subTab === sub.key
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {subTab !== "treasure" && (
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
      ) : subTab === "treasure" ? (
        treasures.length === 0 ? (
          <EmptyState message="아직 입양(구매/대여)한 물품이 없어요." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {treasures.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-gray-200 overflow-hidden"
              >
                {t.item_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.item_photo_url}
                    alt={t.item_name}
                    className="w-full aspect-square object-cover"
                  />
                )}
                <div className="p-3">
                  <p className="font-medium text-sm">{t.item_name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.order_type === "purchase" ? "구매" : "대여"} ·{" "}
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <EmptyState
          message={`아직 등록한 ${
            COLLECTION_SUBTABS.find((s) => s.key === subTab)?.label ?? ""
          }이(가) 없어요.`}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="absolute top-2 right-2 z-10 flex gap-1">
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
              </div>
              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full aspect-square object-cover"
                />
              )}
              <div className="p-3">
                <p className="font-medium text-sm">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalItem !== undefined && subTab !== "treasure" && (
        <CollectionModal
          memberId={memberId}
          category={subTab as CollectionCategory}
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
