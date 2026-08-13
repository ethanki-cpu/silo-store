-- EPIC-099(항목 3, Phase 2): 사일로 상점(/silo-store)을 홈페이지에 이어
-- 두 번째로 Craft.js 빌더로 전환한다 — 전용 블록(ShopHeroBlock 등)이
-- src/components/craft/shop/에 준비된 뒤 이 시점에 플래그를 뒤집는다.
-- 이미 Management API로 즉시 실행 완료(라이브 반영됨, 2026-08-13).

update page_builder set builder_type = 'craft', updated_at = now() where slug = 'silo-store';
