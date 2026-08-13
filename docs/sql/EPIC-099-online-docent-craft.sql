-- EPIC-099(항목 3, Phase 2): 온라인 도슨트(/online-docent)를 Craft 빌더로 전환.
-- 실행 완료(Management API, 2026-08-13).
update page_builder set builder_type = 'craft', updated_at = now() where slug = 'online-docent';
