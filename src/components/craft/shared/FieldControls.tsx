"use client";

// EPIC-XXX(Craft 블록 팔레트 확장): 새 블록마다 반복되던 "label + input"
// 마크업(TextBlock.tsx/ButtonBlock.tsx 등에 이미 수십 번 반복돼 있던 패턴)을
// 공용 필드 컴포넌트 몇 개로 뽑았다 — 기존 블록들의 시각 스타일(text-xs
// text-gray-600 라벨, rounded border-gray-300 px-2 py-1 입력창)을 그대로
// 유지해 새 블록도 기존 설정 패널과 구분 없이 자연스럽게 섞인다.

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  fallback = 0,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  fallback?: number;
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || fallback)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
      />
    </label>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  fallback = "#111111",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  fallback?: string;
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 shrink-0 cursor-pointer rounded border border-gray-300 p-0.5"
        />
        <input
          type="text"
          value={value}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </div>
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// 배열 필드(요금제/기능 카드/이미지 콜라주 등 "N개의 항목" 블록 공통) —
// 항목 추가/삭제 버튼 + 각 항목을 감싸는 카드 레이아웃.
export function ListFieldWrapper({
  label,
  count,
  onAdd,
  addLabel = "+ 항목 추가",
  children,
}: {
  label: string;
  count: number;
  onAdd: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold text-gray-500">
        {label} ({count})
      </h4>
      <div className="space-y-2">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-1.5 block w-full rounded border border-dashed border-gray-300 py-1.5 text-center text-xs text-gray-500 hover:border-gray-400"
      >
        {addLabel}
      </button>
    </div>
  );
}

export function ListItemCard({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 rounded border border-gray-200 p-2">
      {children}
      <button type="button" onClick={onRemove} className="text-[10px] text-red-500 hover:underline">
        삭제
      </button>
    </div>
  );
}
