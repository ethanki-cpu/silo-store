"use client";

// EPIC-099(항목 3, Phase 2): 사일로 상점 카테고리 디렉토리 — 홈페이지의
// EditorialGridBlock(사진 중심 3열)과 구조가 다르다: 아이콘/이모지 + 라벨
// 위주의 촘촘한 6칸 그리드로, 사진 없이도 "이 상점 안에 뭐가 있는지"를
// 한눈에 훑어보게 한다(사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";

export type TreasureGridItem = { icon: string; label: string; description: string; href: string };
export type TreasureGridProps = { heading: string; subheading: string; items: TreasureGridItem[] };

export function TreasureGridBlock({ heading, subheading, items }: TreasureGridProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<TreasureGridItem>) {
    setProp((p) => {
      p.items = (p.items as TreasureGridItem[]).map((it: TreasureGridItem, i: number) =>
        i === index ? { ...it, ...patch } : it,
      );
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Treasure Grid">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <EditableText
              as="h2"
              value={heading}
              className="font-serif text-2xl font-normal text-gray-900"
              onCommit={(next) => setProp((p) => (p.heading = next))}
            />
            <EditableText
              as="span"
              value={subheading}
              className="mt-2 block text-sm text-gray-500"
              onCommit={(next) => setProp((p) => (p.subheading = next))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {items.map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 px-4 py-6 text-center transition-colors hover:border-gray-400"
              >
                <span className="text-2xl">{item.icon}</span>
                <EditableText
                  as="span"
                  value={item.label}
                  className="font-serif text-base text-gray-900"
                  onCommit={(next) => updateItem(i, { label: next })}
                />
                <EditableText
                  as="span"
                  value={item.description}
                  className="text-xs text-gray-400"
                  onCommit={(next) => updateItem(i, { description: next })}
                />
              </a>
            ))}
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

TreasureGridBlock.craft = {
  displayName: "TreasureGridBlock",
  props: {
    heading: "사일로 상점 둘러보기",
    subheading: "카테고리별로 모아둔 사일로의 보물들",
    items: [
      { icon: "💎", label: "사일로 보물들", description: "지금 만날 수 있는 물건들", href: "/silo-store/treasures" },
      { icon: "🕊️", label: "사일로의 뮤즈", description: "이야기가 있는 컬렉션", href: "/silo-store/treasures/silo-muse" },
      { icon: "🧸", label: "사일로의 천사들", description: "새 가족을 기다려요", href: "/silo-store/treasures/silo-angels" },
      { icon: "📸", label: "보내기 전 마지막 사진", description: "떠나보내기 전 마지막 기록", href: "/silo-store/treasures/last-photos" },
      { icon: "📋", label: "입양신청서 라이브러리", description: "입양 신청 안내", href: "/silo-store/treasures/shop-adoption-library" },
      { icon: "💌", label: "입양 이후", description: "새 집에서의 이야기들", href: "/silo-store/treasures/after-adoption" },
    ],
  } satisfies TreasureGridProps,
};
