"use client";

import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import QRCode from "qrcode";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { TextField, NumberField, ColorField } from "@/components/craft/shared/FieldControls";

export type QRCodeBlockProps = {
  value: string;
  sizePx: number;
  color: string;
  background: string;
};

export function QRCodeBlock({ value, sizePx, color, background }: QRCodeBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(value, { width: sizePx, margin: 1, color: { dark: color, light: background } })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [value, sizePx, color, background]);

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="QR 코드">
        <div className="flex justify-center px-6 py-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR 코드" width={sizePx} height={sizePx} />
          ) : (
            <div
              className="flex items-center justify-center bg-gray-50 text-xs text-gray-400"
              style={{ width: sizePx, height: sizePx }}
            >
              내용을 입력하세요
            </div>
          )}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function QRCodeSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as QRCodeBlockProps }));

  return (
    <div className="space-y-3">
      <TextField
        label="내용(URL/텍스트)"
        value={props.value}
        placeholder="https://dev.silostore.net"
        onChange={(v) => setProp((p) => { p.value = v; })}
      />
      <NumberField label="크기(px)" min={64} max={480} value={props.sizePx} onChange={(v) => setProp((p) => { p.sizePx = v; })} fallback={160} />
      <ColorField label="전경색" value={props.color} onChange={(v) => setProp((p) => { p.color = v; })} fallback="#000000" />
      <ColorField label="배경색" value={props.background} onChange={(v) => setProp((p) => { p.background = v; })} fallback="#ffffff" />
    </div>
  );
}

QRCodeBlock.craft = {
  displayName: "QRCodeBlock",
  props: {
    value: "https://dev.silostore.net",
    sizePx: 160,
    color: "#000000",
    background: "#ffffff",
  } satisfies QRCodeBlockProps,
  related: { settings: QRCodeSettings },
};
