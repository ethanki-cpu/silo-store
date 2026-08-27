"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { TextField, TextAreaField, CheckboxField, ListFieldWrapper, ListItemCard } from "@/components/craft/shared/FieldControls";

export type PricingPlan = {
  name: string;
  price: string;
  period: string;
  featuresText: string; // 줄바꿈으로 구분된 기능 목록
  ctaLabel: string;
  ctaHref: string;
  highlighted: boolean;
};

export type PricingCardsBlockProps = {
  plans: PricingPlan[];
};

export function PricingCardsBlock({ plans }: PricingCardsBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="요금제 카드">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6 px-6 py-10">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`w-64 shrink-0 rounded-lg border p-6 text-center ${plan.highlighted ? "border-gray-900 shadow-lg" : "border-gray-200"}`}
            >
              <EditableText
                as="p"
                value={plan.name}
                onCommit={(next) => setProp((p) => { p.plans[i].name = next; })}
                className="text-sm font-semibold uppercase tracking-wide text-gray-500"
                placeholder="플랜 이름"
              />
              <div className="mt-2 flex items-end justify-center gap-1">
                <EditableText
                  as="span"
                  value={plan.price}
                  onCommit={(next) => setProp((p) => { p.plans[i].price = next; })}
                  className="font-serif text-3xl font-semibold text-gray-900"
                  placeholder="0원"
                />
                <EditableText
                  as="span"
                  value={plan.period}
                  onCommit={(next) => setProp((p) => { p.plans[i].period = next; })}
                  className="pb-1 text-xs text-gray-400"
                  placeholder="/월"
                />
              </div>
              <ul className="mt-4 space-y-1.5 text-left text-xs text-gray-600">
                {plan.featuresText.split("\n").filter(Boolean).map((f, fi) => (
                  <li key={fi} className="flex gap-1.5">
                    <span aria-hidden className="text-gray-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaHref || "#"}
                className={`mt-5 block rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  plan.highlighted ? "bg-gray-900 text-white hover:bg-gray-700" : "border border-gray-900 text-gray-900 hover:bg-gray-100"
                }`}
              >
                {plan.ctaLabel}
              </a>
            </div>
          ))}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function PricingCardsSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as PricingCardsBlockProps }));

  return (
    <div className="space-y-3">
      <ListFieldWrapper
        label="요금제"
        count={props.plans.length}
        onAdd={() =>
          setProp((p) => {
            p.plans = [
              ...p.plans,
              { name: "새 플랜", price: "0원", period: "/월", featuresText: "기능 1\n기능 2", ctaLabel: "선택하기", ctaHref: "", highlighted: false },
            ];
          })
        }
      >
        {props.plans.map((plan, i) => (
          <ListItemCard key={i} onRemove={() => setProp((p) => { p.plans = props.plans.filter((_, idx) => idx !== i); })}>
            <TextField label="플랜 이름" value={plan.name} onChange={(v) => setProp((p) => { p.plans[i].name = v; })} />
            <TextField label="가격" value={plan.price} onChange={(v) => setProp((p) => { p.plans[i].price = v; })} />
            <TextField label="주기(예: /월)" value={plan.period} onChange={(v) => setProp((p) => { p.plans[i].period = v; })} />
            <TextAreaField
              label="기능(줄바꿈으로 구분)"
              value={plan.featuresText}
              rows={3}
              onChange={(v) => setProp((p) => { p.plans[i].featuresText = v; })}
            />
            <TextField label="버튼 문구" value={plan.ctaLabel} onChange={(v) => setProp((p) => { p.plans[i].ctaLabel = v; })} />
            <TextField label="버튼 링크" value={plan.ctaHref} onChange={(v) => setProp((p) => { p.plans[i].ctaHref = v; })} />
            <CheckboxField label="강조 표시" checked={plan.highlighted} onChange={(v) => setProp((p) => { p.plans[i].highlighted = v; })} />
          </ListItemCard>
        ))}
      </ListFieldWrapper>
    </div>
  );
}

PricingCardsBlock.craft = {
  displayName: "PricingCardsBlock",
  props: {
    plans: [
      { name: "Basic", price: "0원", period: "", featuresText: "기본 열람\n커뮤니티 참여", ctaLabel: "시작하기", ctaHref: "", highlighted: false },
      { name: "Patron", price: "10,000원", period: "/월", featuresText: "전체 열람\n살롱 참여\n한정 굿즈", ctaLabel: "가입하기", ctaHref: "", highlighted: true },
    ],
  } satisfies PricingCardsBlockProps,
  related: { settings: PricingCardsSettings },
};
