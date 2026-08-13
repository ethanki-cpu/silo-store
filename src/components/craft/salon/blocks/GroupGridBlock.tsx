"use client";

// EPIC-099(항목 3, Phase 2): 살롱데상 그룹 디렉토리 — TreasureGridBlock/
// EraGridBlock/ServiceGridBlock과 같은 아이콘+라벨 그리드, 항목은 실제 nav
// 구조(navConfig.ts key:"salon")의 7개 그룹으로 채운다(사용자 지시: "페이지별
// 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";

export type GroupGridItem = { icon: string; label: string; description: string; href: string };
export type GroupGridProps = { heading: string; subheading: string; items: GroupGridItem[] };

export function GroupGridBlock({ heading, subheading, items }: GroupGridProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<GroupGridItem>) {
    setProp((p) => {
      p.items = (p.items as GroupGridItem[]).map((it: GroupGridItem, i: number) =>
        i === index ? { ...it, ...patch } : it,
      );
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Group Grid">
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

GroupGridBlock.craft = {
  displayName: "GroupGridBlock",
  props: {
    heading: "살롱데상 둘러보기",
    subheading: "관심사와 요일별로 모인 커뮤니티들",
    items: [
      { icon: "💬", label: "커뮤니티", description: "자유게시판·출석체크·Q&A", href: "/salon-des-cent/community" },
      { icon: "🎨", label: "주제별 클럽 A", description: "예술·심리·문학·역사", href: "/salon-des-cent/community/topics-A" },
      { icon: "🎬", label: "주제별 클럽 B", description: "영화·스포츠·건강·패션", href: "/salon-des-cent/community/topics-B" },
      { icon: "📅", label: "요일별 클럽 모임", description: "매일 다른 테마의 모임", href: "/salon-des-cent/community/daily-club" },
      { icon: "👑", label: "멤버십", description: "패트론 전용 게시판·모임", href: "/salon-des-cent/community/membership" },
      { icon: "🖼️", label: "갤러리", description: "시상식·공연·파티 기록", href: "/salon-des-cent/community/gallery" },
    ],
  } satisfies GroupGridProps,
};
