"use client";

// EPIC-099(항목 3, Phase 2): 시대 구간 디렉토리 — 사일로 상점의
// TreasureGridBlock과 구조는 같은 아이콘+라벨 그리드지만, 항목이 시대 구간
// (고대~왕정/혁명~제국/프로이트~인공지능/디지털 문화)으로 채워진다. 기본값은
// navConfig.ts의 실제 온라인 도슨트 트리(FALLBACK_NAV_TABS, key:"docent")를
// 그대로 옮겨왔다(사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";

export type EraGridItem = { icon: string; label: string; description: string; href: string };
export type EraGridProps = { heading: string; subheading: string; items: EraGridItem[] };

export function EraGridBlock({ heading, subheading, items }: EraGridProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<EraGridItem>) {
    setProp((p) => {
      p.items = (p.items as EraGridItem[]).map((it: EraGridItem, i: number) =>
        i === index ? { ...it, ...patch } : it,
      );
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Era Grid">
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

EraGridBlock.craft = {
  displayName: "EraGridBlock",
  props: {
    heading: "시대별로 둘러보기",
    subheading: "고대부터 오늘까지, 네 개의 구간으로 나눈 이야기",
    items: [
      {
        icon: "🏛️",
        label: "고대 ~ 왕정",
        description: "BC 1100 ~ 1780, 그리스부터 로코코까지",
        href: "/online-docent/ancient-monarchy",
      },
      {
        icon: "🎭",
        label: "혁명 ~ 제국",
        description: "1750 ~ 1890, 신고전주의부터 인상파까지",
        href: "/online-docent/revolution-empire",
      },
      {
        icon: "🧠",
        label: "프로이트 ~ 인공지능",
        description: "1890 ~ 2000, 아르누보부터 대중문화까지",
        href: "/online-docent/freud-ai",
      },
      {
        icon: "💻",
        label: "디지털 문화",
        description: "2020 ~ 현재",
        href: "/online-docent/freud-ai/digital-culture",
      },
    ],
  } satisfies EraGridProps,
};
