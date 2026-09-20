"use client";

// EPIC-105: 기존 /admin/footer(폼 기반, site_settings.footer_config)가
// 관리하던 사업자정보를 Craft 블록으로 옮긴 것 — 전부 더블클릭 인라인 편집
// (이 레포의 기존 Craft 블록 관례 그대로, 별도 폼 없음).
//
// EPIC-158.0(토스페이먼츠 심사 요건 — 전자상거래법상 사업자 정보 표시): 항목마다 라벨을 붙여
// 상호/대표자/사업자등록번호/통신판매업 신고번호/주소/전화/이메일/개인정보보호책임자/호스팅
// 서비스 제공자를 표시한다. 이 블록의 값은 약관/개인정보처리방침/환불 정책/가격 페이지도 그대로
// 읽어 쓰는 사업자 정보의 단일 출처다(src/lib/businessInfo.ts).
//
// 빈 선택 필드는 편집 모드에서만 "텍스트를 입력하세요" placeholder를 보여주고, 공개 화면에서는
// 아예 렌더링하지 않는다 — EditableText 기본 동작(값이 비면 placeholder를 방문자에게도 그대로
// 보여줌)을 그대로 쓰면 실제 방문자에게 매 페이지 하단에 깨진 것처럼 보이는 문구가 노출된다.
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";

export type FooterCompanyInfoProps = {
  name: string;
  representative: string;
  businessNumber: string;
  mailOrderNumber?: string;
  address: string;
  email: string;
  phone: string;
  privacyOfficer?: string;
  hostingProvider?: string;
};

type Field = keyof FooterCompanyInfoProps;

export function FooterCompanyInfoBlock({
  name,
  representative,
  businessNumber,
  mailOrderNumber = "",
  address,
  email,
  phone,
  privacyOfficer = "",
  hostingProvider = "Vercel Inc.",
}: FooterCompanyInfoProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const editable = useCraftEditable();

  function line(label: string, value: string, field: Field) {
    if (!editable && !value) return null;
    return (
      <p>
        <span className="text-gray-400">{label} </span>
        <EditableText as="span" value={value} onCommit={(next) => setProp((p) => { p[field] = next; })} />
      </p>
    );
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="사업자 정보">
        <div className="space-y-0.5 text-xs text-gray-500">
          {(editable || name) && (
            <p className="font-medium text-gray-700">
              <EditableText as="span" value={name} onCommit={(next) => setProp((p) => { p.name = next; })} />
            </p>
          )}
          {line("대표자", representative, "representative")}
          {line("사업자등록번호", businessNumber, "businessNumber")}
          {line("통신판매업 신고번호", mailOrderNumber, "mailOrderNumber")}
          {line("주소", address, "address")}
          {line("전화", phone, "phone")}
          {line("이메일", email, "email")}
          {line("개인정보보호책임자", privacyOfficer, "privacyOfficer")}
          {line("호스팅 서비스 제공", hostingProvider, "hostingProvider")}
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
    mailOrderNumber: "",
    address: "",
    email: "",
    phone: "",
    privacyOfficer: "",
    hostingProvider: "Vercel Inc.",
  } satisfies FooterCompanyInfoProps,
};
