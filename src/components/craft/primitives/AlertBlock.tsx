"use client";

import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame } from "@/components/craft/home/editable";
import { SelectField } from "@/components/craft/shared/FieldControls";

export type AlertVariant = "info" | "success" | "warning" | "error";

export type AlertBlockProps = {
  message: string;
  variant: AlertVariant;
};

const VARIANT_CLASS: Record<AlertVariant, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  success: "bg-green-50 border-green-200 text-green-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  error: "bg-red-50 border-red-200 text-red-800",
};

const VARIANT_ICON: Record<AlertVariant, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "⛔",
};

export function AlertBlock({ message, variant }: AlertBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="알림">
        <div className="px-6 py-3">
          <div className={`flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${VARIANT_CLASS[variant]}`}>
            <span aria-hidden>{VARIANT_ICON[variant]}</span>
            <EditableText
              as="span"
              value={message}
              onCommit={(next) => setProp((p) => { p.message = next; })}
              className="flex-1"
              placeholder="알림 문구를 입력하세요"
            />
          </div>
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function AlertSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as AlertBlockProps }));

  return (
    <div className="space-y-3">
      <SelectField
        label="종류"
        value={props.variant}
        onChange={(v) => setProp((p) => { p.variant = v; })}
        options={[
          { value: "info", label: "안내" },
          { value: "success", label: "성공" },
          { value: "warning", label: "경고" },
          { value: "error", label: "오류" },
        ]}
      />
    </div>
  );
}

AlertBlock.craft = {
  displayName: "AlertBlock",
  props: {
    message: "안내 문구를 입력하세요",
    variant: "info",
  } satisfies AlertBlockProps,
  related: { settings: AlertSettings },
};
