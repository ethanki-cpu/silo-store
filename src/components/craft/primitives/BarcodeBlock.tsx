"use client";

import { useEffect, useRef } from "react";
import { useNode } from "@craftjs/core";
import JsBarcode from "jsbarcode";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { TextField, ColorField } from "@/components/craft/shared/FieldControls";

export type BarcodeBlockProps = {
  value: string;
  color: string;
};

export function BarcodeBlock({ value, color }: BarcodeBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!value) {
      svgRef.current.innerHTML = "";
      return;
    }
    try {
      JsBarcode(svgRef.current, value, { format: "CODE128", lineColor: color, width: 2, height: 60, displayValue: true, fontSize: 12 });
    } catch {
      svgRef.current.innerHTML = "";
    }
  }, [value, color]);

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="바코드">
        <div className="flex justify-center px-6 py-4">
          {value ? (
            <svg ref={svgRef} />
          ) : (
            <div className="flex h-20 w-48 items-center justify-center bg-gray-50 text-xs text-gray-400">내용을 입력하세요</div>
          )}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function BarcodeSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as BarcodeBlockProps }));

  return (
    <div className="space-y-3">
      <TextField label="내용(영문/숫자)" value={props.value} placeholder="1234567890" onChange={(v) => setProp((p) => { p.value = v; })} />
      <ColorField label="색상" value={props.color} onChange={(v) => setProp((p) => { p.color = v; })} fallback="#000000" />
    </div>
  );
}

BarcodeBlock.craft = {
  displayName: "BarcodeBlock",
  props: {
    value: "1234567890",
    color: "#000000",
  } satisfies BarcodeBlockProps,
  related: { settings: BarcodeSettings },
};
