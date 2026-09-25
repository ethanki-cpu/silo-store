-- EPIC-164 Phase 1: /membership 페이지에 "혜택의 문(문 열기 카드)" 위젯을 캐러셀 앞(sort_order 0)에 추가. 재실행 안전.
update page_modules set sort_order = sort_order + 1
where page_id = (select id from page_builder where slug = 'membership')
  and sort_order >= 0
  and not exists (select 1 from page_modules where module_type = 'membership_doors' and page_id = (select id from page_builder where slug = 'membership'));
insert into page_modules (page_id, module_type, sort_order, settings)
select (select id from page_builder where slug = 'membership'), 'membership_doors', 0,
$j${"heading":"사일로의 문을 열어보세요","subtitle":"카드를 누르면 문이 열려요","doors":[{"icon":"🗝️","title":"사일로의 하루","tagline":"광장 · 살롱 · 기록","headline":"오늘도, 문이 열립니다.","lines":"광장에서 기록하고\n살롱에서 사람을 만나고\n나만의 행성에 하루를 남기세요.","accent":"#E4C84B"},{"icon":"🍷","title":"온라인 도슨트","tagline":"시간을 건너는 이야기","headline":"물건 하나에, 시대 하나.","lines":"이전 주인의 사연과\n시대의 지식이\n하루 한 번 당신에게 열립니다.","accent":"#2ECC8F"},{"icon":"🪐","title":"나만의 아카이브","tagline":"행성 · 컬렉션","headline":"수집은, 나를 남기는 일.","lines":"내 행성을 꾸미고\n마음에 든 이야기를 모아\n한 우주로 완성하세요.","accent":"#9FC1FF"},{"icon":"🥂","title":"살롱데상 초대","tagline":"오프라인 모임 · 전시","headline":"이번엔, 직접 만나요.","lines":"파티 우선 예매부터\n상시 자유 출입, 전시 주최까지\n등급마다 더 깊은 문이 열립니다.","accent":"#F28C28"}]}$j$::jsonb
where not exists (select 1 from page_modules where module_type = 'membership_doors' and page_id = (select id from page_builder where slug = 'membership'));
