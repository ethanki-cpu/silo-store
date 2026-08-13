"use client";

// EPIC-098/EPIC-099 후속: 미니멀 뉴스레터 섹션 — 광활한 상하 여백 + 중앙
// 정렬된 헤딩/폼. 편집 모드(관리자가 Craft 에디터를 열었을 때)에서는 입력을
// 막아 실수로 제출되지 않게 하고(장식용 프리뷰), 공개 렌더링에서만
// POST /api/newsletter/subscribe로 실제 저장한다(최소 범위 — 발송 채널
// 연동은 스코프 밖, NEXT_TASK.md 참고).
import { useNode } from "@craftjs/core";
import { useState } from "react";
import { EditableText, EditableBlockFrame, useCraftEditable } from "../editable";

export type NewsletterProps = { heading: string; subtitle: string; buttonText: string };

type SubmitState = "idle" | "submitting" | "success" | "error";

export function NewsletterBlock({ heading, subtitle, buttonText }: NewsletterProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const editable = useCraftEditable();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editable || status === "submitting") return;
    setStatus("submitting");
    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setStatus("success");
      setEmail("");
    } else {
      setStatus("error");
    }
  }

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
          {status === "success" ? (
            <p className="text-sm text-gray-700">구독해주셔서 감사해요. 다음 소식부터 전해드릴게요.</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col items-center gap-2">
              <div className="flex w-full items-center gap-0 border-b border-gray-900">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  disabled={editable}
                  required
                  className="w-full bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-default"
                />
                <button
                  type="submit"
                  disabled={editable || status === "submitting"}
                  className="shrink-0 whitespace-nowrap py-2 text-xs font-medium uppercase tracking-wide text-gray-900 disabled:cursor-default"
                >
                  <EditableText
                    as="span"
                    value={status === "submitting" ? "처리 중..." : buttonText}
                    onCommit={(next) => setProp((p) => (p.buttonText = next))}
                  />
                </button>
              </div>
              {status === "error" && <p className="text-xs text-red-600">구독 처리에 실패했어요. 잠시 후 다시 시도해주세요.</p>}
            </form>
          )}
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
