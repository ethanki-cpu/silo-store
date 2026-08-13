"use client";

// EPIC-099(항목 3, Phase 2): 마이 페이지 디렉토리 — TreasureGridBlock 계열과
// 같은 아이콘+라벨 그리드, 항목은 실제 nav 구조(navConfig.ts key:"mypage")의
// 3개 최상위 그룹(My Collections/My Silo Timeline/My Story)으로 채운다
// (사용자 지시: "페이지별 전용 블록 새로 제작").
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";

export type MypageGridItem = { icon: string; label: string; description: string; href: string };
export type MypageGridProps = { heading: string; subheading: string; items: MypageGridItem[] };

export function MypageGridBlock({ heading, subheading, items }: MypageGridProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<MypageGridItem>) {
    setProp((p) => {
      p.items = (p.items as MypageGridItem[]).map((it: MypageGridItem, i: number) =>
        i === index ? { ...it, ...patch } : it,
      );
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Mypage Grid">
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
          <div className="grid grid-cols-1 gap-4 @[768px]:grid-cols-3">
            {items.map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 px-4 py-8 text-center transition-colors hover:border-gray-400"
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

MypageGridBlock.craft = {
  displayName: "MypageGridBlock",
  props: {
    heading: "마이 페이지 둘러보기",
    subheading: "나를 중심으로 모아둔 세 갈래 기록",
    items: [
      {
        icon: "🗃️",
        label: "My Collections",
        description: "나의 보물·책·영화·음악·아티스트",
        href: "/mypage/my-collections",
      },
      {
        icon: "🕰️",
        label: "My Silo Timeline",
        description: "나의 뱃지·좋아요·글·댓글·팔로우",
        href: "/mypage/my-silo-timeline",
      },
      {
        icon: "📖",
        label: "My Story",
        description: "나의 전시회·버킷리스트·마음일기",
        href: "/mypage/my-story",
      },
    ],
  } satisfies MypageGridProps,
};
