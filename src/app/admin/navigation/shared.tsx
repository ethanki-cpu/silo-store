"use client";

import { useEffect, useState } from "react";

// EPIC-025: top-tabs / sidebar-left / sidebar-right 3개 페이지가 공유하는
// 타입/상수/공용 UI. site_navigations 관리 페이지가 target_type별로 3개로
// 쪼개지면서 각 페이지가 똑같이 필요로 하는 트리 편집 UI(NavNodeEditor)와
// 스타일 상수를 여기 한 곳에 모아둔다. 이 파일 자체는 page.tsx/layout.tsx가
// 아니라 라우트로 취급되지 않는 일반 모듈이다.
//
// EPIC-027: 필드를 고칠 때마다 onBlur/onChange로 즉시 저장(암묵적 autosave)하던
// 방식은 사용자에게 "저장됐는지" 아무 피드백도 주지 않아 "고쳤는데 반영이
// 안 된다"는 버그처럼 느껴졌다. 이제 입력은 로컬 draft 상태로만 반영하고,
// 명시적인 "저장" 버튼을 눌러야 실제로 update가 나가며, 성공 시 인라인
// 피드백을 보여준다.

export type TargetType = "tab" | "sidebar_left" | "sidebar_right" | "dropdown";

export type NavRow = {
  id: string;
  key: string | null;
  title: string;
  href: string | null;
  parent_id: string | null;
  target_type: TargetType;
  sort_order: number;
  is_active: boolean;
};

export type CategoryDomain = "shop" | "salon" | "collection" | "docent";

export type CategoryRow = {
  id: string;
  domain: CategoryDomain;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

export const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: "tab", label: "단일 링크 (tab)" },
  { value: "sidebar_left", label: "좌측 사이드바 (sidebar_left)" },
  { value: "sidebar_right", label: "우측 사이드바 (sidebar_right)" },
  { value: "dropdown", label: "드롭다운 (dropdown)" },
];

export const DOMAIN_OPTIONS: { value: CategoryDomain; label: string }[] = [
  { value: "shop", label: "상점" },
  { value: "salon", label: "살롱" },
  { value: "collection", label: "컬렉션" },
  { value: "docent", label: "도슨트" },
];

export const inputClass =
  "w-full rounded-md border border-gray-300 px-2 py-1 text-sm";
export const smallButtonClass =
  "rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50";
export const primaryButtonClass =
  "rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50";
export const saveButtonClass =
  "rounded-md bg-gray-800 text-white px-2 py-1 text-xs disabled:opacity-40";

type NavDraft = {
  key: string;
  title: string;
  href: string;
  targetType: TargetType;
  sortOrder: number;
  isActive: boolean;
};

function draftFromNode(node: NavRow): NavDraft {
  return {
    key: node.key ?? "",
    title: node.title,
    href: node.href ?? "",
    targetType: node.target_type,
    sortOrder: node.sort_order,
    isActive: node.is_active,
  };
}

function isNavDirty(draft: NavDraft, node: NavRow): boolean {
  return (
    draft.key !== (node.key ?? "") ||
    draft.title !== node.title ||
    draft.href !== (node.href ?? "") ||
    draft.targetType !== node.target_type ||
    draft.sortOrder !== node.sort_order ||
    draft.isActive !== node.is_active
  );
}

export function NavNodeEditor({
  node,
  depth,
  allRows,
  onUpdate,
  onDelete,
  onAddChild,
  showTypeSelect = true,
}: {
  node: NavRow;
  depth: number;
  allRows: NavRow[];
  /** 저장 성공 시 true, 실패 시 false를 반환해야 한다(에러 메시지는 호출부에서 별도 표시). */
  onUpdate: (id: string, patch: Partial<NavRow>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, targetType: TargetType) => void;
  /** 최상위 노드의 target_type 셀렉트를 보여줄지 여부 (top-tabs 페이지에서만 true) */
  showTypeSelect?: boolean;
}) {
  const [draft, setDraft] = useState<NavDraft>(() => draftFromNode(node));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // 부모가 loadAll()로 새로 불러온 값(예: 다른 사람의 저장, 삭제 후 재조회)이
  // 들어오면 draft도 그 값으로 재동기화한다.
  useEffect(() => {
    setDraft(draftFromNode(node));
  }, [node]);

  const dirty = isNavDirty(draft, node);

  const children = allRows
    .filter((r) => r.parent_id === node.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function handleSave() {
    setSaving(true);
    setSavedFlash(false);
    const ok = await onUpdate(node.id, {
      key: depth === 0 ? draft.key || null : undefined,
      title: draft.title,
      href: draft.href || null,
      target_type: depth === 0 ? draft.targetType : undefined,
      sort_order: draft.sortOrder,
      is_active: draft.isActive,
    });
    setSaving(false);
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  }

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2">
        {depth === 0 && (
          <input
            className={`${inputClass} w-28`}
            value={draft.key}
            placeholder="key"
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          />
        )}
        <input
          className={inputClass}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <input
          className={inputClass}
          value={draft.href}
          placeholder="href"
          onChange={(e) => setDraft({ ...draft, href: e.target.value })}
        />
        {depth === 0 && showTypeSelect && (
          <select
            className={inputClass}
            value={draft.targetType}
            onChange={(e) =>
              setDraft({ ...draft, targetType: e.target.value as TargetType })
            }
          >
            {TARGET_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <input
          type="number"
          className={`${inputClass} w-16`}
          value={draft.sortOrder}
          onChange={(e) =>
            setDraft({ ...draft, sortOrder: Number(e.target.value) })
          }
        />
        <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) =>
              setDraft({ ...draft, isActive: e.target.checked })
            }
          />
          활성
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className={saveButtonClass}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {savedFlash && (
          <span className="text-xs text-green-600">저장됐어요.</span>
        )}
        <button
          type="button"
          onClick={() => onAddChild(node.id, node.target_type)}
          className={smallButtonClass}
        >
          하위 추가
        </button>
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          className={smallButtonClass}
        >
          삭제
        </button>
      </div>

      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <NavNodeEditor
              key={child.id}
              node={child}
              depth={depth + 1}
              allRows={allRows}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              showTypeSelect={showTypeSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type CategoryDraft = {
  name: string;
  slug: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
};

function draftFromCategory(cat: CategoryRow): CategoryDraft {
  return {
    name: cat.name,
    slug: cat.slug,
    parentId: cat.parent_id ?? "",
    sortOrder: cat.sort_order,
    isActive: cat.is_active,
  };
}

function isCategoryDirty(draft: CategoryDraft, cat: CategoryRow): boolean {
  return (
    draft.name !== cat.name ||
    draft.slug !== cat.slug ||
    draft.parentId !== (cat.parent_id ?? "") ||
    draft.sortOrder !== cat.sort_order ||
    draft.isActive !== cat.is_active
  );
}

export function CategoryRowEditor({
  category,
  siblingOptions,
  onUpdate,
  onDelete,
}: {
  category: CategoryRow;
  /** 상위 카테고리 셀렉트에 보여줄 같은 domain의 다른 카테고리들 (자기 자신 제외) */
  siblingOptions: CategoryRow[];
  onUpdate: (id: string, patch: Partial<CategoryRow>) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<CategoryDraft>(() =>
    draftFromCategory(category),
  );
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(draftFromCategory(category));
  }, [category]);

  const dirty = isCategoryDirty(draft, category);

  async function handleSave() {
    setSaving(true);
    setSavedFlash(false);
    const ok = await onUpdate(category.id, {
      name: draft.name,
      slug: draft.slug,
      parent_id: draft.parentId || null,
      sort_order: draft.sortOrder,
      is_active: draft.isActive,
    });
    setSaving(false);
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2">
      <input
        className={inputClass}
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <input
        className={inputClass}
        value={draft.slug}
        onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
      />
      <select
        className={inputClass}
        value={draft.parentId}
        onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
      >
        <option value="">최상위</option>
        {siblingOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        className={`${inputClass} w-20`}
        value={draft.sortOrder}
        onChange={(e) =>
          setDraft({ ...draft, sortOrder: Number(e.target.value) })
        }
      />
      <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
        />
        활성
      </label>
      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className={saveButtonClass}
      >
        {saving ? "저장 중..." : "저장"}
      </button>
      {savedFlash && <span className="text-xs text-green-600">저장됐어요.</span>}
      <button type="button" onClick={() => onDelete(category.id)} className={smallButtonClass}>
        삭제
      </button>
    </div>
  );
}
