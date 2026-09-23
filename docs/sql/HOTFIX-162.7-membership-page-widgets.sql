-- HOTFIX-162.7: /membership을 "페이지 수정"으로 자유롭게 편집하도록 page_builder 행과 위젯을 만든다.
-- (이전엔 page_builder에 slug='membership' 행 자체가 없어 "페이지 수정" 버튼이 편집할 대상이 없었다.)
insert into page_builder (slug, title, description, status)
select 'membership', 'Membership', '멤버십 안내/가입 페이지', 'published'
where not exists (select 1 from page_builder where slug = 'membership');

insert into page_modules (page_id, module_type, sort_order, settings)
select pb.id, 'membership_carousel', 1, '{}'::jsonb from page_builder pb
where pb.slug = 'membership' and not exists (select 1 from page_modules m where m.page_id = pb.id and m.module_type = 'membership_carousel');

insert into page_modules (page_id, module_type, sort_order, settings)
select pb.id, 'membership_plans', 2, '{}'::jsonb from page_builder pb
where pb.slug = 'membership' and not exists (select 1 from page_modules m where m.page_id = pb.id and m.module_type = 'membership_plans');
