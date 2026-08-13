"use client";

// EPIC-105: 하단 Footer의 기본 트리 — 다른 Craft 페밀리(shop 등)와 동일한
// "컴포넌트가 아니라 값" 패턴(EPIC-098에서 겪은 래퍼 컴포넌트 버그 회피).
// 초깃값은 기존 site_settings.footer_config에 실제로 저장돼 있던 값을
// Management API로 조회해 그대로 옮겼다(회사명/대표자/이메일 — 마이그레이션
// 손실 없음, 나머지 필드는 원래도 비어 있었음).
import { Element } from "@craftjs/core";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { ContainerBlock } from "@/components/craft/primitives";
import { FooterCompanyInfoBlock } from "./blocks/FooterCompanyInfoBlock";
import { FooterLinksRowBlock } from "./blocks/FooterLinksRowBlock";

const companyInfoProps = {
  name: "사일로상점 / 살롱데상",
  representative: "채춘자 / 김수미",
  businessNumber: "",
  address: "",
  email: "ethanki@silostore.net",
  phone: "",
};

const linksRowProps = {
  items: [
    { label: "About Silo", href: "/about-silo" },
    { label: "이용약관", href: "#" },
    { label: "개인정보처리방침", href: "#" },
  ],
  openInNewTab: false,
};

const socialLinksRowProps = { items: [], openInNewTab: true };

export const footerDefaultTree = (
  <Element is={RootContainer} canvas id="ROOT">
    <Element canvas is={ContainerBlock} layout="col" gap={16} paddingY={32} paddingX={32} background="#f9fafb" maxWidthPx={896} align="start">
      <FooterCompanyInfoBlock {...companyInfoProps} />
      <FooterLinksRowBlock {...linksRowProps} />
      <FooterLinksRowBlock {...socialLinksRowProps} />
    </Element>
  </Element>
);

export const footerBlockOptions = [
  { label: "사업자 정보", buildElement: () => <FooterCompanyInfoBlock {...FooterCompanyInfoBlock.craft.props} /> },
  { label: "링크 행", buildElement: () => <FooterLinksRowBlock {...FooterLinksRowBlock.craft.props} /> },
];
