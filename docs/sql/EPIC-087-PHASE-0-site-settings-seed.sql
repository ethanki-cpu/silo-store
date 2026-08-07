-- EPIC-087 PHASE-0: 이 EPIC 전체가 재사용할 site_settings 키 2개를 예약.
-- 이미 Management API로 즉시 실행 완료(라이브 반영됨, 2026-08-07).
--   - membership_guide_redirect: PHASE-C(페이지 리다이렉트)/PHASE-D(안내 페이지
--     설정 버튼)이 읽고 쓰는 리다이렉트 타겟 URL. 기본값은 임시로 /membership.
--   - footer_config: PHASE-G(Footer)가 읽고 쓰는 회사정보/법적고지/FAQ/부가메뉴/
--     소셜 링크 묶음. 빈 배열/객체로 시작 — 실제 값은 PHASE-G 관리자 화면에서
--     입력.
-- site_settings 자체는 기존 EPIC-023 시드(docs/database-schema.sql §13)에 이미
-- 정의된 key-value jsonb 저장소 — 새 테이블 없이 키만 추가.

insert into site_settings (setting_key, setting_value) values
  ('membership_guide_redirect', '{"url":"/membership"}'),
  ('footer_config', '{"company":{"name":"","representative":"","businessNumber":"","address":"","email":"","phone":""},"legalLinks":[],"faqLinks":[],"extraLinks":[],"socialLinks":[]}')
on conflict (setting_key) do nothing;

-- PHASE-G에서 footer_config의 필드명을 최종 확정(faq → faqLinks 등, Footer.tsx의
-- FooterConfig 타입과 일치) — 이미 위 값으로 update까지 실행 완료(2026-08-07).
