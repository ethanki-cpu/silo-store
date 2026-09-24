-- HOTFIX-162.12: (1) /membership 캐러셀 아래 "권한 비교표" 위젯 추가, (2) 상단 아이콘 2(/studio)의 전용 사이드바 끄기 — 켜져 있으면 href 대신 패널이 열린다.
update page_modules m set sort_order = 3 from page_builder p where p.id = m.page_id and p.slug = 'membership' and m.module_type = 'membership_plans' and m.sort_order <= 2;
insert into page_modules (page_id, module_type, sort_order, settings)
select pb.id, 'membership_matrix', 2, '{"heading":"등급별 권한 한눈에 비교","subtitle":"✓는 이용할 수 있는 곳, ✕는 아직 열리지 않는 곳이에요. 카테고리를 눌러 세부 항목을 펼쳐보세요.","showConditions":true,"expandAll":false,"excludeCategories":""}'::jsonb
from page_builder pb where pb.slug = 'membership'
and not exists (select 1 from page_modules m where m.page_id = pb.id and m.module_type = 'membership_matrix');

update site_settings set setting_value = jsonb_set(setting_value, '{icons}', (
  select jsonb_agg(case when i->>'id' = '1788022521818-zsy0om' then jsonb_set(i, '{sidebar,enabled}', 'false') else i end)
  from jsonb_array_elements(setting_value->'icons') i))
where setting_key = 'top_bar_icons';
