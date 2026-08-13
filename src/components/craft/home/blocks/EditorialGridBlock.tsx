"use client";

// EPIC-098: 3열 에디토리얼 그리드 — 썸네일 + 캡션(카테고리) + 세리프 제목
// 형태의 카드 3개를 나열. 격자보다는 "화보 리스트"에 가까운 룩을 위해
// 카드/그림자 없이 이미지-텍스트만으로 구성한다(design-system.md §10
// Editorial Board 언어와 동일한 규칙). 개별 카드는 별도 Craft 노드로
// 만들지 않고 items 배열 안에서 인덱스 단위로 setProp — 노드 트리를
// 단순하게 유지한다(계획서 참고).
import { useNode } from "@craftjs/core";
import { EditableText, EditableImage, EditableBlockFrame } from "../editable";

export type EditorialGridItem = { imageUrl: string; category: string; title: string; href: string };
export type EditorialGridProps = { heading: string; items: EditorialGridItem[] };

export function EditorialGridBlock({ heading, items }: EditorialGridProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateItem(index: number, patch: Partial<EditorialGridItem>) {
    setProp((p) => {
      p.items = (p.items as EditorialGridItem[]).map((it: EditorialGridItem, i: number) => (i === index ? { ...it, ...patch } : it));
    });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Editorial Grid">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <EditableText
            as="h2"
            value={heading}
            className="mb-10 font-serif text-2xl font-normal text-gray-900"
            onCommit={(next) => setProp((p) => (p.heading = next))}
          />
          <div className="grid grid-cols-1 gap-10 @[768px]:grid-cols-3">
            {items.map((item, i) => (
              <a key={i} href={item.href} className="block">
                <EditableImage
                  src={item.imageUrl}
                  alt={item.title}
                  className="aspect-[4/3] w-full object-cover"
                  onCommit={(next) => updateItem(i, { imageUrl: next })}
                />
                <EditableText
                  as="span"
                  value={item.category}
                  className="mt-4 block text-xs font-medium uppercase tracking-wide text-gray-400"
                  onCommit={(next) => updateItem(i, { category: next })}
                />
                <EditableText
                  as="h3"
                  value={item.title}
                  className="mt-1 font-serif text-lg text-gray-900"
                  onCommit={(next) => updateItem(i, { title: next })}
                />
              </a>
            ))}
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

EditorialGridBlock.craft = {
  displayName: "EditorialGridBlock",
  props: {
    heading: "최근 이야기들",
    items: [
      {
        imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=80&auto=format",
        category: "Online Docent",
        title: "빅토리안 시대의 응접실",
        href: "/online-docent",
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80&auto=format",
        category: "Silo Store",
        title: "한 권의 책이 건너온 시간",
        href: "/silo-store",
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=800&q=80&auto=format",
        category: "Salon des Cent",
        title: "이달의 살롱 노트",
        href: "/salon-des-cent",
      },
    ],
  } satisfies EditorialGridProps,
};
