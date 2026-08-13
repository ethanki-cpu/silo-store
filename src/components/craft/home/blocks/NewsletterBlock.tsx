"use client";

// EPIC-098: 미니멀 뉴스레터 섹션 — 광활한 상하 여백 + 중앙 정렬된 헤딩/폼.
// 시각적 컴포넌트만이다(실제 구독 백엔드 연동은 스코프 밖 — NEXT_TASK.md
// 참고). 제출 시 아무 동작도 하지 않도록 버튼을 type="button"으로 둔다.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "../editable";

export type NewsletterProps = { heading: string; subtitle: string; buttonText: string };

export function NewsletterBlock({ heading, subtitle, buttonText }: NewsletterProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Newsletter">
        <section className="flex flex-col items-center gap-6 border-t border-gray-200 px-6 py-32 text-center">
          <EditableText
            as="h2"
            value={heading}
            className="font-serif text-3xl font-normal text-gray-900"
            onCommit={(next) => setProp((p) => (p.heading = next))}
          />
          <EditableText
            as="p"
            value={subtitle}
            className="max-w-sm text-sm text-gray-500"
            onCommit={(next) => setProp((p) => (p.subtitle = next))}
          />
          <div className="flex w-full max-w-sm items-center gap-0 border-b border-gray-900">
            <input
              type="email"
              placeholder="이메일 주소"
              disabled
              className="w-full bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <button
              type="button"
              className="shrink-0 whitespace-nowrap py-2 text-xs font-medium uppercase tracking-wide text-gray-900"
            >
              <EditableText
                as="span"
                value={buttonText}
                onCommit={(next) => setProp((p) => (p.buttonText = next))}
              />
            </button>
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

NewsletterBlock.craft = {
  displayName: "NewsletterBlock",
  props: {
    heading: "사일로의 소식을 받아보세요",
    subtitle: "새로운 컬렉션과 살롱 소식을 가장 먼저 전해드립니다.",
    buttonText: "구독하기",
  } satisfies NewsletterProps,
};
