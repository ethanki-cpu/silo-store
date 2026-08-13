"use client";

// EPIC-103(Kinfolk 12th 블록): "썸네일/카테고리/제목/가격/쇼핑 안내" —
// 게시판 posts에는 가격 필드가 없어(docs/database-schema.sql 확인,
// EPIC-102 BoardEmbedBlock과 동일한 제약) 가격이 실제로 있는 사일로 상점
// items 테이블(공개 read RLS, /shop/page.tsx와 동일한 select)을 직접
// 조회한다 — 새 API 라우트 없이 공개 anon 클라이언트로 충분.
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import Link from "next/link";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { supabase } from "@/lib/supabaseClient";

export type ShopItemsGridBlockProps = {
  heading: string;
  count: number;
  motion?: MotionConfig;
};

type ShopItem = { id: string; name: string; photo_url: string | null; price: number | null; category: string | null };

function formatPrice(price: number | null) {
  if (price === null) return "가격 문의";
  return `${price.toLocaleString("ko-KR")}원`;
}

export function ShopItemsGridBlock({ heading, count, motion = DEFAULT_MOTION }: ShopItemsGridBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("items")
      .select("id, name, photo_url, price, category")
      .eq("status", "available")
      .limit(count)
      .then(({ data }) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [count]);

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="사일로 상점 목록">
        <RevealWrapper motion={motion}>
          <section className="mx-auto max-w-6xl px-6 py-16">
            <EditableText
              as="h2"
              value={heading}
              onCommit={(next) => setProp((p) => { p.heading = next; })}
              className="mb-8 block text-center font-serif text-2xl font-normal text-gray-900"
            />
            {loading ? (
              <div className="flex h-24 items-center justify-center text-xs text-gray-400">불러오는 중...</div>
            ) : items.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-xs text-gray-400">판매 중인 물건이 없어요</div>
            ) : (
              <div className="grid grid-cols-2 gap-6 @[768px]:grid-cols-4">
                {items.map((item) => (
                  <Link key={item.id} href={`/shop/${item.id}`} className="block">
                    {item.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photo_url} alt={item.name} className="aspect-square w-full object-cover" />
                    )}
                    <div className="pt-2">
                      {item.category && <span className="text-[10px] uppercase tracking-wide text-gray-400">{item.category}</span>}
                      <h4 className="truncate text-sm font-medium text-gray-900">{item.name}</h4>
                      <p className="mt-1 text-xs text-gray-500">{formatPrice(item.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function ShopItemsGridSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ShopItemsGridBlockProps }));

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        제목
        <input
          type="text"
          value={props.heading}
          onChange={(e) => setProp((p) => { p.heading = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        개수
        <input
          type="number"
          min={1}
          max={24}
          value={props.count}
          onChange={(e) => setProp((p) => { p.count = Number(e.target.value) || 4; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
    </div>
  );
}

ShopItemsGridBlock.craft = {
  displayName: "ShopItemsGridBlock",
  props: {
    heading: "사일로 상점의 물건들",
    count: 4,
    motion: DEFAULT_MOTION,
  } satisfies ShopItemsGridBlockProps,
  related: { settings: ShopItemsGridSettings },
};
