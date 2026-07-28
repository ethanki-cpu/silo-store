import type { FormModuleProps } from "@/lib/pageModules";

// EPIC-054B: Page Module "Form" — docs/design-system.md §6의 인풋/라벨/버튼
// 패턴을 그대로 재사용한 구조적 폼 셸. 필드는 native name 속성으로만 식별돼
// caller가 FormData로 읽는다 — 별도 controlled state나 검증 로직은 만들지
// 않는다(콘텐츠/기능 추가 금지).
export function FormShell({ title, fields, submitLabel = "제출", onSubmit }: FormModuleProps) {
  return (
    <div>
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      <form className="space-y-4" onSubmit={onSubmit}>
        {fields.map((field) => (
          <div key={field.name}>
            {field.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" name={field.name} required={field.required} />
                {field.label}
              </label>
            ) : (
              <>
                <label className="block text-sm mb-1">
                  {field.label}
                  {field.required && " *"}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    required={field.required}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.name}
                    required={field.required}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                )}
              </>
            )}
          </div>
        ))}
        <button
          type="submit"
          className="w-full rounded-md bg-gray-800 text-white px-3 py-2"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
