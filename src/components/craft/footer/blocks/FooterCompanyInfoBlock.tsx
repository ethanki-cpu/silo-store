"use client";

// EPIC-105: 기존 /admin/footer(폼 기반, site_settings.footer_config)가
// 관리하던 사업자정보를 Craft 블록으로 옮긴 것 — 필드 구조는 FooterConfig의
// company와 동일(대표/사업자등록번호/주소/이메일/전화), 전부 더블클릭
// 인라인 편집(이 레포의 기존 Craft 블록 관례 그대로, 별도 폼 없음).
//
// 빈 선택 필드(사업자등록번호/전화/주소)는 편집 모드에서만 "텍스트를
// 입력하세요" placeholder를 보여주고, 공개 화면에서는 아예 렌더링하지
// 않는다 — EditableText 기본 동작(값이 비면 placeholder를 방문자에게도
// 그대로 보여줌)을 그대로 쓰면 실제 방문자에게 매 페이지 하단에 깨진
// 것처럼 보이는 문구가 노출된다(기존 Footer.tsx는 `company.address && ...`
// 식으로 빈 필드를 조건부로 숨겼었다 — 그 동작을 유지).
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";

export type FooterCompanyInfoProps = {
  name: string;
  representative: string;
  businessNumber: string;
  address: string;
  email: string;
  phone: string;
};

export function FooterCompanyInfoBlock({ name, representative, businessNumber, address, email, phone }: FooterCompanyInfoProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const editable = useCraftEditable();

  function editableField(value: string, field: keyof FooterCompanyInfoProps, className?: string) {
    if (!editable && !value) return null;
    return (
      <EditableText
        as="span"
        value={value}
        onCommit={(next) => setProp((p) => { p[field] = next; })}
        className={className}
      />
    );
  }

  const repOrBiz = editable || representative || businessNumber;
  const emailOrPhone = editable || email || phone;

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="사업자 정보">
        <div className="space-y-0.5 text-xs text-gray-500">
          {editableField(name, "name", "block font-medium text-gray-700")}
          {repOrBiz && (
            <p>
              {editableField(representative, "representative")}
              {(editable || (representative && businessNumber)) && " · "}
              {editableField(businessNumber, "businessNumber")}
            </p>
          )}
          {editableField(address, "address", "block")}
          {emailOrPhone && (
            <p>
              {editableField(email, "email")}
              {(editable || (email && phone)) && " · "}
              {editableField(phone, "phone")}
            </p>
          )}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

FooterCompanyInfoBlock.craft = {
  displayName: "FooterCompanyInfoBlock",
  props: {
    name: "",
    representative: "",
    businessNumber: "",
    address: "",
    email: "",
    phone: "",
  } satisfies FooterCompanyInfoProps,
};
