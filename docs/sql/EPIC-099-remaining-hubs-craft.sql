-- EPIC-099(항목 3, Phase 2): 살롱데상(/salon-des-cent), 스튜디오(/studio),
-- 마이 페이지(/mypage)를 Craft 빌더로 전환. 실행 완료(Management API,
-- 2026-08-13) — 사용자 지시로 agent가 직접 실행.
update page_builder set builder_type = 'craft', updated_at = now()
where slug in ('salon-des-cent', 'studio', 'mypage');
