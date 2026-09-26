-- HOTFIX-166.1: 문 로비의 "들어가기" 버튼을 상단 메뉴의 실제 주소로 연결. 재실행 안전.
update page_modules m set settings = jsonb_set(m.settings, '{doors}', (
  select jsonb_agg(
    d || case d->>'title'
      when 'About Silo'     then '{"href":"/about-silo","hrefLabel":"About Silo 들어가기"}'::jsonb
      when '사일로 상점'     then '{"href":"/silo-store","hrefLabel":"사일로 상점 들어가기"}'::jsonb
      when '살롱데상'        then '{"href":"/salon-des-cent","hrefLabel":"살롱데상 들어가기"}'::jsonb
      when '온라인 도슨트'   then '{"href":"/online-docent","hrefLabel":"온라인 도슨트 들어가기"}'::jsonb
      when '스튜디오'        then '{"href":"/studio","hrefLabel":"스튜디오 들어가기"}'::jsonb
      when 'Silo Planet'    then '{"href":"/silo-planet","hrefLabel":"Silo Planet 들어가기"}'::jsonb
      when '마이페이지'      then '{"href":"/mypage","hrefLabel":"마이페이지 들어가기"}'::jsonb
      else '{}'::jsonb end
    order by ord)
  from jsonb_array_elements(m.settings->'doors') with ordinality as t(d, ord)))
from page_builder p
where p.id = m.page_id and p.slug = 'membership' and m.module_type = 'membership_doors';
