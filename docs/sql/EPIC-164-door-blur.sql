-- EPIC-164 Phase 2: 프로스티드 글래스 규격(blur 24px) — Depth 1에 저장돼 있던 문 블러 오버라이드(15px)를 24px로. 재실행 안전.
update page_modules m set settings = jsonb_set(m.settings, '{depths,0,doorBlurPx}', '24'::jsonb)
from page_builder p
where p.id = m.page_id and p.slug = 'membership' and m.module_type = 'membership_depths'
  and jsonb_array_length(m.settings->'depths') > 0 and (m.settings->'depths'->0) ? 'doorBlurPx';
