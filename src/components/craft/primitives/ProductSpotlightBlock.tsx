"use client";

// BuilderJS의 "Funnel > Product" 블록에 대응 — 사일로 상점 items 테이블에서
// 물건 하나를 골라 크게 보여준다(ShopItemsGridBlock이 여러 개를 그리드로
// 보여주는 것과 구분되는, 단일 상품 스포트라이트).
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import Link from "next/link";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { supabase } from "@/lib/supabaseClient";

export type ProductSpotlightBlockProps = {
  itemId: string;
  ctaLabel: string;
  motion?: MotionConfig;
};

type ShopItem = { id: string; name: string; photo_url: string | null; price: number | null; category: string | null; description: string | null };

function formatPrice(price: number | null) {
  if (price === null) return "가격 문의";
  return `${price.toLocaleString("ko-KR")}원`;
}

export function ProductSpotlightBlock({ itemId, ctaLabel, motion = DEFAULT_MOTION }: ProductSpotlightBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const [item, setItem] = useState<ShopItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("items")
      .select("id, name, photo_url, price, category, description")
      .eq("id", itemId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setItem((data as ShopItem) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="상품 스포트라이트">
        <RevealWrapper motion={motion}>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-xs text-gray-400">불러오는 중...</div>
          ) : !item ? (
            <div className="flex h-32 items-center justify-center bg-gray-50 text-xs text-gray-400">우측 설정 패널에서 물건을 선택하세요</div>
          ) : (
            <div className="mx-auto grid max-w-3xl gap-6 px-6 py-10 @[600px]:grid-cols-2">
              {item.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photo_url} alt={item.name} className="aspect-square w-full rounded-md object-cover" />
              )}
              <div className="flex flex-col justify-center">
                {item.category && <span className="text-xs uppercase tracking-wide text-gray-400">{item.category}</span>}
                <h3 className="mt-1 text-xl font-semibold text-gray-900">{item.name}</h3>
                {item.description && <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>}
                <p className="mt-3 text-lg font-medium text-gray-900">{formatPrice(item.price)}</p>
                <Link
                  href={`/shop/${item.id}`}
                  className="mt-4 inline-block w-fit rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  {ctaLabel}
                </Link>
              </div>
            </div>
          )}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function ProductSpotlightSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as ProductSpotlightBlockProps }));
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from("items")
      .select("id, name")
      .eq("status", "available")
      .then(({ data }) => setItems(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        물건
        <select
          value={props.itemId}
          onChange={(e) => setProp((p) => { p.itemId = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="">선택 안 함</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        버튼 문구
        <input
          type="text"
          value={props.ctaLabel}
          onChange={(e) => setProp((p) => { p.ctaLabel = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
    </div>
  );
}

ProductSpotlightBlock.craft = {
  displayName: "ProductSpotlightBlock",
  props: {
    itemId: "",
    ctaLabel: "자세히 보기",
    motion: DEFAULT_MOTION,
  } satisfies ProductSpotlightBlockProps,
  related: { settings: ProductSpotlightSettings },
};
