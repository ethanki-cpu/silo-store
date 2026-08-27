"use client";

import { useNode } from "@craftjs/core";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { CheckboxField } from "@/components/craft/shared/FieldControls";

export type DataTableBlockProps = {
  rows: string[][];
  hasHeader: boolean;
};

export function DataTableBlock({ rows, hasHeader }: DataTableBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  function updateCell(r: number, c: number, value: string) {
    setProp((p) => { p.rows[r][c] = value; });
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="데이터 테이블">
        <div className="overflow-x-auto px-6 py-4">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className={hasHeader && r === 0 ? "bg-gray-50 font-semibold" : undefined}>
                  {row.map((cell, c) => (
                    <td key={c} className="border border-gray-200 p-0">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(r, c, e.target.value)}
                        className="w-full bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-gray-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function DataTableSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as DataTableBlockProps }));
  const colCount = props.rows[0]?.length ?? 0;

  function addRow() {
    const next = [...props.rows, Array.from({ length: colCount }, () => "")];
    setProp((p) => { p.rows = next; });
  }
  function removeRow() {
    if (props.rows.length <= 1) return;
    const next = props.rows.slice(0, -1);
    setProp((p) => { p.rows = next; });
  }
  function addColumn() {
    const next = props.rows.map((row) => [...row, ""]);
    setProp((p) => { p.rows = next; });
  }
  function removeColumn() {
    if (colCount <= 1) return;
    const next = props.rows.map((row) => row.slice(0, -1));
    setProp((p) => { p.rows = next; });
  }

  return (
    <div className="space-y-3">
      <CheckboxField label="첫 행을 헤더로 표시" checked={props.hasHeader} onChange={(v) => setProp((p) => { p.hasHeader = v; })} />
      <div className="flex gap-1.5">
        <button type="button" onClick={addRow} className="flex-1 rounded border border-gray-300 py-1 text-xs hover:bg-gray-50">
          + 행
        </button>
        <button type="button" onClick={removeRow} className="flex-1 rounded border border-gray-300 py-1 text-xs hover:bg-gray-50">
          − 행
        </button>
        <button type="button" onClick={addColumn} className="flex-1 rounded border border-gray-300 py-1 text-xs hover:bg-gray-50">
          + 열
        </button>
        <button type="button" onClick={removeColumn} className="flex-1 rounded border border-gray-300 py-1 text-xs hover:bg-gray-50">
          − 열
        </button>
      </div>
      <p className="text-[10px] text-gray-400">셀 내용은 캔버스에서 직접 입력창을 클릭해 편집하세요.</p>
    </div>
  );
}

DataTableBlock.craft = {
  displayName: "DataTableBlock",
  props: {
    rows: [
      ["항목", "설명", "가격"],
      ["아르누보 유리 램프", "1900년대 초반", "180,000원"],
      ["로코코 화병", "18세기 복각", "95,000원"],
    ],
    hasHeader: true,
  } satisfies DataTableBlockProps,
  related: { settings: DataTableSettings },
};
