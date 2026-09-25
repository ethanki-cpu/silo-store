"use client";

import { useState } from "react";
import { uploadFileToR2 } from "@/lib/r2Upload";
import type { FieldDef, ListItemFieldDef } from "@/lib/widgetSchema";

// HOTFIX-163.4: 목록 항목의 이미지 칸 — 파일을 올리거나 URL을 붙여넣고, 미리보기/지우기를 제공한다.
function ImageItemField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const { url, error } = await uploadFileToR2(file);
    setBusy(false);
    if (error || !url) setErr(error ?? "업로드에 실패했어요.");
    else onChange(url);
  }
  return (
    <div className="space-y-1 rounded-md border border-dashed border-gray-300 p-2">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-24 w-24 rounded border border-gray-200 bg-gray-50 object-contain" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">
          {busy ? "업로드 중..." : value ? "다른 이미지 올리기" : "이미지 올리기"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-red-500">
            지우기
          </button>
        )}
      </div>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="또는 이미지 URL 붙여넣기" className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs" />
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

// EPIC-065: Visual Widget Builder의 핵심 규칙 — 운영자는 JSON을 절대 직접
// 입력하지 않는다. 위젯 23종 전부가 이 하나의 스키마 기반 폼으로 설정되고
// (체크박스/드롭다운/텍스트/숫자/목록), 이 컴포넌트가 그 유일한 통로다.
// settings(jsonb)는 여전히 내부 저장 형태지만, 그 값을 만들고 읽는 것은
// 전부 타입이 정해진 필드 입력을 통해서만 이뤄진다.

type ListValue = Record<string, string>[];

function ListFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Extract<FieldDef, { kind: "list" }>;
  value: unknown;
  onChange: (next: ListValue) => void;
}) {
  const items: ListValue = Array.isArray(value) ? (value as ListValue) : [];

  function updateItem(index: number, key: string, itemValue: string) {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: itemValue } : item));
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addItem() {
    const blank: Record<string, string> = {};
    for (const f of field.itemFields) blank[f.key] = "";
    onChange([...items, blank]);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="rounded-md border border-gray-200 p-2 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <div className="flex-1 space-y-1.5">
                {field.itemFields.map((itemField: ListItemFieldDef) =>
                  itemField.kind === "image" ? (
                    <ImageItemField key={itemField.key} label={itemField.label} value={item[itemField.key] ?? ""} onChange={(v) => updateItem(index, itemField.key, v)} />
                  ) : itemField.kind === "textarea" ? (
                    <textarea
                      key={itemField.key}
                      value={item[itemField.key] ?? ""}
                      onChange={(e) => updateItem(index, itemField.key, e.target.value)}
                      placeholder={itemField.label}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    />
                  ) : (
                    <input
                      key={itemField.key}
                      type="text"
                      value={item[itemField.key] ?? ""}
                      onChange={(e) => updateItem(index, itemField.key, e.target.value)}
                      placeholder={itemField.placeholder ?? itemField.label}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    />
                  ),
                )}
              </div>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  aria-label="위로 이동"
                  className="rounded border border-gray-200 px-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="아래로 이동"
                  className="rounded border border-gray-200 px-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label="삭제"
                  className="rounded border border-gray-200 px-1 text-xs text-red-500 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-1.5 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
      >
        {field.addLabel}
      </button>
    </div>
  );
}

export function WidgetInspectorForm({
  fields,
  settings,
  onChange,
}: {
  fields: FieldDef[];
  settings: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  function setField(key: string, value: unknown) {
    onChange({ ...settings, [key]: value });
  }

  if (fields.length === 0) {
    return <p className="text-xs text-gray-400">이 위젯은 별도 설정이 없어요.</p>;
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        switch (field.kind) {
          case "text":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={typeof settings[field.key] === "string" ? (settings[field.key] as string) : ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                />
              </div>
            );
          case "textarea":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <textarea
                  value={typeof settings[field.key] === "string" ? (settings[field.key] as string) : ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                />
              </div>
            );
          case "number":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={typeof settings[field.key] === "number" ? (settings[field.key] as number) : ""}
                  onChange={(e) => setField(field.key, e.target.value === "" ? undefined : Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                />
              </div>
            );
          case "checkbox":
            return (
              <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    typeof settings[field.key] === "boolean" ? (settings[field.key] as boolean) : true
                  }
                  onChange={(e) => setField(field.key, e.target.checked)}
                  className="rounded border-gray-300"
                />
                {field.label}
              </label>
            );
          case "select":
            return (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <select
                  value={typeof settings[field.key] === "string" ? (settings[field.key] as string) : ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          case "list":
            return (
              <ListFieldEditor
                key={field.key}
                field={field}
                value={settings[field.key]}
                onChange={(next) => setField(field.key, next)}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
