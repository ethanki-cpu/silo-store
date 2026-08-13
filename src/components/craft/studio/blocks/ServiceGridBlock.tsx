"use client";

// EPIC-099(항목 3, Phase 2): 스튜디오 서비스 디렉토리 — TreasureGridBlock/
// EraGridBlock과 같은 아이콘+라벨 그리드, 항목은 실제 nav 구조(navConfig.ts
// key:"space_inquiry")의 4개 서비스로 채운다(사용자 지시: "페이지별 전용
// 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";

export type ServiceGridItem = { icon: string; label: string; description: string; href: string };
export type ServiceGridProps = { heading: string; subheading: string; items: ServiceGridItem[] };

export function ServiceGridBlock({ heading, subheading, items }: ServiceGridProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<ServiceGridItem>) {
    setProp((p) => {
      p.items = (p.items as ServiceGridItem[]).map((it: ServiceGridItem, i: number) =>
        i === index ? { ...it, ...patch } : it,
      );
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Service Grid">
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
          <div className="grid grid-cols-2 gap-4 @[768px]:grid-cols-4">
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

ServiceGridBlock.craft = {
  displayName: "ServiceGridBlock",
  props: {
    heading: "스튜디오 서비스",
    subheading: "필요한 공간과 물품을 골라 문의해보세요",
    items: [
      {
        icon: "📷",
        label: "공간 촬영 대관 (1F)",
        description: "사일로 상점 공간 촬영 대관",
        href: "/studio/rental_1f_silostore",
      },
      {
        icon: "🎬",
        label: "공간 촬영 대관 (2F)",
        description: "살롱데상 공간 촬영 대관",
        href: "/studio/rental_2f_salon",
      },
      {
        icon: "📦",
        label: "물품 대여",
        description: "필요한 소품/장비 대여",
        href: "/studio/items-rental",
      },
      {
        icon: "🪑",
        label: "공간 스타일링",
        description: "원하는 분위기로 공간 연출",
        href: "/studio/space-styling",
      },
    ],
  } satisfies ServiceGridProps,
};
