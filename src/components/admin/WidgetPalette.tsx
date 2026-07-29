"use client";

import { WIDGET_GROUPS, PAGE_MODULE_LABELS, PAGE_MODULE_ICONS, type PageModuleType } from "@/lib/pageBuilder";

// EPIC-065: "+ 위젯 추가"를 누르면 뜨는 위젯 23종 선택 화면 — 기존의 단일
// <select> 드롭다운을 대체한다. 카테고리별로 묶어 아이콘+이름만으로
// 고르게 하고, 클릭 즉시 선택 위젯이 추가된다(운영자가 타입 문자열이나
// JSON을 직접 다루지 않음).
export function WidgetPalette({
  onSelect,
  onClose,
}: {
  onSelect: (type: PageModuleType) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="위젯 추가"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">위젯 추가</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-5">
          {WIDGET_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {group.label}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {group.types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onSelect(type)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 px-2 py-3 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xl" aria-hidden="true">
                      {PAGE_MODULE_ICONS[type]}
                    </span>
                    <span className="text-xs text-gray-700">{PAGE_MODULE_LABELS[type]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
